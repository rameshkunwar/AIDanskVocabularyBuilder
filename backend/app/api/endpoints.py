"""
API Endpoints for AIDanskVocabularyBuilder
"""
import json
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import select

from app.db import get_session
from app.models import Word, Source, Practiced, UserProgress, Badge
from app.llm_adapter import extract_words_from_image, get_next_words_to_practice
from app.tts import get_audio
from app.extractor import estimate_syllables

router = APIRouter()


# ============ Pydantic Models ============

class PracticeResponse(BaseModel):
    success: bool
    read_count: int
    ready_for_spelling: bool
    points_earned: int
    message: str


class SpellingVerifyRequest(BaseModel):
    spelling: str


class SpellingVerifyResponse(BaseModel):
    correct: bool
    mastered: bool
    points_earned: int
    badge_earned: Optional[str] = None
    message: str


class ProgressResponse(BaseModel):
    total_words: int
    mastered_words: int
    in_progress_words: int
    total_points: int
    badges: list[dict]
    spelling_streak: int


class WordResponse(BaseModel):
    id: int
    text: str
    definition: Optional[str]
    read_count: int
    spelling_verified: bool
    mastered: bool


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


# ============ Endpoints ============

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a book page image, extract words using LLM.
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
    
    # Extract words using LLM
    try:
        extracted = await extract_words_from_image(image_bytes, mime_type=file.content_type)
    except Exception as e:
        print(f"ERROR: Exception during extraction call: {e}")
        raise HTTPException(status_code=500, detail=f"LLM extraction service error: {str(e)}")
    
    if not extracted:
        # Check if it was an API key issue or something else
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY in server environment")
        raise HTTPException(status_code=422, detail="Could not extract words. Please check if the image is clear and contains Danish text.")
    
    # Save source
    with get_session() as session:
        source = Source(
            name=file.filename or "uploaded_image",
            path=file_path
        )
        session.add(source)
        session.commit()
        session.refresh(source)
        
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
            else:
                # Create new word
                word = Word(
                    text=word_text,
                    definition=item.get("definition"),
                    syllables=estimate_syllables(word_text),
                    source_id=source.id,
                    freq=1
                )
                session.add(word)
                words_added += 1
        
        session.commit()
        source_id = source.id
    
    return {
        "success": True,
        "words_extracted": len(extracted),
        "words_added": words_added,
        "source_id": source_id
    }


@router.get("/words/next", response_model=list[WordResponse])
async def get_next_words(limit: int = 5):
    """
    Get the next words to practice, prioritized by LLM.
    """
    with get_session() as session:
        # Get all unmastered words
        words = session.exec(
            select(Word).where(Word.mastered == False)
        ).all()
        
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
                    mastered=word.mastered
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
            mastered=word.mastered
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
            read_count=word.read_count,
            ready_for_spelling=ready_for_spelling,
            points_earned=points,
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
                mastered=True,
                points_earned=points,
                badge_earned=badge_earned,
                message="Perfekt! 🎉 Du har mestret dette ord!"
            )
        else:
            # Reset spelling streak on wrong answer
            progress.spelling_streak = 0
            session.commit()
            
            return SpellingVerifyResponse(
                correct=False,
                mastered=False,
                points_earned=0,
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
        
        # Get earned badges
        badge_ids = json.loads(progress.badges)
        badges = []
        for badge_id in badge_ids:
            badge = session.get(Badge, badge_id)
            if badge:
                badges.append({
                    "id": badge.id,
                    "name": badge.name,
                    "emoji": badge.emoji,
                    "description": badge.description
                })
        
        return ProgressResponse(
            total_words=len(total_words),
            mastered_words=len(mastered_words),
            in_progress_words=len(in_progress),
            total_points=progress.total_points,
            badges=badges,
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
