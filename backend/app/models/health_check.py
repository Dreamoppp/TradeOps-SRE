from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class HealthCheck(Base):
    __tablename__ = "health_checks"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("monitored_services.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True) # healthy, degraded, down
    latency_ms = Column(Float, nullable=False)
    status_code = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    details_json = Column(Text, nullable=True) # JSON string of additional diagnostics

    service = relationship("MonitoredService", back_populates="health_checks")

    __table_args__ = (
        Index("idx_service_timestamp", "service_id", "timestamp"),
    )

