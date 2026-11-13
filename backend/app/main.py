import time
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.logging_config import setup_logging, correlation_id_ctx, request_id_ctx
from app.core.metrics import (
    HTTP_REQUESTS_TOTAL,
    HTTP_REQUEST_DURATION_SECONDS,
    HTTP_ERRORS_TOTAL
)
from app.models import User, MonitoredService
from app.core.security import hash_password
from app.monitoring.engine import monitoring_engine

# Import API Routers
from app.api.auth import router as auth_router
from app.api.services import router as services_router
from app.api.incidents import router as incidents_router
from app.api.simulator import router as simulator_router
from app.api.diagnostics import router as diagnostics_router
from app.api.logs import router as logs_router
from app.api.alerts import router as alerts_router
from app.api.analytics import router as analytics_router

# Setup Structured JSON Logging
setup_logging(service_name="tradeops-api")
logger = logging.getLogger("tradeops.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database Tables
    logger.info("Initializing TradeOps database tables...")
    Base.metadata.create_all(bind=engine)

    # Seed initial data
    db = SessionLocal()
    try:
        # Seed users
        admin = db.query(User).filter(User.email == "admin@tradeops.io").first()
        if not admin:
            admin = User(
                email="admin@tradeops.io",
                hashed_password=hash_password("AdminPass123!"),
                full_name="Admin Lead",
                role="admin",
                is_active=True
            )
            db.add(admin)

        engineer = db.query(User).filter(User.email == "engineer@tradeops.io").first()
        if not engineer:
            engineer = User(
                email="engineer@tradeops.io",
                hashed_password=hash_password("EngineerPass123!"),
                full_name="Production Support Engineer",
                role="engineer",
                is_active=True
            )
            db.add(engineer)

        # Seed monitored services
        default_services = [
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

        for s in default_services:
            if not db.query(MonitoredService).filter(MonitoredService.name == s["name"]).first():
                db.add(MonitoredService(**s))

        db.commit()
        logger.info("Database initialized and seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

    # Start background monitoring engine
    monitoring_engine.start()
    logger.info("TradeOps application startup complete.")

    yield

    # Shutdown
    logger.info("Stopping monitoring engine...")
    monitoring_engine.stop()
    logger.info("TradeOps shutdown complete.")

app = FastAPI(
    title="TradeOps — Trading Platform Monitoring & Incident Management System",
    description="Production-grade SRE & Production Support Observability API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Metrics and Correlation Tracking Middleware
@app.middleware("http")
async def correlation_and_metrics_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID") or f"corr-{uuid.uuid4().hex[:12]}"
    request_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:10]}"

    correlation_id_ctx.set(correlation_id)
    request_id_ctx.set(request_id)

    start_time = time.perf_counter()
    path = request.url.path
    method = request.method

    try:
        response = await call_next(request)
        duration = time.perf_counter() - start_time

        # Track Prometheus metrics (exclude scraping endpoint)
        if path != "/metrics":
            status_code = str(response.status_code)
            HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status=status_code).inc()
            HTTP_REQUEST_DURATION_SECONDS.labels(method=method, path=path).observe(duration)
            if response.status_code >= 500:
                HTTP_ERRORS_TOTAL.labels(path=path, status=status_code).inc()

        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Request-ID"] = request_id
        return response

    except Exception as e:
        duration = time.perf_counter() - start_time
        logger.error(f"Unhandled exception during {method} {path}: {e}", exc_info=True)
        if path != "/metrics":
            HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status="500").inc()
            HTTP_ERRORS_TOTAL.labels(path=path, status="500").inc()
        raise

# Core Endpoints
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "TradeOps API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }

@app.get("/metrics", tags=["Metrics"])
def prometheus_metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Include API Routers
app.include_router(auth_router)
app.include_router(services_router)
app.include_router(incidents_router)
app.include_router(simulator_router)
app.include_router(diagnostics_router)
app.include_router(logs_router)
app.include_router(alerts_router)
app.include_router(analytics_router)
