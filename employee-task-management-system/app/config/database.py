"""Database connection + session management (SQLAlchemy 2.x style).

Why this file exists: routers/services should never create engines directly.
They depend on get_db() via FastAPI Depends(), which yields a session per request.
"""
import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config.settings import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


# SQLite needs check_same_thread=False; Postgres does not.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    """FastAPI dependency: provide a DB session and close it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
