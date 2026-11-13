# TradeOps — Trading Platform Monitoring & Incident Management System

**TradeOps** is a production-style observability, automated telemetry, and incident management platform designed for fintech and electronic trading environments. Built as a serious Computer Engineering portfolio project, it demonstrates the real-world operational workflows of a **Production Support Engineer** and **Site Reliability Engineer (SRE)**.

---

## 🌟 Key Capabilities

- **Trading Service Simulator**: Synthetic order matching gateway supporting `PENDING`, `VALIDATED`, `REJECTED`, `EXECUTED`, `CANCELLED`, and `FAILED` states. Features pre-trade risk validation, client order idempotency keys, request correlation IDs, and realistic matching delays.
- **Controlled Chaos Fault Injection**: SRE control center allowing controlled simulation of gateway outages (HTTP 500), matching delay spikes (100–2500ms), and error-rate degradation to test monitoring and alerts.
- **Real-Time Telemetry & Health Probing**: Autonomous background engine continuously evaluating HTTP endpoints, database heartbeats (`SELECT 1`), and OS system metrics (CPU%, RAM%, Disk% via `psutil`).
- **Incident Response State Machine**: Complete operational lifecycle from detection through resolution:
  $$\text{OPEN} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{INVESTIGATING} \longrightarrow \text{RESOLVED} \longrightarrow \text{CLOSED}$$
- **Incident Deduplication & Auto-Recovery**: Prevents duplicate alerts for the same active failure; automatically detects consecutive healthy probes to confirm recovery and record evidence.
- **Quantitative SRE Performance (MTTD / MTTR)**: Tracks Mean Time To Detect (MTTD) and Mean Time To Resolve (MTTR) with automated post-mortem reporting.
- **Centralized Structured JSON Logging**: Standard JSON formatted logging capturing request IDs, correlation IDs, timestamps, and service names with a searchable Log Explorer.
- **Prometheus & Grafana Observability**: Pre-configured Prometheus metrics exposition (`/metrics`), Alertmanager webhook correlation, and provisioned Grafana dashboards.
- **PostgreSQL 18 Persistence**: Fully normalized relational schema with Alembic migrations, foreign key constraints, connection pooling, and B-tree compound indexes.
- **Modern Dark-Themed Operations Console**: React 18 + Tailwind CSS single-page application with 8 operational views, live telemetry graphs (Recharts), and role-based access control (Admin / Engineer).

---

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript/JSX, Vite 6, Tailwind CSS, Recharts, Axios, Lucide React, React Router 6.
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, PostgreSQL 18 / Psycopg2, Prometheus Python Client, `psutil`.
- **Infrastructure & Monitoring**: Prometheus, Grafana, Alertmanager, Docker, Docker Compose, Linux Bash & Python diagnostic scripts.
- **Testing**: Pytest, HTTPX, Vitest.

---

## 🚀 Quick Startup Guide

### Option A: Local Native Startup (Recommended on Windows without Docker)

#### Prerequisites
- Python 3.12+ (Python 3.13 supported)
- Node.js 18+ and npm
- PostgreSQL running locally on `localhost:5432` with database `tradeops`

#### 1. Backend Setup & Run
```powershell
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Apply Alembic database migrations
python -m alembic upgrade head

# Start FastAPI backend server (Runs on port 8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Backend API will be running at `http://localhost:8000`.  
Interactive Swagger docs: `http://localhost:8000/docs`  
Prometheus metrics: `http://localhost:8000/metrics`

#### 2. Frontend Setup & Run
Open a second terminal window:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

### Option B: Docker Compose Startup

When Docker Desktop is installed and running:
```bash
docker compose up --build -d
docker compose ps
docker compose logs -f
```

### Access URLs:
| Service | URL | Default Credentials |
| :--- | :--- | :--- |
| **TradeOps Web Dashboard** | `http://localhost:5173` | — |
| **FastAPI Backend & Docs** | `http://localhost:8000/docs` | — |
| **Prometheus Telemetry** | `http://localhost:9090` | — |
| **Grafana Dashboards** | `http://localhost:3000` | admin / admin |
| **Alertmanager UI** | `http://localhost:9093` | — |

---

## 🔐 Default Authentication Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin Lead** | `admin@tradeops.io` | `AdminPass123!` | Full control, fault injection, threshold editing |
| **Production Support Engineer** | `engineer@tradeops.io` | `EngineerPass123!` | Incident triage, order execution, diagnostics |

*(You can toggle between roles directly in the top-right profile dropdown in the UI).*

---

## 🧪 Testing & Verification Suite

### 1. Run Automated Backend Pytest Suite (17 Tests)
```bash
cd backend
python -m pytest -v
```
Verifies health probes, Prometheus metrics, incident lifecycle, deduplication, order placement idempotency, fault injection, and JWT security.

### 2. Run Live End-to-End Reliability Demonstration (14 Steps)
```bash
python scripts/verify_failure_scenarios.py
```
Executes the full 14-step automated verification:
1. Verifies initial simulator health (200 OK)
2. Arms controlled fault injection (HTTP 500 outage)
3. Detects failure through real health check probe
4. Confirms automated incident declaration in PostgreSQL
5. Inspects Prometheus metrics exposition (`tradeops_service_up`)
6. Correlates Alertmanager alert with incident timeline
7. Executes diagnostic snapshot and inspects error logs
8. Acknowledges incident and assigns engineer
9. Restores service health (disarms fault injection)
10. Verifies probe recovery and normal latency
11. Resolves incident with root cause documentation
12. Measures MTTR and generates complete post-mortem report

### 3. Run Safe SRE Diagnostic Scripts
```bash
# Service connectivity & latency diagnostic
python scripts/diagnose_service.py http://127.0.0.1:8000/health

# Host CPU, Memory, and Top Processes diagnostic
python scripts/check_system_resources.py

# PostgreSQL diagnostic & EXPLAIN ANALYZE demonstration
python scripts/check_database.py

# Structured log error frequency analyzer
python scripts/summarize_errors.py http://127.0.0.1:8000
```

---

## 📚 Technical Documentation

- **System Architecture**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Interactive REST API Reference**: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)
- **Production Incident Runbook**: [`docs/INCIDENT_RUNBOOK.md`](docs/INCIDENT_RUNBOOK.md)
- **Complete Test & Verification Report**: [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md)
- **Technical Interview Explanation**: [`docs/INTERVIEW_EXPLANATION.md`](docs/INTERVIEW_EXPLANATION.md)

---

## ⚠️ Portfolio & Safety Notice
This project is engineered strictly for local demonstration and Computer Engineering portfolio evaluation. All market instruments, financial orders, and outages are explicitly simulated. No live financial trading or brokerage APIs are integrated.
