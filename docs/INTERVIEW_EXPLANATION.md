# TradeOps — Technical Interview Guide for Production Support & SRE Roles

This document prepares candidates to articulate the architectural decisions, operational mechanics, and fintech reliability principles implemented in **TradeOps** during technical interviews for Production Support Engineer, Application Support Engineer, and Site Reliability Engineer (SRE) roles.

---

## 1. System Architecture Walkthrough

### Question: "Can you walk me through the high-level architecture of TradeOps?"
**Key Talking Points**:
- "TradeOps is architected as an enterprise-grade observability and incident triage platform for electronic trading environments. It is split into three decoupled tiers:
  1. **Telemetry & Simulation Layer**: A synthetic trading gateway exposing REST endpoints for order placement, validation, and simulated matching. It maintains a state machine (`PENDING` → `VALIDATED` → `EXECUTED` / `REJECTED` / `FAILED`) and includes controlled fault injection for chaos testing.
  2. **Core Observability & Automation Engine**: A FastAPI backend running background probing loops. It continuously evaluates service health, queries host telemetry using `psutil`, exposes Prometheus `/metrics`, and executes automated incident detection rules.
  3. **Data & Visualization Tier**: A normalized PostgreSQL 18 database managed via Alembic migrations, coupled with a React 18 / Tailwind CSS operator console and Grafana dashboards for metrics visualization."

---

## 2. Technology Selection Rationale

### Question: "Why did you choose FastAPI and PostgreSQL over other alternatives like Django, Flask, or MongoDB?"
**FastAPI Rationale**:
- **Asynchronous Throughput**: FastAPI is built on Starlette and Uvicorn (ASGI), providing async non-blocking I/O ideal for polling dozens of service health endpoints concurrently without thread exhaustion.
- **Type Safety & Pydantic**: In financial trading, input validation is paramount. Pydantic guarantees compile-time and runtime validation of financial quantities, prices, symbols, and payload constraints.
- **Automatic OpenAPI Documentation**: Facilitates rapid onboarding and clear contract definitions for integration testing.

**PostgreSQL Rationale**:
- **ACID Transactions**: Order state transitions and incident audit trails cannot tolerate data loss or partial writes. PostgreSQL's transactional guarantees (`BEGIN`, `COMMIT`, `ROLLBACK`) prevent split-brain states.
- **Relational Integrity**: Strong foreign key constraints between `incidents` and `incident_events`, and between `monitored_services` and `health_checks`.
- **Query Optimization & Indexing**: B-tree compound indexing (`idx_service_timestamp`, `idx_order_symbol_status`) enables sub-millisecond lookups even over millions of probe telemetry records.

---

## 3. Telemetry Collection & Prometheus Mechanics

### Question: "How does Prometheus collect metrics from TradeOps, and how are alerts triggered?"
**Key Talking Points**:
- **Pull-Based Scraping**: "Prometheus scrapes the `/metrics` endpoint exposed by the TradeOps API on a 5-second interval. Rather than using in-memory state that vanishes on restart, TradeOps utilizes the `prometheus_client` SDK to instrument standard metrics:
  - **Counters**: `tradeops_http_requests_total`, `tradeops_http_errors_total`, `tradeops_trading_orders_total`.
  - **Histograms**: `tradeops_http_request_duration_seconds` (request latency buckets) and `tradeops_trading_order_execution_latency_seconds`.
  - **Gauges**: `tradeops_service_up` (1 for UP, 0 for DOWN), `tradeops_service_latency_ms`, `tradeops_active_incidents` (labeled by severity P1–P4), and host `tradeops_system_cpu_percent` / `tradeops_system_memory_percent`.
