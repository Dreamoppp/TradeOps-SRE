from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query
from app.logging_config import LOG_BUFFER

router = APIRouter(prefix="/api/logs", tags=["Log Explorer"])

@router.get("")
def search_logs(
    query: Optional[str] = Query(None, description="Free text search term"),
    severity: Optional[str] = Query(None, description="INFO, WARNING, ERROR, CRITICAL"),
    service_name: Optional[str] = Query(None),
    correlation_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    results = list(reversed(LOG_BUFFER))

    if query:
        q_lower = query.lower()
        results = [
            l for l in results
            if q_lower in l.get("message", "").lower()
            or q_lower in str(l.get("details", "")).lower()
            or q_lower in str(l.get("error_details", "")).lower()
        ]

    if severity:
        sev_upper = severity.upper()
        results = [l for l in results if l.get("severity") == sev_upper]

    if service_name:
        results = [l for l in results if l.get("service_name") == service_name]

    if correlation_id:
        results = [l for l in results if l.get("correlation_id") == correlation_id]

    total_matched = len(results)
    paginated = results[offset : offset + limit]

    return {
        "total": total_matched,
        "offset": offset,
        "limit": limit,
        "logs": paginated
    }

@router.get("/stats")
def get_log_stats():
    severity_counts = {"INFO": 0, "WARNING": 0, "ERROR": 0, "CRITICAL": 0}
    service_counts: Dict[str, int] = {}

    for l in LOG_BUFFER:
        sev = l.get("severity", "INFO")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

        svc = l.get("service_name", "unknown")
        service_counts[svc] = service_counts.get(svc, 0) + 1

    return {
        "total_logs": len(LOG_BUFFER),
        "severities": severity_counts,
        "services": service_counts
    }

