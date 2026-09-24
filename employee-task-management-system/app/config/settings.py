"""Application configuration using pydantic-settings.

Responsibility: single source of truth for environment-driven settings.
All secrets come from environment variables / .env, never hardcoded.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from environment."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Employee Task & Project Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./employee.db"

    SECRET_KEY: str = "CHANGE_ME_GENERATE_A_RANDOM_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (cheap DI-friendly singleton)."""
    return Settings()


settings = get_settings()
