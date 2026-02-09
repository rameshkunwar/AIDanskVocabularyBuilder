from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime


class Collection(SQLModel, table=True):
    """A collection of words and sources (Session/Chapter)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    # Relationships
    words: List["Word"] = Relationship(back_populates="collection")
    sources: List["Source"] = Relationship(back_populates="collection")


class Word(SQLModel, table=True):
    """A word extracted from a book page"""
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str = Field(index=True)
    definition: Optional[str] = None  # Simple Danish definition for kids
    freq: int = 0  # Frequency in source material
    syllables: Optional[int] = None
    difficulty_score: Optional[float] = None
    source_id: Optional[int] = Field(default=None, foreign_key="source.id")
    collection_id: Optional[int] = Field(default=None, foreign_key="collection.id")
    
    # Practice tracking
    read_count: int = 0  # Times read aloud (target: 5)
    spelling_verified: bool = False  # Passed spelling test
    mastered: bool = False  # Fully learned
    last_practiced: Optional[str] = None  # ISO timestamp

    # Relationships
    collection: Optional[Collection] = Relationship(back_populates="words")


class Source(SQLModel, table=True):
    """A book page image source"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    path: str
    uploaded_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    collection_id: Optional[int] = Field(default=None, foreign_key="collection.id")

    # Relationships
    collection: Optional[Collection] = Relationship(back_populates="sources")


class Practiced(SQLModel, table=True):
    """Practice session record"""
    id: Optional[int] = Field(default=None, primary_key=True)
    word_id: int = Field(foreign_key="word.id")
    practiced_at: str  # ISO timestamp
    session_id: Optional[str] = None
    action: str = "read"  # "read" or "spell"


class UserProgress(SQLModel, table=True):
    """Gamification progress tracking"""
    id: Optional[int] = Field(default=None, primary_key=True)
    total_points: int = 0
    words_mastered: int = 0
    spelling_streak: int = 0
    daily_streak: int = 0
    last_practice_date: Optional[str] = None
    badges: str = "[]"  # JSON array of earned badge IDs


class Badge(SQLModel, table=True):
    """Available badges for gamification"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    emoji: str
    description: str
    requirement_type: str  # "words_mastered", "spelling_streak", "daily_streak", etc.
    requirement_value: int
