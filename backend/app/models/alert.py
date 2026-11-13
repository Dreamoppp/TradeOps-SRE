from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class AlertRecord(Base):
    __tablename__ = "alert_records"

    id = Column(Integer, primary_key=True, index=True)
    alert_name = Column(String(100), index=True, nullable=False) # e.g. ServiceDown, HighLatency
    service_name = Column(String(100), index=True, nullable=False)
    severity = Column(String(10), default="P2", index=True, nullable=False)
    status = Column(String(30), default="FIRING", index=True, nullable=False) # FIRING, RESOLVED
    description = Column(Text, nullable=False)
    starts_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("Incident", back_populates="alerts")

