from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    actor = Column(String(100), nullable=False) # e.g. admin@tradeops.io, system_automation
    action = Column(String(100), nullable=False) # e.g. INCIDENT_ACKNOWLEDGED, FAULT_INJECTED, ORDER_PLACED
    target_type = Column(String(50), nullable=False) # INCIDENT, SERVICE, ORDER, SETTING
    target_id = Column(String(100), nullable=True)
    details_json = Column(Text, nullable=True)

