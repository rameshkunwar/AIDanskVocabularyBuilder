import os
from sqlmodel import SQLModel, create_engine, Session
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# fetch the DATABASE_URL that Docker Compose provides
DATABASE_URL = os.getenv("DATABASE_URL")

# safety catch so the app loudly crashes if the URL is missing
if not DATABASE_URL:
    raise ValueError("CRITICAL ERROR: DATABASE_URL environment variable is not set!")

# Postgres engine (SQLite arguments safely removed)
engine = create_engine(DATABASE_URL)

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