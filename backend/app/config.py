import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres@localhost:5432/tradeops"
    
    # Security
    JWT_SECRET: str = "tradeops-super-secret-key-change-in-production-2026!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Monitoring Engine
    PROBE_INTERVAL_SECONDS: int = 10
    PROBE_TIMEOUT_SECONDS: float = 3.0
    FAILURE_THRESHOLD: int = 2
    RECOVERY_THRESHOLD: int = 2
    
    # Trading Simulator
    SIMULATED_LATENCY_MIN_MS: int = 50
    SIMULATED_LATENCY_MAX_MS: int = 200
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()

