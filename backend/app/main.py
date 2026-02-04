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
        "*"
        # "http://localhost:5173", 
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
