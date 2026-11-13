import uuid
import pytest

def test_incident_lifecycle(client):
    # 1. Create incident
    title = f"Test Gateway Latency Spike {uuid.uuid4().hex[:6]}"
    payload = {
        "title": title,
        "service_name": "Simulated Order Gateway",
        "severity": "P2",
        "notes": "Spike detected in test probe"
    }
    create_res = client.post("/api/incidents", json=payload)
    assert create_res.status_code == 201
    inc = create_res.json()
    inc_id = inc["id"]
    assert inc["status"] == "OPEN"
    assert inc["severity"] == "P2"
    assert inc["incident_number"].startswith("INC-")

    # 2. Acknowledge incident
    ack_res = client.patch(f"/api/incidents/{inc_id}", json={"status": "ACKNOWLEDGED", "assigned_to": "engineer@tradeops.io"})
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"
    assert ack_res.json()["assigned_to"] == "engineer@tradeops.io"

    # 3. Add investigating notes
    inv_res = client.patch(f"/api/incidents/{inc_id}", json={
        "status": "INVESTIGATING",
        "notes": "Investigating potential network packet loss or matching engine queue backup",
        "root_cause": "TCP socket congestion on gateway ingress"
    })
    assert inv_res.status_code == 200
    assert inv_res.json()["status"] == "INVESTIGATING"

    # 4. Resolve incident
    res_res = client.patch(f"/api/incidents/{inc_id}", json={
        "status": "RESOLVED",
        "resolution": "Applied socket buffer tuning and cleared queued backlog"
    })
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "RESOLVED"
    assert res_res.json()["mttr_seconds"] is not None

    # 5. Verify timeline events exist
    get_res = client.get(f"/api/incidents/{inc_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert len(data["events"]) >= 4

def test_incident_deduplication(client):
    # When creating an incident for a service that already has an OPEN incident
    svc_name = f"TestSvc-{uuid.uuid4().hex[:6]}"
    p1 = {"title": "First outage", "service_name": svc_name, "severity": "P1"}
    r1 = client.post("/api/incidents", json=p1)
    assert r1.status_code == 201
    inc1 = r1.json()

    p2 = {"title": "Second outage identical service", "service_name": svc_name, "severity": "P1"}
    r2 = client.post("/api/incidents", json=p2)
    assert r2.status_code == 201
    inc2 = r2.json()

    # Deduplicated: r2 should return the same active incident id!
    assert inc2["id"] == inc1["id"]
