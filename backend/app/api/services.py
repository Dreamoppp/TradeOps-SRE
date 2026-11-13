from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.service import MonitoredService
from app.models.health_check import HealthCheck
from app.schemas.service import ServiceOut, ServiceCreate, ServiceUpdate, HealthCheckOut
from app.core.security import get_current_user_optional

router = APIRouter(prefix="/api/services", tags=["Services"])

@router.get("", response_model=List[ServiceOut])
def list_services(db: Session = Depends(get_db)):
    services = db.query(MonitoredService).all()
    results = []
    for s in services:
        recent = db.query(HealthCheck).filter(
            HealthCheck.service_id == s.id
        ).order_by(desc(HealthCheck.timestamp)).limit(10).all()
        
        s_out = ServiceOut.model_validate(s)
        s_out.recent_checks = [HealthCheckOut.model_validate(c) for c in recent]
        results.append(s_out)
    return results

@router.get("/{service_id}/history", response_model=List[HealthCheckOut])
def get_service_history(
    service_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    service = db.query(MonitoredService).filter(MonitoredService.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    checks = db.query(HealthCheck).filter(
        HealthCheck.service_id == service_id
    ).order_by(desc(HealthCheck.timestamp)).limit(limit).all()
    
    return [HealthCheckOut.model_validate(c) for c in reversed(checks)]

@router.post("", response_model=ServiceOut, status_code=201)
def create_service(payload: ServiceCreate, db: Session = Depends(get_db)):
    existing = db.query(MonitoredService).filter(MonitoredService.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service with this name already registered")
    
    service = MonitoredService(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return ServiceOut.model_validate(service)

@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, payload: ServiceUpdate, db: Session = Depends(get_db)):
    service = db.query(MonitoredService).filter(MonitoredService.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, val)
    
    db.commit()
    db.refresh(service)
    return ServiceOut.model_validate(service)

@router.post("/seed-defaults")
def seed_default_services(db: Session = Depends(get_db)):
    defaults = [
        {
            "name": "TradeOps Core API",
            "service_type": "api",
            "url": "http://127.0.0.1:8000/health",
            "check_interval_seconds": 10,
            "timeout_seconds": 3.0,
            "failure_threshold": 2,
            "recovery_threshold": 2
        },
        {
            "name": "Simulated Order Gateway",
            "service_type": "simulator",
            "url": "http://127.0.0.1:8000/api/simulator/health",
            "check_interval_seconds": 5,
            "timeout_seconds": 2.0,
            "failure_threshold": 2,
            "recovery_threshold": 2
        },
        {
            "name": "PostgreSQL Database",
            "service_type": "database",
            "url": None,
            "check_interval_seconds": 10,
            "timeout_seconds": 3.0,
            "failure_threshold": 2,
            "recovery_threshold": 2
        }
    ]

    created = 0
    for d in defaults:
        exists = db.query(MonitoredService).filter(MonitoredService.name == d["name"]).first()
        if not exists:
            db.add(MonitoredService(**d))
            created += 1
    db.commit()
    return {"message": f"Seeded {created} default services"}

