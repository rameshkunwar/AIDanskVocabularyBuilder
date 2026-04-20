"""
API Endpoints for AIDanskVocabularyBuilder
"""
import json
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import select

from app.db import get_session
from app.models import Word, Source, Practiced, UserProgress, Badge, Collection
from app.llm_adapter import extract_words_from_image, get_next_words_to_practice
from app.tts import get_audio
from app.extractor import estimate_syllables

router = APIRouter()


# ============ Pydantic Models ============

class WordResponse(BaseModel):
    id: int
    text: str
    definition: Optional[str]
    read_count: int
    spelling_verified: bool
    mastered: bool
    collection_id: Optional[int] = None


class PracticeResponse(BaseModel):
    success: bool
    word: WordResponse
    ready_for_spelling: bool
    points_earned: int
    new_total_points: int
    message: str
    badges_earned: Optional[list[Badge]] = None


class SpellingVerifyRequest(BaseModel):
    spelling: str


class SpellingVerifyResponse(BaseModel):
    correct: bool
    word: WordResponse
    points_earned: int
    new_total_points: int
    badge_earned: Optional[str] = None
    badges_earned: Optional[list[Badge]] = None
    message: str


class ProgressResponse(BaseModel):
    total_words: int
    words_mastered: int
    in_progress_words: int
    total_points: int
    badges: list[int]
    spelling_streak: int


class CollectionResponse(BaseModel):
    id: int
    name: str
    created_at: str
    updated_at: str
    word_count: int = 0


class CollectionCreate(BaseModel):
    name: str


# ============ Helper Functions ============

def get_or_create_progress(session) -> UserProgress:
    """Get or create user progress record"""
    progress = session.exec(select(UserProgress)).first()
    if not progress:
        progress = UserProgress()
        session.add(progress)
        session.commit()
        session.refresh(progress)
    return progress


def check_and_award_badges(session, progress: UserProgress) -> Optional[str]:
    """Check if user earned new badges and award them"""
    current_badges = json.loads(progress.badges)
    
    badges = session.exec(select(Badge)).all()
    new_badge = None
    
    for badge in badges:
        if badge.id in current_badges:
            continue
            
        earned = False
        if badge.requirement_type == "words_mastered":
            earned = progress.words_mastered >= badge.requirement_value
        elif badge.requirement_type == "spelling_streak":
            earned = progress.spelling_streak >= badge.requirement_value
        elif badge.requirement_type == "words_read":
            # Check if any word has been read
            word = session.exec(select(Word).where(Word.read_count > 0)).first()
            earned = word is not None
            
        if earned:
            current_badges.append(badge.id)
            progress.badges = json.dumps(current_badges)
            new_badge = f"{badge.emoji} {badge.name}"
    
    session.commit()
    return new_badge


# ============ Collection Endpoints ============

@router.get("/collections", response_model=list[CollectionResponse])
async def get_collections():
    """Get all collections"""
    with get_session() as session:
        collections = session.exec(select(Collection)).all()
        result = []
        for col in collections:
            # Count words for this collection
            # col.words is a Relationship, so we can access it if the session is still open
            # or we can query directly for efficiency
            word_count = len(col.words)
            result.append(
                CollectionResponse(
                    id=col.id,
                    name=col.name,
                    created_at=col.created_at,
                    updated_at=col.updated_at,
                    word_count=word_count,
                )
            )
        return result


@router.post("/collections", response_model=CollectionResponse)
async def create_collection(collection: CollectionCreate):
    """Create a new collection"""
    with get_session() as session:
        db_collection = Collection(name=collection.name)
        session.add(db_collection)
        session.commit()
        session.refresh(db_collection)
        return db_collection


# ============ Endpoints ============

