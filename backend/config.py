from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    FONT_PATH: str = os.getenv("FONT_PATH", "fonts/Roboto-Bold.ttf")
    SECRET_KEY: str = "b9e31d3f9b8c4d29a5f4e6d7c8b9a1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
