"""Environment configuration loader for backend application."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str = "sqlite:///./crm.db"
    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Return a cached instance of application settings."""
    return Settings()


settings: Settings = get_settings()
