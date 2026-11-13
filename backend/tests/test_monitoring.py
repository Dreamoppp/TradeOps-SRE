import pytest
from app.monitoring.probes import collect_host_system_metrics

def test_collect_host_system_metrics():
    # Verify psutil metric collection executes without error
    collect_host_system_metrics()

def test_analytics_overview(client):
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "services" in data
    assert "incidents" in data
    assert "orders" in data
    assert "availability_percentage" in data["services"]

def test_logs_api(client):
    response = client.get("/api/logs?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert "total" in data

def test_alertmanager_webhook(client):
    payload = {
        "status": "firing",
        "alerts": [
            {
                "status": "firing",
                "labels": {
                    "alertname": "ServiceDown",
                    "severity": "P1",
                    "service": "Simulated Order Gateway"
                },
                "annotations": {
                    "summary": "Gateway probe failure"
                }
            }
        ]
    }
    response = client.post("/api/alerts/webhook", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

