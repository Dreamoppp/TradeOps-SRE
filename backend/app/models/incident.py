from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. INC-2026-0001
    title = Column(String(255), nullable=False)
    service_name = Column(String(100), index=True, nullable=False)
    severity = Column(String(10), default="P2", index=True, nullable=False) # P1, P2, P3, P4
    status = Column(String(50), default="OPEN", index=True, nullable=False) # OPEN, ACKNOWLEDGED, INVESTIGATING, RESOLVED, CLOSED
    assigned_to = Column(String(255), nullable=True)
    root_cause = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    mttd_seconds = Column(Float, nullable=True) # Mean time to detect
    mttr_seconds = Column(Float, nullable=True) # Mean time to resolve

    events = relationship("IncidentEvent", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentEvent.created_at.asc()")
    alerts = relationship("AlertRecord", back_populates="incident")

    __table_args__ = (
        Index("idx_incident_status_severity", "status", "severity"),
    )

class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False) # CREATED, ACKNOWLEDGED, STATUS_CHANGE, NOTE_ADDED, DIAGNOSTIC_ATTACHED, RECOVERY_DETECTED, RESOLVED, CLOSED
    description = Column(Text, nullable=False)
    actor = Column(String(100), default="system", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    incident = relationship("Incident", back_populates="events")

