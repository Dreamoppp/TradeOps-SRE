import pytest

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_metrics_endpoint(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "tradeops_http_requests_total" in response.text

def test_services_list(client):
    response = client.get("/api/services")
    assert response.status_code == 200
    services = response.json()
    assert isinstance(services, list)
    assert len(services) >= 1
    assert any(s["name"] == "TradeOps Core API" for s in services)

def test_system_diagnostics(client):
    response = client.get("/api/diagnostics/system")
    assert response.status_code == 200
    data = response.json()
    assert data["check_type"] == "SYSTEM_RESOURCES"
    assert "cpu_percent" in data["data"]
    assert "memory_percent" in data["data"]
