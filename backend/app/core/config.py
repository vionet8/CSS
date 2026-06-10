from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./css.db"
    UPLOAD_DIR: str = "../uploads"
    CORS_ORIGINS_STR: str = "http://localhost:5173"
    # Railway/Vercel 本番URL（デプロイ後に設定）
    FRONTEND_URL: str = ""

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def CORS_ORIGINS(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS_STR.split(",")]
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    class Config:
        env_file = ".env"


settings = Settings()
