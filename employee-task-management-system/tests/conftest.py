"""Shared pytest fixtures: isolated SQLite DB + TestClient + auth helpers."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite://"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="function")
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db):
    def _override():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def register(client, username, email, password="secret123", role="ADMIN"):
    return client.post("/api/auth/register",
                       json={"username": username, "email": email,
                             "password": password, "role": role})


def login(client, username, password="secret123"):
    return client.post("/api/auth/login", data={"username": username, "password": password})


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
