"""
AIDanskVocabularyBuilder - FastAPI Application
A Danish vocabulary learning app for children
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db, get_session
from app.models import Badge
from app.api.endpoints import router


# Default badges to seed
DEFAULT_BADGES = [
    Badge(name="First Steps", emoji="🐣", description="Read your first word!", requirement_type="words_read", requirement_value=1),
    Badge(name="Word Warrior", emoji="⚔️", description="Master 5 words", requirement_type="words_mastered", requirement_value=5),
    Badge(name="Vocabulary Viking", emoji="🛡️", description="Master 10 words", requirement_type="words_mastered", requirement_value=10),
    Badge(name="Spelling Star", emoji="⭐", description="5 correct spellings in a row", requirement_type="spelling_streak", requirement_value=5),
    Badge(name="Daily Learner", emoji="📚", description="Practice every day", requirement_type="daily_practice", requirement_value=1),
    Badge(name="Word Master", emoji="👑", description="Master 25 words", requirement_type="words_mastered", requirement_value=25),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup: Initialize database
    init_db()
    
    # Seed default badges if not exist
    with get_session() as session:
        from sqlmodel import select, text
        from app.models import Collection, Word, Source
        
        # 0. Ensure schema is up to date (Migration for Collection feature)
        # Adding columns if they don't exist (PostgreSQL specific check)
        try:
            # Check and add for Word table
            session.exec(text("ALTER TABLE word ADD COLUMN IF NOT EXISTS collection_id INTEGER REFERENCES collection(id)"))
            # Check and add for Source table
            session.exec(text("ALTER TABLE source ADD COLUMN IF NOT EXISTS collection_id INTEGER REFERENCES collection(id)"))
            session.commit()
        except Exception as e:
            # SQLite doesn't support ADD COLUMN IF NOT EXISTS or it might already be there
            session.rollback()
            print(f"Migration notice: {e}")
        
        # 0.5 Synchronize PostgreSQL sequences (fixes UniqueViolation errors after migration)
        # This is necessary if IDs were manually inserted or tables were migrated without updating sequences
        try:
            for table in ["collection", "word", "source", "practiced", "userprogress", "badge"]:
                # Use COALESCE to handle empty tables, and setval to the max ID
                session.exec(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM \"{table}\""))
            session.commit()
        except Exception as e:
            session.rollback()
            # This will fail on SQLite (no pg_get_serial_sequence), which is expected
            if "postgresql" in str(e).lower():
                print(f"Sequence sync error: {e}")
        
        # 1. Create default collection if none exist
        initial_collection = session.exec(select(Collection).where(Collection.name == "Initial Collection")).first()
        if not initial_collection:
            initial_collection = Collection(name="Initial Collection")
            session.add(initial_collection)
            session.commit()
            session.refresh(initial_collection)
        
        # 2. Migrate existing words/sources to Initial Collection if they don't have one
        unassigned_words = session.exec(select(Word).where(Word.collection_id == None)).all()
        for word in unassigned_words:
            word.collection_id = initial_collection.id
            session.add(word)
            
        unassigned_sources = session.exec(select(Source).where(Source.collection_id == None)).all()
        for source in unassigned_sources:
            source.collection_id = initial_collection.id
            session.add(source)
            
        # 3. Seed badges
        existing_badges = session.query(Badge).count()
        if existing_badges == 0:
            for badge in DEFAULT_BADGES:
                session.add(badge)
        
        session.commit()
    
    yield
    
    # Shutdown: cleanup if needed
    pass


app = FastAPI(
    title="AIDansk Vocabulary Builder API",
    description="""
    A Danish vocabulary learning app for children (3rd Grade focus).
    
    Features:
    * **Upload book pages** to extract vocabulary
    * **Practice words** with TTS and spelling verification
    * **Gamified progress** with points and badges
    """,
    version="1.0.0",
    contact={
        "name": "AIDansk Support",
        "url": "https://example.com/support",
    },
    license_info={
        "name": "MIT",
    },
    lifespan=lifespan,
    openapi_url="/api/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for React frontend (Development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://danskvocab.ramesh.dk",
        "http://localhost:5173", 
        # "http://localhost:3000", 
        # "http://localhost:3001",
        # "http://127.0.0.1:5173",
        # "http://127.0.0.1:3000",
        # "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes with tags for Swagger UI
app.include_router(router, prefix="/api", tags=["Vocabulary & Learning"])


@app.get("/")
async def root():
    return {
        "message": "AIDanskVocabularyBuilder API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
