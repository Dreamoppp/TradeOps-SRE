from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.diagnostic import DiagnosticReport
from app.services.diagnostic_service import DiagnosticService

router = APIRouter(prefix="/api/diagnostics", tags=["System Diagnostics"])

@router.get("/system")
def get_system_resources():
    return DiagnosticService.check_system_resources()

@router.get("/database")
def get_database_health(db: Session = Depends(get_db)):
    return DiagnosticService.check_database_health(db)

@router.get("/errors")
def get_error_summary():
    return DiagnosticService.summarize_error_logs()

@router.post("/run")
def run_diagnostics(service_name: str = "TradeOps API", db: Session = Depends(get_db)):
    reports = DiagnosticService.run_all_diagnostics(db, service_name=service_name)
    return {
        "status": "success",
        "service_name": service_name,
        "reports": [
            {
                "id": r.id,
                "check_type": r.check_type,
                "status": r.status,
                "execution_time_ms": r.execution_time_ms,
                "timestamp": r.timestamp.isoformat()
            }
            for r in reports
        ]
    }

@router.get("/history")
def get_diagnostic_history(limit: int = 20, db: Session = Depends(get_db)):
    reports = db.query(DiagnosticReport).order_by(desc(DiagnosticReport.timestamp)).limit(limit).all()
    return [
        {
            "id": r.id,
            "service_name": r.service_name,
            "check_type": r.check_type,
            "status": r.status,
            "details": r.details_json,
            "execution_time_ms": r.execution_time_ms,
            "timestamp": r.timestamp.isoformat()
        }
        for r in reports
    ]

