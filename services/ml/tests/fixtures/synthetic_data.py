"""Re-export synthetic fixtures for tests."""

from app.data.synthetic import (
    all_scenarios,
    scenario_duplicate_document,
    scenario_high_discount,
    scenario_non_retrieved,
    scenario_normal,
    scenario_operator_outlier,
    scenario_temporal_anomaly,
    synthetic_training_operations,
)

__all__ = [
    "all_scenarios",
    "scenario_normal",
    "scenario_high_discount",
    "scenario_non_retrieved",
    "scenario_operator_outlier",
    "scenario_duplicate_document",
    "scenario_temporal_anomaly",
    "synthetic_training_operations",
]
