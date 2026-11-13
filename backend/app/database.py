import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("tradeops.database")

from app.config import settings

def init_engine():
    db_url = settings.DATABASE_URL
    try:
        # Check PostgreSQL
        if "postgresql" in db_url:
            eng = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_recycle=300
            )
            # Test connection
            with eng.connect() as conn:
                pass
            logger.info("Connected to PostgreSQL successfully.")
            return eng
    except Exception as e:
        logger.warning(f"Failed to connect to primary database ({db_url}): {e}. Falling back to SQLite.")
        fallback_url = "sqlite:///./tradeops_fallback.db"
        return create_engine(fallback_url, connect_args={"check_same_thread": False})
    
    return create_engine(db_url)

engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

