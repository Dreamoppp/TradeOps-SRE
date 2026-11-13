# TradeOps — REST API Documentation

The TradeOps REST API is fully documented interactively via OpenAPI / Swagger at:
`http://localhost:8000/docs`

All endpoints return and accept JSON, enforce request tracing headers (`X-Correlation-ID`, `X-Request-ID`), and provide structured error messages.

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates user credentials and issues a signed JSON Web Token (JWT).
- **Request Body**:
  ```json
  {
    "email": "engineer@tradeops.io",
    "password": "EngineerPass123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 2,
      "email": "engineer@tradeops.io",
      "full_name": "Production Support Engineer",
      "role": "engineer",
      "is_active": true,
      "created_at": "2026-11-13T09:13:39.123456Z"
    }
  }
  ```

### `GET /api/auth/me`
Retrieves currently authenticated user profile based on `Authorization: Bearer <token>`.

---

## 2. Monitored Services & Probing

### `GET /api/services`
Retrieves all registered target services with their current status, consecutive failure count, and the last 10 raw health check probe results.

### `GET /api/services/{id}/history?limit=50`
Returns historical probe telemetry (timestamp, latency in ms, status code, diagnosis) for latency charting.

### `PATCH /api/services/{id}`
Updates service probing policy (check interval, timeout, failure threshold, recovery threshold).

---

## 3. Incident Management

### `GET /api/incidents`
Lists incidents with optional filtering:
- Query Parameters: `status` (OPEN, ACKNOWLEDGED, INVESTIGATING, RESOLVED, CLOSED), `severity` (P1, P2, P3, P4), `service_name`, `limit`, `offset`.

### `POST /api/incidents`
Declares a new incident manually or via automated detection. Deduplicates against existing open incidents for the same service.
- **Request Body**:
  ```json
  {
    "title": "Exchange Gateway Latency Degradation",
    "service_name": "Simulated Order Gateway",
    "severity": "P2",
    "notes": "Spike detected in matching delay"
  }
  ```

### `PATCH /api/incidents/{id}`
Transitions incident status, assigns engineer, adds notes, or records resolution.
- **Request Body**:
  ```json
  {
    "status": "RESOLVED",
    "root_cause": "TCP socket queue congestion on ingress",
    "resolution": "Applied socket buffer tuning and cleared backlog"
  }
  ```

### `GET /api/incidents/metrics/summary`
Returns SRE quantitative performance metrics: total incidents, active count, severity distribution, MTTR (minutes), and MTTD (minutes).

---

## 4. Trading Simulator Endpoints

### `POST /api/simulator/orders/validate`
Executes pre-trade risk validation without creating an order. Verifies instrument symbol, positive quantity, limit price requirements, and notional limits ($5,000,000 max single ticket).

### `POST /api/simulator/orders`
Submits simulated order with transaction safety and idempotency.
- **Request Headers**:
  - `X-Correlation-ID`: Trace correlation token.
- **Request Body**:
  ```json
  {
    "client_order_id": "ord-20261113-001",
    "symbol": "AAPL",
    "side": "BUY",
    "order_type": "LIMIT",
    "quantity": 100,
    "price": 182.50
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": 1,
    "client_order_id": "ord-20261113-001",
    "symbol": "AAPL",
    "side": "BUY",
    "order_type": "LIMIT",
    "quantity": 100.0,
    "price": 182.50,
    "status": "EXECUTED",
    "execution_delay_ms": 78.4,
    "correlation_id": "web-1731489200-a1b2c",
    "created_at": "2026-11-13T09:14:00.000Z"
  }
  ```

### `POST /api/simulator/orders/{id}/cancel`
Cancels an order if in `PENDING` or `VALIDATED` state.

### `GET /api/simulator/fault-injection` & `POST /api/simulator/fault-injection`
Inspects or arms chaos fault injection scenarios (fail orders, injected latency, error rates).

---

## 5. System Diagnostics & Centralized Logs

### `GET /api/diagnostics/system`
Returns host CPU utilization %, logical core count, RAM utilization (total, used, %), and Disk usage via `psutil`.

### `GET /api/diagnostics/database`
Executes safe read-only query probe (`SELECT 1`), measures round-trip query time, active PostgreSQL backends, and database size.

### `POST /api/diagnostics/run`
Runs the comprehensive diagnostic suite across system, database, and logs, and persists the snapshot to `diagnostic_reports`.

### `GET /api/logs`
Searches structured JSON logs with filters: `query`, `severity`, `service_name`, `correlation_id`, `limit`, `offset`.

### `GET /api/logs/stats`
Returns aggregated log volume by severity and by service.

---

## 6. Prometheus & Webhooks

### `GET /metrics`
Standard Prometheus exposition format containing HTTP counters, latency histograms, service availability gauges, and host metrics.

### `POST /api/alerts/webhook`
Receiver for Prometheus Alertmanager notifications. Correlates firing alerts with ongoing active incidents.

