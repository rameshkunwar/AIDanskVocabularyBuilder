import os
import urllib.parse
from sqlmodel import SQLModel, create_engine, Session
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_database_url():
    db_type = os.getenv("DB_TYPE", "sqlite").lower()
    
    if db_type == "postgresql":
        user = os.getenv("POSTGRES_USER")
        password = os.getenv("POSTGRES_PASSWORD")
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("POSTGRES_DB", "ai_dansk_vocabulary")
        
        # URL-encode the password to handle special characters like '@'
        encoded_password = urllib.parse.quote_plus(password) if password else ""
        
        return f"postgresql://{user}:{encoded_password}@{host}:{port}/{db_name}"
    else:
        # Default to SQLite
        return "sqlite:///./vocab.db"

DATABASE_URL = get_database_url()

# For SQLite, we need connect_args={"check_same_thread": False}
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)


def init_db():
    # Import models to register them with SQLModel
    from app import models  # noqa
    SQLModel.metadata.create_all(engine)


@contextmanager
def get_session():
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()

