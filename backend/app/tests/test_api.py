from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_create_and_list():
    r = client.post("/api/v1/merchants", json={"name": "Test", "description": "D"})
    assert r.status_code == 200
    r = client.get("/api/v1/merchants")
    assert r.status_code == 200
    merchants = r.json()
    assert isinstance(merchants, list) and len(merchants) >= 1

    r = client.post("/api/v1/customers", json={"wallet": "0xABC"})
    assert r.status_code == 200

    r = client.post("/api/v1/redemptions", json={"customer_wallet": "0xABC", "points": 5})
    assert r.status_code == 200
