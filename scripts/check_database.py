#!/usr/bin/env python3
"""
TradeOps Database Troubleshooting & Diagnostics
Demonstrates:
1. Database connectivity & latency measurement
2. Table volume inspection
3. PostgreSQL EXPLAIN ANALYZE demonstration on incident & order indexes
"""
import os
import sys
import time
from sqlalchemy import create_engine, text

DB_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres@localhost:5432/tradeops")

def run_db_diagnostics():
    print(f"[*] Connecting to database at: {DB_URL}")
    try:
        engine = create_engine(DB_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            # 1. Heartbeat check
            start = time.perf_counter()
            conn.execute(text("SELECT 1")).fetchone()
            heartbeat_ms = round((time.perf_counter() - start) * 1000, 2)
            print(f"[+] Heartbeat probe successful. Roundtrip: {heartbeat_ms} ms")

            # 2. Table row count inspection
            print("\n[*] Table Row Counts:")
            tables = ["users", "monitored_services", "health_checks", "incidents", "incident_events", "trading_orders", "alert_records", "audit_logs"]
            for tbl in tables:
                try:
                    count = conn.execute(text(f"SELECT count(*) FROM {tbl}")).scalar()
                    print(f"    - {tbl:<20}: {count} records")
                except Exception as e:
                    print(f"    - {tbl:<20}: unavailable ({e})")

            # 3. Practical SQL Troubleshooting Query 1: Active Incidents by Severity
            print("\n[*] SQL Troubleshooting Query 1 — Active Unresolved Incidents:")
            q1 = text("""
                SELECT incident_number, service_name, severity, status, created_at,
                       ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60, 1) AS open_duration_minutes
                FROM incidents
                WHERE status IN ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING')
                ORDER BY CASE severity WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END, created_at ASC;
            """)
            rows1 = conn.execute(q1).fetchall()
            for r in rows1:
                print(f"    {r[0]} | {r[1]} | {r[2]} | {r[3]} | Open for {r[5]} mins")
            if not rows1:
                print("    (No active unresolved incidents)")

            # 4. Practical SQL Troubleshooting Query 2: Service Health Probe Failure Frequency
            print("\n[*] SQL Troubleshooting Query 2 — Recent Failed Health Probes (Last 1 hour):")
            q2 = text("""
                SELECT s.name, h.status, count(*) AS failure_count,
                       ROUND(AVG(h.latency_ms)::numeric, 2) AS avg_latency_ms
                FROM health_checks h
                JOIN monitored_services s ON h.service_id = s.id
                WHERE h.status IN ('down', 'degraded')
                  AND h.timestamp >= NOW() - INTERVAL '1 hour'
                GROUP BY s.name, h.status
                ORDER BY failure_count DESC;
            """)
            rows2 = conn.execute(q2).fetchall()
            for r in rows2:
                print(f"    Service: {r[0]} | Status: {r[1]} | Failures: {r[2]} | Avg Latency: {r[3]} ms")
            if not rows2:
                print("    (No service probe failures in the last 1 hour)")

            # 5. Practical SQL Troubleshooting Query 3: Order Execution State Breakdown
            print("\n[*] SQL Troubleshooting Query 3 — Simulated Order Volume & Status Summary:")
            q3 = text("""
                SELECT symbol, status, count(*) AS count,
                       ROUND(AVG(execution_delay_ms)::numeric, 2) AS avg_matching_delay_ms
                FROM trading_orders
                GROUP BY symbol, status
                ORDER BY symbol, count DESC;
            """)
            rows3 = conn.execute(q3).fetchall()
            for r in rows3:
                print(f"    Symbol: {r[0]:<8} | Status: {r[1]:<10} | Orders: {r[2]:<4} | Avg Delay: {r[3]} ms")
            if not rows3:
                print("    (No orders logged yet)")

            # 6. EXPLAIN ANALYZE Demonstration
            print("\n[*] PostgreSQL EXPLAIN ANALYZE Demonstration on Indexed Search Query:")
            explain_q = text("""
                EXPLAIN ANALYZE
                SELECT * FROM trading_orders
                WHERE symbol = 'AAPL' AND status = 'EXECUTED'
                ORDER BY created_at DESC
                LIMIT 10;
            """)
            explain_rows = conn.execute(explain_q).fetchall()
            for er in explain_rows:
                print(f"    {er[0]}")

            return 0
    except Exception as e:
        print(f"[-] Database Diagnostic Failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(run_db_diagnostics())

