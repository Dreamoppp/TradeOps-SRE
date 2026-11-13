from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.orm import relationship
from app.database import Base

class MonitoredService(Base):
    __tablename__ = "monitored_services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    service_type = Column(String(50), nullable=False) # api, database, simulator, infrastructure
    url = Column(String(255), nullable=True)
    check_interval_seconds = Column(Integer, default=10, nullable=False)
    timeout_seconds = Column(Float, default=3.0, nullable=False)
    failure_threshold = Column(Integer, default=2, nullable=False)
    recovery_threshold = Column(Integer, default=2, nullable=False)
    status = Column(String(50), default="healthy", index=True, nullable=False) # healthy, degraded, down
    consecutive_failures = Column(Integer, default=0, nullable=False)
    consecutive_successes = Column(Integer, default=0, nullable=False)
    last_check_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    health_checks = relationship("HealthCheck", back_populates="service", cascade="all, delete-orphan")

