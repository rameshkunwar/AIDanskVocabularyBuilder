from sqlmodel import SQLModel, Field
from typing import Optional

class Word(SQLModel, table=True):
    id:Optional[int] = Field(default=None, primary_key=True)
    text:str
    freq: int = 0
    syllables:Optional[int] = None
    difficulty_score:Optional[float] = None
    source_id:Optional[int] = None

class Source(SQLModel, table=True):
    id:Optional[int] = Field(default=None, primary_key=True)
    name:str
    path:str

class Practiced(SQLModel, table=True):
    id:Optional[int] = Field(default=None, primary_key=True)
    word_id:int
    practiced_at:str #timestamp
    session_id:Optional[str]
