from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base

class DiagnosticReport(Base):
    __tablename__ = "diagnostic_reports"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    service_name = Column(String(100), index=True, nullable=False)
    check_type = Column(String(50), nullable=False) # SYSTEM_RESOURCES, DATABASE_HEALTH, API_CONNECTIVITY, ERROR_SUMMARY
    status = Column(String(20), nullable=False) # PASS, WARN, FAIL
    details_json = Column(Text, nullable=False) # JSON details
    execution_time_ms = Column(Float, nullable=False)

