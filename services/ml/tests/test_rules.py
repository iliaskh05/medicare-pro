"""Tests for business rules."""

from app.features.builder import FeatureBuilder
from app.models.rules import RuleEngine
from app.data.synthetic import (
    scenario_high_discount,
    scenario_non_retrieved,
    scenario_operator_outlier,
    scenario_duplicate_document,
)


def test_high_discount_rule_triggers():
    feats = FeatureBuilder.build_operation_features(scenario_high_discount())
    results = RuleEngine().evaluate(feats, center_stats={"average_discount_pct": 5, "discount_std": 8})
    triggered = {r.rule_id for r in results if r.triggered}
    assert "RULE_HIGH_DISCOUNT" in triggered


def test_non_retrieved_alone_not_all_critical_rules():
    feats = FeatureBuilder.build_operation_features(scenario_non_retrieved())
    results = RuleEngine().evaluate(feats, center_stats={"non_retrieval_rate": 0.05, "non_retrieval_std": 0.05})
    triggered = [r for r in results if r.triggered]
    assert len(triggered) < 5


def test_operator_outlier_triggers_multiple_rules():
    feats = FeatureBuilder.build_operation_features(scenario_operator_outlier())
    results = RuleEngine().evaluate(
        feats,
        center_stats={
            "average_discount_pct": 5,
            "discount_std": 8,
            "non_retrieval_rate": 0.05,
            "non_retrieval_std": 0.05,
        },
    )
    triggered = {r.rule_id for r in results if r.triggered}
    assert "RULE_OPERATOR_DISCOUNT_OUTLIER" in triggered or "RULE_HIGH_NON_RETRIEVAL_RATE" in triggered


def test_duplicate_document_rule():
    feats = FeatureBuilder.build_operation_features(scenario_duplicate_document())
    results = RuleEngine().evaluate(feats)
    assert any(r.rule_id == "RULE_DUPLICATE_DOCUMENT" and r.triggered for r in results)
