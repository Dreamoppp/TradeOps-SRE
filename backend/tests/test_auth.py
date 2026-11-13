import pytest

def test_auth_login_admin(client):
    response = client.post("/api/auth/login", json={
        "email": "admin@tradeops.io",
        "password": "AdminPass123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@tradeops.io"
    assert data["user"]["role"] == "admin"

def test_auth_login_invalid(client):
    response = client.post("/api/auth/login", json={
        "email": "admin@tradeops.io",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401

