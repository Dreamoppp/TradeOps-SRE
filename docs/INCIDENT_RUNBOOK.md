# TradeOps — Production Support Incident Runbook

This runbook defines standard operating procedures (SOP) for Production Support Engineers and Site Reliability Engineers responding to outages, degradations, and anomalies across the TradeOps platform.

---

## 1. Severity Levels & Escalation Matrix

| Severity | Definition | Target MTTD | Target MTTR | Escalation Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **P1 — Critical** | Complete service outage, matching engine down, database inaccessible, financial execution blocked | < 1 min | < 15 mins | Immediate alert to On-Call SRE + Trading Desk Lead |
| **P2 — High** | Latency degradation (> 1.5s), order rejection rate > 5%, non-critical endpoint 500 errors | < 2 mins | < 30 mins | On-Call Production Support Engineer |
| **P3 — Medium** | Elevated resource usage (CPU > 85%, RAM > 90%), single probe failure below trip threshold | < 5 mins | < 2 hours | Daily Operations Review / Ticket queue |
| **P4 — Low** | Minor cosmetic anomaly, non-blocking telemetry delay | < 15 mins | < 24 hours | Next scheduled maintenance sprint |

---

## 2. Standard Triage Workflow (P1 / P2 Incidents)

```
[ALERT FIRING] ──> 1. ACKNOWLEDGE ──> 2. RUN DIAGNOSTICS ──> 3. ISOLATE / MITIGATE ──> 4. VERIFY RECOVERY ──> 5. POST-MORTEM
                   - Assign SRE        - python scripts/      - Circuit Breaker        - 2 Consecutive Probes   - Root Cause Doc
                   - Update to ACK       check_database.py    - Reset Fault State      - Normalized Latency     - MTTR Calculation
```

### Step 1: Incident Acknowledgment
1. In the TradeOps Dashboard, navigate to **Incident Management** (`/incidents`).
2. Locate the firing incident and click **Acknowledge & Assign**.
3. Status transitions to `ACKNOWLEDGED` with timestamp recorded to prevent duplicate escalation.

### Step 2: Diagnostic Information Gathering
Execute non-destructive diagnostic scripts from the terminal or dashboard:
```bash
# Check service endpoint connectivity & status code
python scripts/diagnose_service.py http://127.0.0.1:8000/api/simulator/health

# Check host CPU, Memory, and top consuming processes
python scripts/check_system_resources.py

# Check PostgreSQL connection, active connections, and query execution plan
python scripts/check_database.py

# Summarize recent ERROR logs and frequency
python scripts/summarize_errors.py http://127.0.0.1:8000
```

### Step 3: Mitigation & Corrective Actions
- **If Gateway Latency is High**:
  - Inspect `scripts/summarize_errors.py` for connection timeouts or backpressure.
  - Verify whether fault injection mode was left armed in `/simulator` or via API.
- **If Database is Degraded**:
  - Run `scripts/check_database.py` to inspect active connections.
  - Check for lock contention or long-running queries in `pg_stat_activity`.
- **If Service is Down (HTTP 500)**:
  - Check application logs via `/logs` filtering for `severity=ERROR`.
  - Isolate root cause before attempting container or service restarts.

### Step 4: Verification of Recovery
1. The Monitoring Engine probes every 5 seconds.
2. Ensure at least **2 consecutive successful probes** occur.
3. Observe probe latency normalizing below 200ms in the **Service Monitoring** dashboard (`/services`).

### Step 5: Incident Resolution & Post-Mortem
1. In the Incident drawer, click **Resolve Incident**.
2. Enter the documented **Root Cause Explanation** (e.g., "Exchange gateway circuit breaker tripped due to simulated latency spike").
3. Enter the **Corrective Resolution Actions** taken.
4. Status transitions to `RESOLVED`, automatically stamping `resolved_at` and computing `mttr_seconds`.

---

## 3. SQL Troubleshooting Playbook

### Query 1: Find Active Unresolved Incidents Ranked by Severity
```sql
SELECT incident_number, service_name, severity, status, created_at,
       ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60, 1) AS open_duration_minutes
FROM incidents
WHERE status IN ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING')
ORDER BY CASE severity WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END, created_at ASC;
```

### Query 2: Identify Most Failing Services in the Last 1 Hour
```sql
SELECT s.name, h.status, count(*) AS failure_count,
       ROUND(AVG(h.latency_ms)::numeric, 2) AS avg_latency_ms
FROM health_checks h
JOIN monitored_services s ON h.service_id = s.id
WHERE h.status IN ('down', 'degraded')
  AND h.timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY s.name, h.status
ORDER BY failure_count DESC;
```

### Query 3: Analyze Order Execution Throughput & Failures
```sql
SELECT symbol, status, count(*) AS count,
       ROUND(AVG(execution_delay_ms)::numeric, 2) AS avg_matching_delay_ms
FROM trading_orders
GROUP BY symbol, status
ORDER BY symbol, count DESC;
```

### Query 4: Index Scan Verification with EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE
SELECT * FROM trading_orders
WHERE symbol = 'AAPL' AND status = 'EXECUTED'
ORDER BY created_at DESC
LIMIT 10;
```