- **Alert Rules**: In `monitoring/prometheus/alert_rules.yml`, alert thresholds are defined using PromQL:
  - `ServiceDown`: `tradeops_service_up == 0` for 30s (P1 Critical).
  - `HighErrorRate`: `rate(tradeops_http_errors_total[2m]) / rate(tradeops_http_requests_total[2m]) > 0.05` (P2 High).
  - `HighLatency`: `histogram_quantile(0.95, rate(tradeops_http_request_duration_seconds_bucket[2m])) > 1.0` (P2 High).
- **Alertmanager Webhook Correlation**: Alertmanager receives fired alerts and sends webhooks to `/api/alerts/webhook`. TradeOps correlates the alert with any open incident for that service to avoid creating duplicate incident tickets."

---

## 4. Incident Detection & Deduplication Engine

### Question: "How does TradeOps detect failures and prevent duplicate incident spam?"
**Key Talking Points**:
- **Consecutive Probe Thresholding**: "A single failed probe does not necessarily warrant waking up an engineer. TradeOps implements configurable trip thresholds (`failure_threshold = 2`, `recovery_threshold = 2`). If a probe returns an HTTP 5xx or times out twice consecutively, the failure state is confirmed.
- **Incident Deduplication**: When a failure is detected, the `IncidentService` queries the database for active incidents (`status IN ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING')`) on that specific service. If an active incident exists, TradeOps **does not create a duplicate incident**; instead, it appends a note to the existing audit timeline.
- **Automated Diagnostic Attachment**: Upon declaring an incident, the Automation Engine automatically triggers a snapshot of host resources, database connectivity, and recent error logs, attaching the diagnostic evidence directly to the incident timeline."

---

## 5. Root Cause Analysis (RCA) & Operational Troubleshooting

### Question: "How would a Production Support Engineer investigate an alert using TradeOps?"
**Key Talking Points**:
1. **Acknowledge**: Engineer acknowledges the incident via dashboard to prevent escalation.
2. **Trace Correlation**: Inspect `X-Correlation-ID` attached to the failed order or probe to trace the exact request across logs.
3. **Execute Safe Diagnostics**: Run `python scripts/check_database.py` and `python scripts/check_system_resources.py` to identify whether the issue is host resource exhaustion, socket timeouts, or database locks.
4. **Log Analysis**: Open `/logs` in the TradeOps console, filter by `severity=ERROR`, and inspect the structured JSON error trace.
5. **Mitigate & Verify**: Once mitigated, observe consecutive probe recovery in `/services`. Resolve the ticket with documented Root Cause and Corrective Actions.

---

## 6. Database Performance & Optimization

### Question: "How did you ensure the database performs well under heavy telemetry volume?"
**Key Talking Points**:
- **Connection Pooling**: SQLAlchemy configured with `pool_pre_ping=True`, `pool_size=10`, `max_overflow=20`, and `pool_recycle=300` to prevent stale connection errors.
- **Compound Indexing**:
  - `(service_id, timestamp)` on `health_checks`: Speeds up time-series range queries for dashboard latency graphs.
  - `(symbol, status)` on `trading_orders`: Optimizes order book and execution history queries.
  - `(status, severity)` on `incidents`: Accelerates active incident filtering.
- **Query Verification via EXPLAIN ANALYZE**: Verified that critical queries utilize B-tree Index Scans instead of Sequential Scans, achieving execution times under 0.05 milliseconds.

---

## 7. How This Project Relates to Production Support Engineering

### Question: "How does building TradeOps demonstrate readiness for a Production Support role?"
**Key Talking Points**:
- "Production Support is not just about writing code; it is about **system reliability, incident mitigation, and operational hygiene**. TradeOps demonstrates:
  1. **Understanding of Failure Modes**: Implementing idempotency keys, handling database drops gracefully, and managing timeouts.
  2. **MTTR and MTTD Accountability**: Quantifying how fast issues are detected and resolved with real SLA targets.
  3. **Safe Automation**: Using non-destructive scripts to automate repetitive diagnostics instead of risking manual terminal commands in production.
  4. **Post-Mortem Discipline**: Documenting root causes and corrective actions to prevent recurring incidents."

