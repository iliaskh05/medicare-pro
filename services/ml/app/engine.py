"""Anomaly detection engine — orchestrates features, ML models, rules and scoring."""

from __future__ import annotations

import logging
import os
import time
from typing import Any

from app.config import SETTINGS
from app.features.builder import FeatureBuilder
from app.models.rules import RuleEngine
from app.models.scoring import ScoringEngine
from app.storage.model_registry import ModelBundle, ModelRegistry
from app.training.train import train_from_operations

logger = logging.getLogger("medicare.ml.engine")


class AnomalyDetectionEngine:
    """Singleton-friendly engine with in-memory model cache."""

    def __init__(self, registry: ModelRegistry | None = None) -> None:
        self.registry = registry or ModelRegistry()
        self.rule_engine = RuleEngine(SETTINGS.rules)
        self.scoring_engine = ScoringEngine(SETTINGS.weights)
        self._bundle: ModelBundle | None = None

    def _ensure_bundle(self) -> ModelBundle:
        if self._bundle is None:
            try:
                self._bundle = self.registry.load()
            except FileNotFoundError:
                logger.warning("No persisted model found — training bootstrap model")
                from app.data.synthetic import synthetic_training_operations

                self._bundle = train_from_operations(synthetic_training_operations(), registry=self.registry)
        return self._bundle

    def reload(self, version: str | None = None) -> None:
        self._bundle = self.registry.load(version)

    def info(self) -> dict[str, Any]:
        bundle = self._ensure_bundle()
        return {
            "model_version": bundle.version,
            "trained_at": bundle.trained_at,
            "sample_count": bundle.sample_count,
            "feature_count": len(bundle.feature_names),
            "metrics": bundle.metrics,
            "config": bundle.config,
            "center_stats": bundle.center_stats,
            "available_versions": self.registry.list_versions(),
        }

    def score_operation(self, operation: dict[str, Any]) -> dict[str, Any]:
        started = time.perf_counter()
        bundle = self._ensure_bundle()

        features = FeatureBuilder.build_operation_features(operation, center_stats=bundle.center_stats)
        vector = FeatureBuilder.to_numeric_vector(features).reshape(1, -1)
        X = bundle.scaler.transform(vector)

        cluster_result = bundle.cluster_model.predict(X)[0]
        isolation_result = bundle.anomaly_model.predict(X)[0]
        rule_results = self.rule_engine.evaluate(features, center_stats=bundle.center_stats)

        breakdown = self.scoring_engine.combine(
            cluster_model=bundle.cluster_model,
            cluster_distance=cluster_result.distance_to_centroid,
            isolation=isolation_result,
            rule_results=rule_results,
        )

        operation_id = str(
            operation.get("operation_id")
            or operation.get("operationId")
            or operation.get("id")
            or operation.get("invoiceId")
            or "UNKNOWN"
        )

        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        result = {
            "operation_id": operation_id,
            "anomaly_score": breakdown.final_score,
            "score": breakdown.final_score,
            "niveau": breakdown.niveau,
            "cluster_id": int(cluster_result.cluster_id),
            "cluster_distance": round(float(cluster_result.distance_to_centroid), 3),
            "isolation_anomaly": bool(isolation_result.isolation_anomaly),
            "isolation_score": float(isolation_result.isolation_score),
            "cluster_component": round(breakdown.cluster_component, 2),
            "isolation_component": round(breakdown.isolation_component, 2),
            "rules_component": round(breakdown.rules_component, 2),
            "triggered_rules": breakdown.triggered_rules,
            "reasons": breakdown.reasons,
            "decision": "pending",
            "model_version": bundle.version,
            "features": {
                "discount_percentage": float(features.get("discount_percentage") or 0),
                "operator_non_retrieval_rate": float(features.get("operator_non_retrieval_rate") or 0),
                "operator_discount_rate": float(features.get("operator_discount_rate") or 0),
                "dossier_not_retrieved": bool(features.get("dossier_not_retrieved")),
                "price_deviation": float(features.get("price_deviation") or 0),
            },
            "latency_ms": latency_ms,
        }

        logger.info(
            "score operation_id=%s model_version=%s score=%s niveau=%s latency_ms=%s",
            operation_id,
            bundle.version,
            breakdown.final_score,
            breakdown.niveau,
            latency_ms,
        )
        return result

    def score_batch(self, operations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        max_batch = int(os.getenv("ML_MAX_BATCH_SIZE", str(SETTINGS.max_batch_size)))
        if len(operations) > max_batch:
            raise ValueError(f"Batch size {len(operations)} exceeds limit {max_batch}")
        return [self.score_operation(op) for op in operations]

    def train(self, operations: list[dict[str, Any]], version: str | None = None) -> dict[str, Any]:
        bundle = train_from_operations(operations, version=version, registry=self.registry)
        self._bundle = bundle
        return bundle.to_metadata()


# Module-level singleton
_ENGINE: AnomalyDetectionEngine | None = None


def get_engine() -> AnomalyDetectionEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = AnomalyDetectionEngine()
    return _ENGINE
