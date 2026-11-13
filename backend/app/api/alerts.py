import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.alert import AlertRecord
from app.models.incident import Incident, IncidentEvent
from app.schemas.alert import AlertmanagerWebhook, AlertOut

logger = logging.getLogger("tradeops.alerts")
router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertOut])
def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(AlertRecord)
    if status:
        query = query.filter(AlertRecord.status == status.upper())
    if severity:
        query = query.filter(AlertRecord.severity == severity.upper())
    
    alerts = query.order_by(desc(AlertRecord.created_at)).limit(limit).all()
    return [AlertOut.model_validate(a) for a in alerts]

@router.post("/webhook", status_code=200)
def receive_alertmanager_webhook(payload: AlertmanagerWebhook, db: Session = Depends(get_db)):
    """
    Receives alerts from Prometheus Alertmanager.
    Correlates firing alerts with existing active incidents to avoid duplicates.
    """
    processed = 0
    now = datetime.now(timezone.utc)

    for item in payload.alerts:
        alert_name = item.labels.get("alertname", "UnknownAlert")
        severity = item.labels.get("severity", "P2").upper()
        service_name = item.labels.get("service", "TradeOps")
        summary = item.annotations.get("summary", item.annotations.get("description", "Alert triggered by Prometheus rule"))
        alert_status = item.status.upper() # FIRING or RESOLVED

        # Correlate with active incident if any
        incident = db.query(Incident).filter(
            Incident.service_name.ilike(f"%{service_name}%"),
            Incident.status.in_(["OPEN", "ACKNOWLEDGED", "INVESTIGATING"])
        ).first()

        incident_id = incident.id if incident else None

        # Check for existing alert record to prevent duplicate spam
        existing_alert = db.query(AlertRecord).filter(
            AlertRecord.alert_name == alert_name,
            AlertRecord.status == "FIRING"
        ).first()

        if alert_status == "FIRING":
            if not existing_alert:
                alert_record = AlertRecord(
                    alert_name=alert_name,
                    service_name=service_name,
                    severity=severity,
                    status="FIRING",
                    description=summary,
                    incident_id=incident_id,
                    starts_at=now
                )
                db.add(alert_record)

                if incident:
                    db.add(IncidentEvent(
                        incident_id=incident.id,
                        event_type="NOTE_ADDED",
                        description=f"Prometheus Alertmanager Webhook: {alert_name} [{severity}] firing.",
                        actor="alertmanager_webhook"
                    ))
                logger.warning(f"Prometheus alert registered: {alert_name} ({severity})")
                processed += 1
        elif alert_status == "RESOLVED":
            if existing_alert:
                existing_alert.status = "RESOLVED"
                existing_alert.ends_at = now
                if incident:
                    db.add(IncidentEvent(
                        incident_id=incident.id,
                        event_type="NOTE_ADDED",
                        description=f"Prometheus Alertmanager Webhook: {alert_name} resolved.",
                        actor="alertmanager_webhook"
                    ))
                logger.info(f"Prometheus alert resolved: {alert_name}")
                processed += 1

    db.commit()
    return {"status": "success", "processed_alerts": processed}

@router.patch("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertRecord).filter(AlertRecord.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert record not found")
    
    alert.status = "RESOLVED"
    alert.ends_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return AlertOut.model_validate(alert)

