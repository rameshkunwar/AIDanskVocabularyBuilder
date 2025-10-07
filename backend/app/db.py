from sqlmodel import SQLModel, create_engine, Session

engine= create_engine("sqllite:///./vocab.db", connect_args={"check_same_thread":False})

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)
