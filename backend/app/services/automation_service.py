import json
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.service import MonitoredService
from app.models.incident import Incident, IncidentEvent
from app.models.diagnostic import DiagnosticReport
from app.models.alert import AlertRecord
from app.models.audit import AuditLog
from app.schemas.incident import IncidentCreate
from app.services.incident_service import IncidentService
from app.services.diagnostic_service import DiagnosticService

logger = logging.getLogger("tradeops.automation")

class AutomationService:
    @staticmethod
    def handle_service_failure(
        db: Session,
        service: MonitoredService,
        error_message: str,
        latency_ms: float
    ):
        """
        Automated workflow when service consecutive failures cross threshold:
        1. Auto-create or deduplicate Incident
        2. Generate automated diagnostic snapshot
        3. Attach diagnostic findings to incident timeline
        4. Create AlertRecord
        5. Audit log
        """
        severity = "P1" if service.service_type in ["database", "simulator"] or "Connection refused" in error_message else "P2"
        title = f"Service Outage: {service.name} failed health probe ({error_message[:80]})"

        logger.warning(f"Automation triggered: Service '{service.name}' breached failure threshold ({service.consecutive_failures}/{service.failure_threshold})")

        # 1. Create or deduplicate incident
        incident = IncidentService.create_incident(
            db=db,
            data=IncidentCreate(
                title=title,
                service_name=service.name,
                severity=severity,
                notes=f"Detected by automated probe. Latency: {latency_ms}ms. Error: {error_message}"
            ),
            actor="automation_engine",
            mttd_seconds=round(service.check_interval_seconds * service.failure_threshold, 1)
        )

        # 2. Automated diagnostic snapshot
        try:
            diag_reports = DiagnosticService.run_all_diagnostics(db, service_name=service.name)
            diag_summary = f"Automated Diagnostics Executed: {len(diag_reports)} checks completed."
            for rep in diag_reports:
                diag_summary += f" [{rep.check_type}: {rep.status}]"

            # 3. Attach diagnostic to timeline
            db.add(IncidentEvent(
                incident_id=incident.id,
                event_type="DIAGNOSTIC_ATTACHED",
                description=diag_summary,
                actor="automation_engine"
            ))
        except Exception as e:
            logger.error(f"Failed to attach automated diagnostics: {e}")

        # 4. Trigger alert record
        alert = AlertRecord(
            alert_name=f"{service.name.replace(' ', '')}Down",
            service_name=service.name,
            severity=severity,
            status="FIRING",
            description=f"Automated probe failure for {service.name}: {error_message}",
            incident_id=incident.id,
            starts_at=datetime.now(timezone.utc)
        )
        db.add(alert)

        # 5. Audit log
        db.add(AuditLog(
            actor="automation_engine",
            action="AUTO_INCIDENT_TRIGGERED",
            target_type="SERVICE",
            target_id=str(service.id),
            details_json=json.dumps({
                "service_name": service.name,
                "incident_number": incident.incident_number,
                "consecutive_failures": service.consecutive_failures,
                "error": error_message
            })
        ))
        db.commit()

    @staticmethod
    def handle_service_recovery(
        db: Session,
        service: MonitoredService,
        latency_ms: float
    ):
        """
        Automated workflow when service consecutive successes cross recovery threshold:
        1. Find any active incident for this service
        2. Record recovery evidence in timeline
        3. Automatically mark incident as RESOLVED
        4. Resolve active alerts
        5. Audit log
        """
        logger.info(f"Automation triggered: Service '{service.name}' verified healthy ({service.consecutive_successes}/{service.recovery_threshold})")

        active_incidents = db.query(Incident).filter(
            Incident.service_name == service.name,
            Incident.status.in_(["OPEN", "ACKNOWLEDGED", "INVESTIGATING"])
        ).all()

        now = datetime.now(timezone.utc)

        for incident in active_incidents:
            # Record recovery evidence
            db.add(IncidentEvent(
                incident_id=incident.id,
                event_type="RECOVERY_DETECTED",
                description=f"Automated verification: Service '{service.name}' passed {service.recovery_threshold} consecutive probes (current latency: {latency_ms}ms). Recovery confirmed.",
                actor="automation_engine"
            ))

            incident.status = "RESOLVED"
            incident.resolved_at = now
            if incident.created_at:
                incident.mttr_seconds = (now - incident.created_at).total_seconds()
            incident.resolution = f"Service recovered automatically after probe stabilization. Latency normalized to {latency_ms}ms."

            # Resolve alerts
            for alert in incident.alerts:
                if alert.status == "FIRING":
                    alert.status = "RESOLVED"
                    alert.endsAt = now

        db.add(AuditLog(
            actor="automation_engine",
            action="AUTO_RECOVERY_RESOLVED",
            target_type="SERVICE",
            target_id=str(service.id),
            details_json=json.dumps({
                "service_name": service.name,
                "incidents_resolved": [i.incident_number for i in active_incidents],
                "latency_ms": latency_ms
            })
        ))
        db.commit()
        IncidentService._refresh_metrics(db)

