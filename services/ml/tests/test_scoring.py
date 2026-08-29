"""Tests for scoring and scenarios."""

from app.engine import AnomalyDetectionEngine
from app.storage.model_registry import ModelRegistry
from app.training.train import train_from_operations
from app.data.synthetic import (
    all_scenarios,
    synthetic_training_operations,
)


def test_train_and_score(tmp_models_dir):
    registry = ModelRegistry(tmp_models_dir)
    ops = synthetic_training_operations()
    bundle = train_from_operations(ops, version="fraud-v1", registry=registry)
    assert bundle.version == "fraud-v1"
    assert bundle.sample_count == len(ops)

    engine = AnomalyDetectionEngine(registry=registry)
    normal = engine.score_operation(all_scenarios()["NORMAL"])
    high_disc = engine.score_operation(all_scenarios()["HIGH_DISCOUNT"])
    non_ret = engine.score_operation(all_scenarios()["NON_RETRIEVED"])
    op_out = engine.score_operation(all_scenarios()["OPERATOR_OUTLIER"])

    assert normal["decision"] == "pending"
    assert high_disc["score"] > normal["score"]
    assert op_out["score"] > normal["score"]
    assert len(op_out["triggered_rules"]) >= len(non_ret["triggered_rules"])


def test_niveau_mapping(tmp_models_dir):
    registry = ModelRegistry(tmp_models_dir)
    train_from_operations(synthetic_training_operations(), registry=registry)
    engine = AnomalyDetectionEngine(registry=registry)
    result = engine.score_operation(all_scenarios()["OPERATOR_OUTLIER"])
    assert result["niveau"] in {"faible", "modéré", "moyen", "élevé", "critique"}


def test_registry_versions(tmp_models_dir):
    registry = ModelRegistry(tmp_models_dir)
    train_from_operations(synthetic_training_operations(), version="fraud-v1", registry=registry)
    train_from_operations(synthetic_training_operations(), version="fraud-v2", registry=registry)
    versions = registry.list_versions()
    assert "fraud-v1" in versions
    assert "fraud-v2" in versions
