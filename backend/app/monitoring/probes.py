import time
import httpx
import logging
import psutil
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.service import MonitoredService
from app.core.metrics import (
    SERVICE_UP,
    SERVICE_LATENCY_MS,
    DB_QUERY_DURATION_SECONDS,
    SYSTEM_CPU_PERCENT,
    SYSTEM_MEMORY_PERCENT,
    SYSTEM_DISK_PERCENT
)

logger = logging.getLogger("tradeops.probes")

class ProbeResult:
    def __init__(
        self,
        status: str,
        latency_ms: float,
        status_code: int = None,
        error_message: str = None,
        details: Dict[str, Any] = None
    ):
        self.status = status # healthy, degraded, down
        self.latency_ms = latency_ms
        self.status_code = status_code
        self.error_message = error_message
        self.details = details or {}

def probe_http_service(service: MonitoredService) -> ProbeResult:
    """
    Executes an actual HTTP probe against the service endpoint.
    Handles network errors, connection timeouts, and HTTP status codes safely.
    """
    if not service.url:
        return ProbeResult("down", 0.0, error_message="No target URL configured")

    start = time.perf_counter()
    timeout = min(service.timeout_seconds, 10.0)

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(service.url)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            
            # Record Prometheus metrics
            SERVICE_LATENCY_MS.labels(service_name=service.name).set(latency_ms)

            if resp.status_code >= 500:
                SERVICE_UP.labels(service_name=service.name).set(0)
                return ProbeResult(
                    status="down",
                    latency_ms=latency_ms,
                    status_code=resp.status_code,
                    error_message=f"HTTP {resp.status_code}: Internal Server Error from target service"
                )
            elif resp.status_code >= 400:
                SERVICE_UP.labels(service_name=service.name).set(0)
                return ProbeResult(
                    status="degraded",
                    latency_ms=latency_ms,
                    status_code=resp.status_code,
                    error_message=f"HTTP {resp.status_code}: Client error response"
                )
            elif latency_ms > 1500.0:
                # Latency anomaly
                SERVICE_UP.labels(service_name=service.name).set(1)
                return ProbeResult(
                    status="degraded",
                    latency_ms=latency_ms,
                    status_code=resp.status_code,
                    error_message=f"Latency warning: Response took {latency_ms}ms (threshold: 1500ms)"
                )
            else:
                SERVICE_UP.labels(service_name=service.name).set(1)
                return ProbeResult(
                    status="healthy",
                    latency_ms=latency_ms,
                    status_code=resp.status_code
                )
    except httpx.ConnectError as e:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        SERVICE_UP.labels(service_name=service.name).set(0)
        SERVICE_LATENCY_MS.labels(service_name=service.name).set(latency_ms)
        return ProbeResult(
            status="down",
            latency_ms=latency_ms,
            error_message=f"Connection refused / unreachable: {str(e)}"
        )
    except httpx.TimeoutException:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        SERVICE_UP.labels(service_name=service.name).set(0)
        SERVICE_LATENCY_MS.labels(service_name=service.name).set(latency_ms)
        return ProbeResult(
            status="down",
            latency_ms=latency_ms,
            error_message=f"Probe timeout after {service.timeout_seconds}s"
        )
    except Exception as e:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        SERVICE_UP.labels(service_name=service.name).set(0)
        return ProbeResult(
            status="down",
            latency_ms=latency_ms,
            error_message=f"Unexpected probe error: {str(e)}"
        )

def probe_database_connection(db: Session, service_name: str = "PostgreSQL Database") -> ProbeResult:
    start = time.perf_counter()
    try:
        db.execute(text("SELECT 1")).fetchone()
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        DB_QUERY_DURATION_SECONDS.observe(latency_ms / 1000.0)
        SERVICE_UP.labels(service_name=service_name).set(1)
        SERVICE_LATENCY_MS.labels(service_name=service_name).set(latency_ms)
        status = "healthy" if latency_ms < 200 else "degraded"
        return ProbeResult(status=status, latency_ms=latency_ms, status_code=200)
    except Exception as e:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        SERVICE_UP.labels(service_name=service_name).set(0)
        SERVICE_LATENCY_MS.labels(service_name=service_name).set(latency_ms)
        return ProbeResult(
            status="down",
            latency_ms=latency_ms,
            error_message=f"Database probe failed: {str(e)}"
        )

def collect_host_system_metrics():
    """
    Collects real OS system metrics via psutil and updates Prometheus gauges.
    """
    try:
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory().percent
        disk = psutil.disk_usage("/").percent
        SYSTEM_CPU_PERCENT.set(cpu)
        SYSTEM_MEMORY_PERCENT.set(mem)
        SYSTEM_DISK_PERCENT.set(disk)
    except Exception as e:
        logger.error(f"Failed to collect host metrics: {e}")

