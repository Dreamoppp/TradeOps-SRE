from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.service import MonitoredService
from app.models.health_check import HealthCheck
from app.models.incident import Incident
from app.models.order import TradingOrder

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/overview")
def get_analytics_overview(db: Session = Depends(get_db)):
    # 1. Total and uptime metrics
    services = db.query(MonitoredService).all()
    total_services = len(services)
    healthy_services = sum(1 for s in services if s.status == "healthy")
    degraded_services = sum(1 for s in services if s.status == "degraded")
    down_services = sum(1 for s in services if s.status == "down")

    # 2. Availability percentage calculation from health_checks over last 24h
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)
    
    total_checks = db.query(HealthCheck).filter(HealthCheck.timestamp >= since_24h).count()
    healthy_checks = db.query(HealthCheck).filter(
        HealthCheck.timestamp >= since_24h,
        HealthCheck.status == "healthy"
    ).count()

    availability_pct = round((healthy_checks / total_checks * 100), 2) if total_checks > 0 else 100.0

    # 3. Average latency
    avg_latency = db.query(func.avg(HealthCheck.latency_ms)).filter(
        HealthCheck.timestamp >= since_24h
    ).scalar() or 0.0

    # 4. Incident stats
    total_incidents = db.query(Incident).count()
    active_incidents = db.query(Incident).filter(
        Incident.status.in_(["OPEN", "ACKNOWLEDGED", "INVESTIGATING"])
    ).count()

    resolved_with_mttr = db.query(Incident).filter(Incident.mttr_seconds.isnot(None)).all()
    mttr_avg_min = round(sum(i.mttr_seconds for i in resolved_with_mttr) / len(resolved_with_mttr) / 60.0, 1) if resolved_with_mttr else 0.0

    detected_with_mttd = db.query(Incident).filter(Incident.mttd_seconds.isnot(None)).all()
    mttd_avg_min = round(sum(i.mttd_seconds for i in detected_with_mttd) / len(detected_with_mttd) / 60.0, 1) if detected_with_mttd else 0.0

    # 5. Order stats
    total_orders = db.query(TradingOrder).count()
    executed_orders = db.query(TradingOrder).filter(TradingOrder.status == "EXECUTED").count()
    failed_orders = db.query(TradingOrder).filter(TradingOrder.status.in_(["FAILED", "REJECTED"])).count()

    # 6. Latency trend per service (last 20 probe points)
    service_latency_trends = {}
    for s in services:
        points = db.query(HealthCheck.timestamp, HealthCheck.latency_ms, HealthCheck.status).filter(
            HealthCheck.service_id == s.id
        ).order_by(HealthCheck.timestamp.desc()).limit(20).all()
        service_latency_trends[s.name] = [
            {"time": p[0].strftime("%H:%M:%S"), "latency": round(p[1], 1), "status": p[2]}
            for p in reversed(points)
        ]

    return {
        "services": {
            "total": total_services,
            "healthy": healthy_services,
            "degraded": degraded_services,
            "down": down_services,
            "availability_percentage": availability_pct,
            "average_latency_ms": round(float(avg_latency), 2)
        },
        "incidents": {
            "total": total_incidents,
            "active": active_incidents,
            "mttr_avg_minutes": mttr_avg_min,
            "mttd_avg_minutes": mttd_avg_min
        },
        "orders": {
            "total": total_orders,
            "executed": executed_orders,
            "failed_or_rejected": failed_orders
        },
        "latency_trends": service_latency_trends
    }

