from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.incident import Incident
from app.schemas.incident import IncidentOut, IncidentCreate, IncidentUpdate, IncidentMetricsOut
from app.services.incident_service import IncidentService
from app.core.security import get_current_user_optional

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentOut])
def list_incidents(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    incidents = IncidentService.list_incidents(
        db, status=status, severity=severity, service_name=service_name, limit=limit, offset=offset
    )
    return [IncidentOut.model_validate(i) for i in incidents]

@router.get("/metrics/summary", response_model=IncidentMetricsOut)
def get_incident_metrics(db: Session = Depends(get_db)):
    summary = IncidentService.get_metrics_summary(db)
    return IncidentMetricsOut(**summary)

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = IncidentService.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return IncidentOut.model_validate(incident)

@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user_optional)
):
    actor = user.email if user else "manual_user"
    incident = IncidentService.create_incident(db, payload, actor=actor)
    return IncidentOut.model_validate(incident)

@router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user_optional)
):
    actor = user.email if user else "engineer"
    try:
        updated = IncidentService.update_incident(db, incident_id, payload, actor=actor)
        return IncidentOut.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

