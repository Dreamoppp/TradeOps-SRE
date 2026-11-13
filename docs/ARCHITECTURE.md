# TradeOps — Architecture & System Design

## 1. High-Level System Architecture

TradeOps is engineered as a multi-tier, fault-tolerant Observability and Incident Management Platform specifically tailored for electronic trading environments and fintech infrastructure.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  OPERATOR WORKSTATION                                       │
│                                                                                             │
│   React 18 + Tailwind CSS Dashboard (Vite 6 SPA)       Prometheus / Grafana Web UI          │
│   [ http://localhost:5173 ]                            [ :9090 / :3000 ]                    │
└───────────────────────────┬─────────────────────────────────────┬───────────────────────────┘
                            │ (Axios REST + X-Correlation-ID)     │ (HTTP Scrape / Alert Hook)
                            ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                TRADEOPS CORE BACKEND (FastAPI)                              │
│                                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │   Auth & Security       │  │   Telemetry Engine      │  │   Incident Workflow         │  │
│  │   - JWT (HS256)         │  │   - Background Probes   │  │   - State Transitions       │  │
│  │   - Bcrypt Hashing      │  │   - HTTP/DB Latencies   │  │   - Deduplication Engine    │  │
│  │   - RBAC (Admin/Eng)    │  │   - psutil OS Telemetry │  │   - Timeline & Post-Mortem  │  │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │   Trading Simulator     │  │   Automation Engine     │  │   Prometheus Exporter       │  │
│  │   - Matching Engine     │  │   - Threshold Evaluator │  │   - Counter / Histogram     │  │
│  │   - State Machine       │  │   - Auto Incident Gen   │  │   - /metrics endpoint       │  │
│  │   - Idempotency Gate    │  │   - Auto Recovery Reset │  │   - Gauge Metrics           │  │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────────────────────────────┘
                            │ (SQLAlchemy ORM + Connection Pooling)
                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  POSTGRESQL 18 CLUSTER                                      │
│                                                                                             │
│  Tables: users · monitored_services · health_checks · incidents · incident_events           │
│          trading_orders · alert_records · audit_logs · diagnostic_reports                   │
│  Indexes: B-tree on symbol, client_order_id, (service_id, timestamp), (status, severity)    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design & Operational Responsibilities

### 2.1 Backend Service Layer (FastAPI 0.115+)
- **Asynchronous I/O Performance**: Utilizes Python's `asyncio` loop with Starlette ASGI for handling incoming dashboard requests concurrently.
- **Request Tracing Middleware**: Intercepts every inbound request to generate or propagate `X-Correlation-ID` and `X-Request-ID`. Records request latency into Prometheus histograms (`tradeops_http_request_duration_seconds`) and increments request counters.
- **Structured JSON Logging**: Standard library logging is formatted into structured JSON strings via `StructuredJsonFormatter`, capturing `timestamp`, `service_name`, `severity`, `message`, `request_id`, and `correlation_id`.

### 2.2 Telemetry & Monitoring Engine
- **Non-Destructive Background Probing**: Runs on a configurable interval (default: 5 seconds). Executes lightweight HTTP probes against external and internal endpoints, as well as native SQL heartbeat queries (`SELECT 1`).
- **Resilience**: All network and database probes catch exceptions (`httpx.ConnectError`, `httpx.TimeoutException`, `psycopg2.OperationalError`) without crashing the worker.
- **Metrics Recording**: Telemetry is translated into real-time Prometheus gauges:
  - `tradeops_service_up{service_name="..."}`: 1 if healthy, 0 if down.
  - `tradeops_service_latency_ms{service_name="..."}`: Round-trip probe duration.
  - `tradeops_system_cpu_percent`, `tradeops_system_memory_percent`, `tradeops_system_disk_percent`: OS metrics sampled via `psutil`.

### 2.3 Incident Management State Machine
- **Lifecycle States**:
  $$\text{OPEN} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{INVESTIGATING} \longrightarrow \text{RESOLVED} \longrightarrow \text{CLOSED}$$
  *(With verified reopening transition from RESOLVED/CLOSED back to OPEN).*
- **Failure Threshold & Deduplication**:
  - When a service breaches its `failure_threshold` (e.g. 2 consecutive failed probes), the Automation Engine triggers incident creation.
  - If an active incident already exists for that service in `OPEN`, `ACKNOWLEDGED`, or `INVESTIGATING` state, the event is appended to the existing timeline to avoid alert flooding.
- **SRE Metrics**:
  - **MTTD (Mean Time to Detect)**: Evaluated from first failed probe to incident registration.
  - **MTTR (Mean Time to Resolve)**: Evaluated from incident `created_at` to `resolved_at`.

### 2.4 Trading Service Simulator (Synthetic Matching Gateway)
- **Order States**: `PENDING`, `VALIDATED`, `REJECTED`, `EXECUTED`, `CANCELLED`, `FAILED`.
- **Idempotency**: Every order placement requires a unique `client_order_id`. If an order with the same `client_order_id` is retransmitted, the existing order is returned without duplicate execution.
- **Chaos Fault Injection**: Allows SREs to simulate gateway downtime (HTTP 500), matching delay spikes (100–2500ms), database disconnections, and synthetic rejection rates.

---

## 3. Database Schema Design (PostgreSQL 18)

Normalized schemas configured and managed via Alembic revisions:
1. `users`: Authentication records, bcrypt-hashed passwords, and RBAC roles (`admin`, `engineer`).
2. `monitored_services`: Target services with polling policy (interval, timeout, trip thresholds).
3. `health_checks`: Time-series probe log with compound index `(service_id, timestamp)`.
4. `incidents`: Central incident record with `(status, severity)` index.
5. `incident_events`: Ordered audit timeline for post-mortem forensics.
6. `trading_orders`: Simulated trading orders with unique index on `client_order_id` and compound index on `(symbol, status)`.
7. `diagnostic_reports`: Snapshots of host and database telemetry.
8. `alert_records`: Prometheus Alertmanager webhook notifications correlated with incidents.
9. `audit_logs`: Immutable security audit trail of operator and automation actions.

