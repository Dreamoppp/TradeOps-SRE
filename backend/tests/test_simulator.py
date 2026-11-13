import uuid
import pytest

def test_simulator_health(client):
    response = client.get("/api/simulator/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_order_validation_success(client):
    payload = {
        "symbol": "AAPL",
        "side": "BUY",
        "order_type": "LIMIT",
        "quantity": 10,
        "price": 180.0
    }
    response = client.post("/api/simulator/orders/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["estimated_notional"] == 1800.0

def test_order_validation_invalid_symbol(client):
    payload = {
        "symbol": "UNKNOWNXYZ",
        "side": "BUY",
        "order_type": "LIMIT",
        "quantity": 10,
        "price": 100.0
    }
    response = client.post("/api/simulator/orders/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert "Unsupported trading symbol" in data["rejection_reason"]

def test_order_placement_and_idempotency(client):
    client_order_id = f"test-ord-{uuid.uuid4().hex[:8]}"
    payload = {
        "client_order_id": client_order_id,
        "symbol": "MSFT",
        "side": "BUY",
        "order_type": "LIMIT",
        "quantity": 5,
        "price": 420.0
    }
    # First placement
    res1 = client.post("/api/simulator/orders", json=payload)
    assert res1.status_code == 201
    ord1 = res1.json()
    assert ord1["status"] in ["EXECUTED", "VALIDATED"]
    assert ord1["client_order_id"] == client_order_id

    # Second placement with identical client_order_id (Idempotency verification)
    res2 = client.post("/api/simulator/orders", json=payload)
    assert res2.status_code == 201
    ord2 = res2.json()
    assert ord2["id"] == ord1["id"] # Same order returned!
    assert ord2["client_order_id"] == client_order_id

def test_fault_injection_lifecycle(client):
    # 1. Enable fault injection
    fault_config = {
        "enabled": True,
        "fail_all_orders": True,
        "injected_latency_ms": 100,
        "fail_database": False,
        "error_rate_percent": 100,
        "high_cpu_simulation": False
    }
    res = client.post("/api/simulator/fault-injection", json=fault_config)
    assert res.status_code == 200
    assert res.json()["enabled"] is True

    # Check simulator health now returns 500
    health_res = client.get("/api/simulator/health")
    assert health_res.status_code == 500

    # Reset fault injection
    fault_config["enabled"] = False
    fault_config["fail_all_orders"] = False
    fault_config["error_rate_percent"] = 0
    client.post("/api/simulator/fault-injection", json=fault_config)

    # Simulator health recovers
    health_res2 = client.get("/api/simulator/health")
    assert health_res2.status_code == 200
    assert health_res2.json()["status"] == "healthy"
