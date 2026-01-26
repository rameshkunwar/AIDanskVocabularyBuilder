from sqlmodel import SQLModel, create_engine, Session
from contextlib import contextmanager

engine = create_engine("sqlite:///./vocab.db", connect_args={"check_same_thread": False})


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

