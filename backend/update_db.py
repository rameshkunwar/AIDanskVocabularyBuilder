import os
import urllib.parse
from sqlmodel import SQLModel, create_engine, Session, text
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
        encoded_password = urllib.parse.quote_plus(password) if password else ""
        return f"postgresql://{user}:{encoded_password}@{host}:{port}/{db_name}"
    else:
        return "sqlite:///./vocab.db"

DATABASE_URL = get_database_url()
engine = create_engine(DATABASE_URL)

def update_schema():
    print(f"Updating schema for {DATABASE_URL}...")
    
    with engine.connect() as conn:
        # 1. Create collection table if it doesn't exist
        # SQLModel normally does this, but create_all is safer
        from app.models import Collection, Word, Source
        SQLModel.metadata.create_all(engine)
        
        # 2. Check if collection_id column exists in word table
        # For PostgreSQL:
        if DATABASE_URL.startswith("postgresql"):
            print("PostgreSQL detected. Checking columns...")
            
            # Check for collection_id in word table
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='word' AND column_name='collection_id'"))
            if not result.fetchone():
                print("Adding collection_id to word table...")
                conn.execute(text("ALTER TABLE word ADD COLUMN collection_id INTEGER REFERENCES collection(id)"))
            
            # Check for collection_id in source table
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='source' AND column_name='collection_id'"))
            if not result.fetchone():
                print("Adding collection_id to source table...")
                conn.execute(text("ALTER TABLE source ADD COLUMN collection_id INTEGER REFERENCES collection(id)"))
            
            conn.commit()
            print("Schema update complete.")
        else:
            # SQLite handles this differently or SQLModel might have worked if tables were fresh
            print("SQLite detected. Ensure you drop vocab.db if issues persist, or use ALTER TABLE.")

if __name__ == "__main__":
    update_schema()
