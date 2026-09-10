from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_model_metrics_endpoint():
    response = client.get("/prediction/metrics")

    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert "accuracy" in body
    assert "precision" in body
    assert "recall" in body
    assert "f1_score" in body
