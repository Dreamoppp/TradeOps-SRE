from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

# HTTP Metrics
HTTP_REQUESTS_TOTAL = Counter(
    "tradeops_http_requests_total",
    "Total HTTP requests received",
    ["method", "path", "status"]
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "tradeops_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

HTTP_ERRORS_TOTAL = Counter(
    "tradeops_http_errors_total",
    "Total HTTP 5xx errors",
    ["path", "status"]
)

# Service Probing & Availability
SERVICE_UP = Gauge(
    "tradeops_service_up",
    "Monitored service availability (1 = up, 0 = down/degraded)",
    ["service_name"]
)

SERVICE_LATENCY_MS = Gauge(
    "tradeops_service_latency_ms",
    "Monitored service probe latency in milliseconds",
    ["service_name"]
)

DB_QUERY_DURATION_SECONDS = Histogram(
    "tradeops_db_query_duration_seconds",
    "Database probe query latency in seconds",
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1.0]
)

# System Metrics
SYSTEM_CPU_PERCENT = Gauge(
    "tradeops_system_cpu_percent",
    "Host system CPU utilization percentage"
)

SYSTEM_MEMORY_PERCENT = Gauge(
    "tradeops_system_memory_percent",
    "Host system RAM utilization percentage"
)

SYSTEM_DISK_PERCENT = Gauge(
    "tradeops_system_disk_percent",
    "Host system Disk utilization percentage"
)

# Incident Metrics
ACTIVE_INCIDENTS = Gauge(
    "tradeops_active_incidents",
    "Number of active open or acknowledged incidents",
    ["severity"]
)

# Trading Simulator Metrics
TRADING_ORDERS_TOTAL = Counter(
    "tradeops_trading_orders_total",
    "Total simulated trading orders processed",
    ["status", "symbol", "side"]
)

TRADING_ORDER_EXECUTION_LATENCY_SECONDS = Histogram(
    "tradeops_trading_order_execution_latency_seconds",
    "Simulated execution matching latency",
    ["symbol"],
    buckets=[0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
)