@router.post("/upload-image")
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_id: Optional[int] = Form(None),
    collection_name: Optional[str] = Form(None)
):
    """
    Upload a book page image, create a source record, and enqueue LLM extraction.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read image bytes
    image_bytes = await file.read()
    
    # Save file to disk
    import uuid
    import os
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = f"uploads/{unique_filename}"
    os.makedirs("uploads", exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(image_bytes)
    
    with get_session() as session:
        # Determine collection
        target_collection_id = collection_id
        if not target_collection_id and collection_name:
            # Create a new collection if name provided
            new_col = Collection(name=collection_name)
            session.add(new_col)
            session.commit()
            session.refresh(new_col)
            target_collection_id = new_col.id
        
        if not target_collection_id:
            # Fallback to Initial Collection
            initial = session.exec(select(Collection).where(Collection.name == "Initial Collection")).first()
            if initial:
                target_collection_id = initial.id

        source = Source(
            name=file.filename or "uploaded_image",
            path=file_path,
            status="processing",
            collection_id=target_collection_id
        )
        session.add(source)
        session.commit()
        session.refresh(source)
        source_id = source.id
        
    # Enqueue background extraction task
    background_tasks.add_task(
        process_image_extraction, 
        source_id=source_id, 
        image_bytes=image_bytes, 
        mime_type=file.content_type, 
        collection_id=target_collection_id
    )
    
    return {
        "success": True,
        "source_id": source_id,
        "collection_id": target_collection_id,
        "status": "processing",
        "message": "Image uploaded successfully. Extraction is running in the background."
    }


async def process_image_extraction(source_id: int, image_bytes: bytes, mime_type: str, collection_id: int):
    """
    Background task to extract words using LLM and save them to the database.
    """
    import os
    try:
        # Extract words using LLM
        extracted = await extract_words_from_image(image_bytes, mime_type=mime_type)
        
        if not extracted:
            # Check if it was an API key issue or something else
            api_key = os.getenv("GEMINI_API_KEY")
            error_msg = "Missing GEMINI_API_KEY in server environment" if not api_key else "Could not extract words. Please check if the image is clear and contains Danish text."
            with get_session() as session:
                source = session.get(Source, source_id)
                if source:
                    source.status = "failed"
                    source.error_message = error_msg
                    session.add(source)
                    session.commit()
            return
            
        with get_session() as session:
            # Save words (avoid duplicates)
            words_added = 0
            for item in extracted:
                word_text = item.get("word", "").lower().strip()
                if not word_text:
                    continue
                    
                # Check if word already exists
                existing = session.exec(
                    select(Word).where(Word.text == word_text)
                ).first()
                
                if existing:
                    # Update frequency
                    existing.freq += 1
                    if not existing.definition and item.get("definition"):
                        existing.definition = item["definition"]
                    # If existing word doesn't have a collection, assign it
                    if not existing.collection_id:
                        existing.collection_id = collection_id
                else:
                    # Create new word
                    word = Word(
                        text=word_text,
                        definition=item.get("definition"),
                        syllables=estimate_syllables(word_text),
                        source_id=source_id,
                        collection_id=collection_id,
                        freq=1
                    )
                    session.add(word)
                    words_added += 1
            
            # Update source status to completed
            source = session.get(Source, source_id)
            if source:
                source.status = "completed"
                session.add(source)
                
            session.commit()
            
    except Exception as e:
        print(f"ERROR: Exception during background extraction call: {e}")
        with get_session() as session:
            source = session.get(Source, source_id)
            if source:
                source.status = "failed"
                source.error_message = str(e)
                session.add(source)
                session.commit()


@router.get("/upload-status/{source_id}")
async def get_upload_status(source_id: int):
    """
    Check the status of an image extraction background task.
    """
    with get_session() as session:
        source = session.get(Source, source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
            
        result = {
            "source_id": source.id,
            "status": source.status,
            "collection_id": source.collection_id
        }
        
        if source.status == "failed":
            result["error"] = source.error_message
            
        elif source.status == "completed":
            # Fetch all words for this source
            words = session.exec(select(Word).where(Word.source_id == source.id)).all()
            result["words_extracted"] = len(words)
            result["words"] = [
                {
                    "id": w.id,
                    "text": w.text,
                    "definition": w.definition,
                    "read_count": w.read_count,
                    "spelling_verified": w.spelling_verified,
                    "mastered": w.mastered
                }
                for w in words
            ]
            
        return result


@router.get("/words", response_model=list[WordResponse])
async def get_all_words(collection_id: Optional[int] = None):
    """
    Get all words in the database.
    """
    with get_session() as session:
        statement = select(Word)
        if collection_id:
            statement = statement.where(Word.collection_id == collection_id)
        
        words = session.exec(statement).all()
        return [
            WordResponse(
                id=w.id,
                text=w.text,
                definition=w.definition,
                read_count=w.read_count,
                spelling_verified=w.spelling_verified,
                mastered=w.mastered,
                collection_id=w.collection_id
            )
            for w in words
        ]


@router.get("/words/next", response_model=list[WordResponse])
async def get_next_words(limit: int = 100, collection_id: Optional[int] = None):
    """
    Get the next words to practice, prioritized by LLM.
    """
    with get_session() as session:
        # Get all unmastered words
        statement = select(Word).where(Word.mastered == False)
        if collection_id:
            statement = statement.where(Word.collection_id == collection_id)
            
        words = session.exec(statement).all()
        
        if not words:
            return []
        
        # Convert to dicts for LLM
        word_dicts = [
            {
                "id": w.id,
                "text": w.text,
                "read_count": w.read_count,
                "mastered": w.mastered,
                "difficulty_score": w.difficulty_score or 0.5
            }
            for w in words
        ]
        
        # Get prioritized word IDs from LLM
        prioritized_ids = await get_next_words_to_practice(word_dicts, limit)
        
        # Fetch words in priority order
        result = []
        for word_id in prioritized_ids:
            word = session.get(Word, word_id)
            if word:
                result.append(WordResponse(
                    id=word.id,
                    text=word.text,
                    definition=word.definition,
                    read_count=word.read_count,
                    spelling_verified=word.spelling_verified,
                    mastered=word.mastered,
                    collection_id=word.collection_id
                ))
        
        return result


@router.get("/words/{word_id}", response_model=WordResponse)
async def get_word(word_id: int):
    """Get a specific word by ID"""
    with get_session() as session:
        word = session.get(Word, word_id)
        if not word:
            raise HTTPException(status_code=404, detail="Word not found")
        
        return WordResponse(
            id=word.id,
            text=word.text,
            definition=word.definition,
            read_count=word.read_count,
            spelling_verified=word.spelling_verified,
            mastered=word.mastered,
            collection_id=word.collection_id
        )


@router.post("/words/{word_id}/practice", response_model=PracticeResponse)
async def practice_word(word_id: int):
    """
    Record that the word was read aloud. Increments read counter.
    """
    with get_session() as session:
        word = session.get(Word, word_id)
        if not word:
            raise HTTPException(status_code=404, detail="Word not found")
        
        # Increment read count
        word.read_count += 1
        word.last_practiced = datetime.now().isoformat()
        
        # Record practice
        practice = Practiced(
            word_id=word_id,
            practiced_at=datetime.now().isoformat(),
            action="read"
        )
        session.add(practice)
        
        # Award points
        progress = get_or_create_progress(session)
        points = 5  # Points per read
        progress.total_points += points
        
        # Update daily practice date
        today = date.today().isoformat()
        if progress.last_practice_date != today:
            progress.last_practice_date = today
        
        session.commit()
        
        # Check for badges
        check_and_award_badges(session, progress)
        
        ready_for_spelling = word.read_count >= 5
        
        return PracticeResponse(
            success=True,
            word=WordResponse(
                id=word.id,
                text=word.text,
                definition=word.definition,
                read_count=word.read_count,
                spelling_verified=word.spelling_verified,
                mastered=word.mastered,
                collection_id=word.collection_id
            ),
            ready_for_spelling=ready_for_spelling,
            points_earned=points,
            new_total_points=progress.total_points,
            message="Godt læst!" if word.read_count < 5 else "Klar til at stave! 📝"
        )


@router.post("/words/{word_id}/verify-spelling", response_model=SpellingVerifyResponse)
async def verify_spelling(word_id: int, request: SpellingVerifyRequest):
    """
    Verify the spelling attempt for a word.
    """
    with get_session() as session:
        word = session.get(Word, word_id)
        if not word:
            raise HTTPException(status_code=404, detail="Word not found")
        
        progress = get_or_create_progress(session)
        
        # Check spelling (case-insensitive)
        correct = request.spelling.lower().strip() == word.text.lower().strip()
        
        points = 0
        badge_earned = None
        
        if correct:
            word.spelling_verified = True
            word.mastered = True
            
            # Record practice
            practice = Practiced(
                word_id=word_id,
                practiced_at=datetime.now().isoformat(),
                action="spell"
            )
            session.add(practice)
            
            # Award points
            points = 20
            progress.total_points += points
            progress.words_mastered += 1
            progress.spelling_streak += 1
            
            session.commit()
            
            # Check badges
            badge_earned = check_and_award_badges(session, progress)
            
            return SpellingVerifyResponse(
                correct=True,
                word=WordResponse(
                    id=word.id,
                    text=word.text,
                    definition=word.definition,
                    read_count=word.read_count,
                    spelling_verified=word.spelling_verified,
                    mastered=word.mastered,
                    collection_id=word.collection_id
                ),
                points_earned=points,
                new_total_points=progress.total_points,
                badge_earned=badge_earned,
                message="Perfekt! 🎉 Du har mestret dette ord!"
            )
        else:
            # Reset spelling streak on wrong answer
            progress.spelling_streak = 0
            session.commit()
            
            return SpellingVerifyResponse(
                correct=False,
                word=WordResponse(
                    id=word.id,
                    text=word.text,
                    definition=word.definition,
                    read_count=word.read_count,
                    spelling_verified=word.spelling_verified,
                    mastered=word.mastered,
                    collection_id=word.collection_id
                ),
                points_earned=0,
                new_total_points=progress.total_points,
                message="Prøv igen! 💪"
            )


@router.get("/words/{word_id}/tts")
async def get_word_tts(word_id: int):
    """
    Get audio pronunciation for a word.
    Returns MP3 audio file.
    """
    with get_session() as session:
        word = session.get(Word, word_id)
        if not word:
            raise HTTPException(status_code=404, detail="Word not found")
        
        audio_bytes = await get_audio(word.text)
        
        if not audio_bytes:
            raise HTTPException(status_code=500, detail="Could not generate audio")
        
        from app.tts import TTS_PROVIDER
        media_type = "audio/wav" if TTS_PROVIDER == "local" else "audio/mpeg"
        ext = "wav" if TTS_PROVIDER == "local" else "mp3"
        
        # Use ID instead of word text in filename to avoid encoding issues with Danish chars
        filename = f"word_{word.id}.{ext}"
        
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )


@router.get("/progress", response_model=ProgressResponse)
async def get_progress():
    """
    Get overall learning progress and stats.
    """
    with get_session() as session:
        progress = get_or_create_progress(session)
        
        # Count words
        total_words = session.exec(select(Word)).all()
        mastered_words = [w for w in total_words if w.mastered]
        in_progress = [w for w in total_words if not w.mastered and w.read_count > 0]
        
        # Get earned badges IDs
        earned_badge_ids = json.loads(progress.badges)
        
        return ProgressResponse(
            total_words=len(total_words),
            words_mastered=len(mastered_words),
            in_progress_words=len(in_progress),
            total_points=progress.total_points,
            badges=earned_badge_ids,
            spelling_streak=progress.spelling_streak
        )


@router.get("/badges")
async def get_all_badges():
    """Get all available badges"""
    with get_session() as session:
        badges = session.exec(select(Badge)).all()
        progress = get_or_create_progress(session)
        earned_ids = json.loads(progress.badges)
        
        return [
            {
                "id": b.id,
                "name": b.name,
                "emoji": b.emoji,
                "description": b.description,
                "earned": b.id in earned_ids
            }
            for b in badges
        ]


@router.post("/progress/reset")
async def reset_progress():
    """
    Reset all progress:
    - Clear read_count, spelling_verified, mastered on ALL words
    - Reset user progress (points, streak, badges)
    """
    with get_session() as session:
        # 1. Reset words
        words = session.exec(select(Word)).all()
        for word in words:
            word.read_count = 0
            word.mastered = False
            word.spelling_verified = False
            word.last_practiced = None
            session.add(word)
        
        # 2. Reset progress
        progress = get_or_create_progress(session)
        progress.total_points = 0
        progress.words_mastered = 0
        progress.spelling_streak = 0
        progress.badges = "[]"
        progress.last_practice_date = None
        session.add(progress)
        
        # 3. Clear existing practice records (optional but cleaner)
        session.exec(select(Practiced)).all()
        # Note: SQLModel doesn't support bulk delete easily this way without raw SQL
        # For now we'll just keep the history but reset the active counters
        
        session.commit()
    
    return {"success": True, "message": "Progress reset successfully"}
