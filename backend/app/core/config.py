from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./css.db"
    UPLOAD_DIR: str = "../uploads"
    CORS_ORIGINS_STR: str = "http://localhost:5173"
    FRONTEND_URL: str = ""

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def convert_db_url(cls, v: str) -> str:
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return self.DATABASE_URL

    @property
    def CORS_ORIGINS(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS_STR.split(",")]
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    class Config:
        env_file = ".env"


settings = Settings()
