"""API integration tests."""

from fastapi.testclient import TestClient

from app.data.synthetic import scenario_normal, synthetic_training_operations
from app.main import app


def test_health_endpoint():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert "model_version" in body


def test_model_info_and_score(tmp_models_dir):
    client = TestClient(app)

    train_res = client.post("/train", json={"operations": synthetic_training_operations(), "version": "fraud-v1"})
    assert train_res.status_code == 200

    info_res = client.get("/model/info")
    assert info_res.status_code == 200
    assert info_res.json()["data"]["model_version"] == "fraud-v1"

    score_res = client.post("/score", json=scenario_normal())
    assert score_res.status_code == 200
    data = score_res.json()["data"]
    assert data["decision"] == "pending"
    assert "score" in data
    assert "triggered_rules" in data


def test_batch_score_limit(tmp_models_dir, monkeypatch):
    monkeypatch.setenv("ML_MAX_BATCH_SIZE", "2")
    import app.engine as engine_module

    engine_module._ENGINE = None

    client = TestClient(app)
    client.post("/train", json={"operations": synthetic_training_operations()})
    res = client.post("/score/batch", json={"operations": [scenario_normal()] * 3})
    assert res.status_code == 400


def test_legacy_fraud_score():
    client = TestClient(app)
    res = client.post(
        "/fraud/score",
        json={
            "id": "FCT-TEST",
            "patient": "Test Patient",
            "examen": "Scanner",
            "total": 1000,
            "partMutuelle": 0,
            "catalogue_price": 1000,
        },
    )
    assert res.status_code == 200
    assert res.json()["data"]["decision"] == "pending"
