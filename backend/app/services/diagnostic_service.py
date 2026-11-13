import time
import json
import psutil
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.diagnostic import DiagnosticReport
from app.logging_config import LOG_BUFFER

logger = logging.getLogger("tradeops.diagnostics")

class DiagnosticService:
    @staticmethod
    def check_system_resources() -> Dict[str, Any]:
        start = time.perf_counter()
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count(logical=True)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        
        status = "PASS"
        warnings = []
        if cpu_percent > 85:
            status = "WARN"
            warnings.append(f"High CPU utilization: {cpu_percent}%")
        if memory.percent > 90:
            status = "WARN"
            warnings.append(f"High Memory usage: {memory.percent}%")
        if disk.percent > 90:
            status = "WARN"
            warnings.append(f"High Disk usage: {disk.percent}%")

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "check_type": "SYSTEM_RESOURCES",
            "status": status,
            "execution_time_ms": elapsed_ms,
            "warnings": warnings,
            "data": {
                "cpu_percent": cpu_percent,
                "cpu_count": cpu_count,
                "memory_total_mb": round(memory.total / (1024 * 1024), 2),
                "memory_used_mb": round(memory.used / (1024 * 1024), 2),
                "memory_percent": memory.percent,
                "disk_total_gb": round(disk.total / (1024 * 1024 * 1024), 2),
                "disk_used_gb": round(disk.used / (1024 * 1024 * 1024), 2),
                "disk_percent": disk.percent
            }
        }

    @staticmethod
    def check_database_health(db: Session) -> Dict[str, Any]:
        start = time.perf_counter()
        try:
            # Safe read-only probe
            query_start = time.perf_counter()
            res = db.execute(text("SELECT 1 AS alive")).fetchone()
            query_time_ms = round((time.perf_counter() - query_start) * 1000, 2)

            # Get database size and active connections if PostgreSQL
            db_size_mb = 0.0
            active_connections = 1
            try:
                size_res = db.execute(text("SELECT pg_database_size(current_database()) / (1024 * 1024)")).scalar()
                if size_res:
                    db_size_mb = round(float(size_res), 2)
                conn_res = db.execute(text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")).scalar()
                if conn_res:
                    active_connections = int(conn_res)
            except Exception:
                pass # fallback for sqlite or restricted permissions

            status = "PASS" if query_time_ms < 500 else "WARN"
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return {
                "check_type": "DATABASE_HEALTH",
                "status": status,
                "execution_time_ms": elapsed_ms,
                "data": {
                    "connected": True,
                    "query_latency_ms": query_time_ms,
                    "db_size_mb": db_size_mb,
                    "active_connections": active_connections,
                    "dialect": db.bind.dialect.name if db.bind else "unknown"
                }
            }
        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return {
                "check_type": "DATABASE_HEALTH",
                "status": "FAIL",
                "execution_time_ms": elapsed_ms,
                "error": str(e),
                "data": {"connected": False}
            }

    @staticmethod
    def summarize_error_logs() -> Dict[str, Any]:
        start = time.perf_counter()
        error_count = sum(1 for log in LOG_BUFFER if log.get("severity") in ["ERROR", "CRITICAL"])
        warn_count = sum(1 for log in LOG_BUFFER if log.get("severity") == "WARNING")
        recent_errors = [log for log in reversed(LOG_BUFFER) if log.get("severity") in ["ERROR", "CRITICAL"]][:10]

        status = "PASS" if error_count == 0 else ("WARN" if error_count < 10 else "FAIL")
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "check_type": "ERROR_SUMMARY",
            "status": status,
            "execution_time_ms": elapsed_ms,
            "data": {
                "total_buffered_logs": len(LOG_BUFFER),
                "error_count": error_count,
                "warning_count": warn_count,
                "recent_errors": recent_errors
            }
        }

    @staticmethod
    def run_all_diagnostics(db: Session, service_name: str = "TradeOps API") -> List[DiagnosticReport]:
        results = [
            DiagnosticService.check_system_resources(),
            DiagnosticService.check_database_health(db),
            DiagnosticService.summarize_error_logs()
        ]

        reports = []
        for r in results:
            report = DiagnosticReport(
                service_name=service_name,
                check_type=r["check_type"],
                status=r["status"],
                details_json=json.dumps(r),
                execution_time_ms=r["execution_time_ms"],
                timestamp=datetime.now(timezone.utc)
            )
            db.add(report)
            reports.append(report)
        db.commit()
        return reports

