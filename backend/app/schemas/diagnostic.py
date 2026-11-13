from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class DiagnosticRunRequest(BaseModel):
    check_type: Optional[str] = "ALL" # ALL, SYSTEM_RESOURCES, DATABASE_HEALTH, API_CONNECTIVITY, ERROR_SUMMARY

class DiagnosticReportOut(BaseModel):
    id: int
    timestamp: datetime
    service_name: str
    check_type: str
    status: str
    details: Dict[str, Any]
    execution_time_ms: float

    class Config:
        from_attributes = True

