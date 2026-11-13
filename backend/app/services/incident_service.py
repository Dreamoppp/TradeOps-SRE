import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.incident import Incident, IncidentEvent
from app.models.audit import AuditLog
from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.core.metrics import ACTIVE_INCIDENTS

logger = logging.getLogger("tradeops.incidents")

VALID_INCIDENT_TRANSITIONS = {
    "OPEN": ["ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "CLOSED"],
    "ACKNOWLEDGED": ["INVESTIGATING", "RESOLVED", "CLOSED", "OPEN"],
    "INVESTIGATING": ["RESOLVED", "CLOSED", "OPEN"],
    "RESOLVED": ["CLOSED", "OPEN"], # Reopen capability
    "CLOSED": ["OPEN"] # Reopen capability
}

class IncidentService:
    @staticmethod
    def _refresh_metrics(db: Session):
        for sev in ["P1", "P2", "P3", "P4"]:
            count = db.query(Incident).filter(
                Incident.severity == sev,
                Incident.status.in_(["OPEN", "ACKNOWLEDGED", "INVESTIGATING"])
            ).count()
            ACTIVE_INCIDENTS.labels(severity=sev).set(count)

    @staticmethod
    def list_incidents(
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        service_name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Incident]:
        query = db.query(Incident)
        if status:
            query = query.filter(Incident.status == status)
        if severity:
            query = query.filter(Incident.severity == severity)
        if service_name:
            query = query.filter(Incident.service_name == service_name)
        return query.order_by(Incident.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def get_incident(db: Session, incident_id: int) -> Optional[Incident]:
        return db.query(Incident).filter(Incident.id == incident_id).first()

    @staticmethod
    def create_incident(
        db: Session,
        data: IncidentCreate,
        actor: str = "system",
        mttd_seconds: Optional[float] = None
    ) -> Incident:
        # Check active incident deduplication
        existing = db.query(Incident).filter(
            Incident.service_name == data.service_name,
            Incident.status.in_(["OPEN", "ACKNOWLEDGED", "INVESTIGATING"])
        ).first()

        if existing:
            # Deduplicate! Append event to existing incident
            event = IncidentEvent(
                incident_id=existing.id,
                event_type="NOTE_ADDED",
                description=f"Duplicate failure condition detected: {data.title}. Ongoing active incident {existing.incident_number}.",
                actor=actor
            )
            db.add(event)
            db.commit()
            db.refresh(existing)
            logger.info(f"Deduplicated failure into active incident {existing.incident_number}")
            return existing

        # Generate unique incident number INC-YYYYMMDD-XXXX
        today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        count_today = db.query(Incident).filter(Incident.incident_number.like(f"INC-{today_str}-%")).count() + 1
        incident_number = f"INC-{today_str}-{count_today:04d}"

        incident = Incident(
            incident_number=incident_number,
            title=data.title,
            service_name=data.service_name,
            severity=data.severity,
            status="OPEN",
            assigned_to=data.assigned_to,
            mttd_seconds=mttd_seconds,
            created_at=datetime.now(timezone.utc)
        )
        db.add(incident)
        db.flush()

        # Add initial timeline event
        desc = f"Incident created with severity {data.severity} for service '{data.service_name}'."
        if data.notes:
            desc += f" Initial details: {data.notes}"
        event = IncidentEvent(
            incident_id=incident.id,
            event_type="CREATED",
            description=desc,
            actor=actor
        )
        db.add(event)

        # Audit log
        audit = AuditLog(
            actor=actor,
            action="INCIDENT_CREATED",
            target_type="INCIDENT",
            target_id=incident.incident_number,
            details_json=f'{{"title": "{incident.title}", "severity": "{incident.severity}"}}'
        )
        db.add(audit)

        db.commit()
        db.refresh(incident)
        IncidentService._refresh_metrics(db)
        logger.warning(f"New incident logged: {incident.incident_number} [{incident.severity}] - {incident.title}")
        return incident

    @staticmethod
    def update_incident(
        db: Session,
        incident_id: int,
        updates: IncidentUpdate,
        actor: str = "engineer"
    ) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident #{incident_id} not found")

        now = datetime.now(timezone.utc)

        # Handle status transition
        if updates.status and updates.status != incident.status:
            allowed = VALID_INCIDENT_TRANSITIONS.get(incident.status, [])
            if updates.status not in allowed:
                raise ValueError(f"Invalid status transition from {incident.status} to {updates.status}. Allowed: {allowed}")
            
            old_status = incident.status
            incident.status = updates.status

            if updates.status == "ACKNOWLEDGED" and not incident.acknowledged_at:
                incident.acknowledged_at = now
            elif updates.status == "RESOLVED":
                incident.resolved_at = now
                # Calculate MTTR
                if incident.created_at:
                    incident.mttr_seconds = (now - incident.created_at).total_seconds()
            elif updates.status == "CLOSED" and not incident.closed_at:
                incident.closed_at = now
            elif updates.status == "OPEN" and old_status in ["RESOLVED", "CLOSED"]:
                # Reopening
                incident.resolved_at = None
                incident.closed_at = None
                incident.mttr_seconds = None

            event = IncidentEvent(
                incident_id=incident.id,
                event_type="STATUS_CHANGE",
                description=f"Status changed from {old_status} to {updates.status}",
                actor=actor
            )
            db.add(event)

        # Handle other fields
        if updates.severity and updates.severity != incident.severity:
            old_sev = incident.severity
            incident.severity = updates.severity
            db.add(IncidentEvent(
                incident_id=incident.id,
                event_type="SEVERITY_CHANGE",
                description=f"Severity escalated/changed from {old_sev} to {updates.severity}",
                actor=actor
            ))

        if updates.assigned_to is not None and updates.assigned_to != incident.assigned_to:
            incident.assigned_to = updates.assigned_to
            db.add(IncidentEvent(
                incident_id=incident.id,
                event_type="ASSIGNED",
                description=f"Incident assigned to {updates.assigned_to}",
                actor=actor
            ))

        if updates.root_cause:
            incident.root_cause = updates.root_cause

        if updates.resolution:
            incident.resolution = updates.resolution

        if updates.notes:
            db.add(IncidentEvent(
                incident_id=incident.id,
                event_type="NOTE_ADDED",
                description=updates.notes,
                actor=actor
            ))

        db.commit()
        db.refresh(incident)
        IncidentService._refresh_metrics(db)
        return incident

    @staticmethod
    def get_metrics_summary(db: Session) -> Dict[str, Any]:
        total = db.query(Incident).count()
        active = db.query(Incident).filter(Incident.status.in_(["OPEN", "ACKNOWLEDGED", "INVESTIGATING"])).count()
        p1 = db.query(Incident).filter(Incident.severity == "P1").count()
        p2 = db.query(Incident).filter(Incident.severity == "P2").count()
        p3 = db.query(Incident).filter(Incident.severity == "P3").count()
        p4 = db.query(Incident).filter(Incident.severity == "P4").count()

        # MTTR average
        resolved_incidents = db.query(Incident).filter(Incident.mttr_seconds.isnot(None)).all()
        if resolved_incidents:
            mttr_avg_min = round(sum(i.mttr_seconds for i in resolved_incidents) / len(resolved_incidents) / 60.0, 2)
        else:
            mttr_avg_min = 0.0

        # MTTD average
        detected_incidents = db.query(Incident).filter(Incident.mttd_seconds.isnot(None)).all()
        if detected_incidents:
            mttd_avg_min = round(sum(i.mttd_seconds for i in detected_incidents) / len(detected_incidents) / 60.0, 2)
        else:
            mttd_avg_min = 0.0

        return {
            "total_incidents": total,
            "active_incidents": active,
            "p1_count": p1,
            "p2_count": p2,
            "p3_count": p3,
            "p4_count": p4,
            "mttr_avg_minutes": mttr_avg_min,
            "mttd_avg_minutes": mttd_avg_min
        }

