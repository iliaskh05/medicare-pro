"""Tests for feature engineering."""

import numpy as np

from app.features.builder import FeatureBuilder
from app.data.synthetic import scenario_high_discount, scenario_normal


def test_discount_percentage_computed_from_catalogue():
    op = scenario_high_discount()
    feats = FeatureBuilder.build_operation_features(op)
    assert feats["discount_percentage"] == 60.0
    assert feats["discount_amount"] == 600.0


def test_billed_to_catalogue_ratio():
    op = scenario_normal()
    feats = FeatureBuilder.build_operation_features(op)
    assert feats["billed_to_catalogue_ratio"] == 1.0


def test_numeric_vector_length():
    op = scenario_normal()
    feats = FeatureBuilder.build_operation_features(op)
    vec = FeatureBuilder.to_numeric_vector(feats)
    assert vec.shape[0] >= 40


def test_missing_values_default_safely():
    feats = FeatureBuilder.build_operation_features({})
    vec = FeatureBuilder.to_numeric_vector(feats)
    assert len(vec) > 0
    assert not any(np.isnan(v) for v in vec)
