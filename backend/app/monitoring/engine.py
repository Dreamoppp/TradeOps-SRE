import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.service import MonitoredService
from app.models.health_check import HealthCheck
from app.monitoring.probes import probe_http_service, probe_database_connection, collect_host_system_metrics
from app.services.automation_service import AutomationService

logger = logging.getLogger("tradeops.monitoring_engine")

class MonitoringEngine:
    def __init__(self, check_interval: int = 5):
        self.check_interval = check_interval
        self._is_running = False
        self._task: asyncio.Task = None

    def start(self):
        if not self._is_running:
            self._is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("Monitoring Engine background worker started.")

    def stop(self):
        self._is_running = False
        if self._task:
            self._task.cancel()
            logger.info("Monitoring Engine background worker stopped.")

    async def _run_loop(self):
        while self._is_running:
            try:
                # 1. Collect OS system metrics
                collect_host_system_metrics()

                # 2. Probe all registered services
                await asyncio.to_thread(self.probe_all_services)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}", exc_info=True)

            await asyncio.sleep(self.check_interval)

    def probe_all_services(self):
        db: Session = SessionLocal()
        try:
            services = db.query(MonitoredService).filter(MonitoredService.is_active == True).all()
            for service in services:
                self._probe_single_service(db, service)
        except Exception as e:
            logger.error(f"Failed to query monitored services: {e}")
        finally:
            db.close()

    def _probe_single_service(self, db: Session, service: MonitoredService):
        try:
            # Check service type
            if service.service_type == "database":
                result = probe_database_connection(db, service_name=service.name)
            else:
                result = probe_http_service(service)

            now = datetime.now(timezone.utc)
            service.last_check_at = now

            # Record HealthCheck probe result in DB
            check_record = HealthCheck(
                service_id=service.id,
                status=result.status,
                latency_ms=result.latency_ms,
                status_code=result.status_code,
                error_message=result.error_message,
                timestamp=now
            )
            db.add(check_record)

            old_status = service.status

            if result.status == "healthy":
                service.consecutive_successes += 1
                service.consecutive_failures = 0
                service.last_success_at = now

                # Check if recovery threshold met
                if old_status in ["down", "degraded"] and service.consecutive_successes >= service.recovery_threshold:
                    service.status = "healthy"
                    db.commit()
                    AutomationService.handle_service_recovery(db, service, result.latency_ms)
                else:
                    service.status = "healthy"
                    db.commit()

            else:
                # Degraded or Down
                service.consecutive_failures += 1
                service.consecutive_successes = 0

                # Check if failure threshold met
                if service.consecutive_failures >= service.failure_threshold and old_status != result.status:
                    service.status = result.status
                    db.commit()
                    AutomationService.handle_service_failure(db, service, result.error_message or "Probe failed", result.latency_ms)
                else:
                    service.status = result.status
                    db.commit()

        except Exception as e:
            logger.error(f"Error probing service {service.name}: {e}")
            db.rollback()

monitoring_engine = MonitoringEngine(check_interval=5)

