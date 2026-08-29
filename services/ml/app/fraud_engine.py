"""Legacy adapter — maps old fraud API payloads to the new anomaly engine."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.engine import get_engine


def default_training_rows() -> list[dict[str, Any]]:
    from app.data.synthetic import synthetic_training_operations

    return synthetic_training_operations()


class HybridFraudEngine:
    """Backward-compatible wrapper around AnomalyDetectionEngine."""

    version: str = "fraud-legacy-adapter-v2"

    def __init__(self) -> None:
        self._engine = get_engine()
        self.version = self._engine.info().get("model_version", self.version)

    @classmethod
    def train(cls, rows: list[dict[str, Any]]) -> "HybridFraudEngine":
        engine = get_engine()
        operations = [_legacy_to_operation(r) for r in rows]
        engine.train(operations)
        instance = cls()
        instance.version = engine.info().get("model_version", cls.version)
        return instance

    def score(self, row: dict[str, Any]) -> dict[str, Any]:
        result = self._engine.score_operation(_legacy_to_operation(row))
        return {
            "invoiceId": result.get("operation_id"),
            "patientName": row.get("patient") or row.get("patientName") or "",
            "amount": float(row.get("total") or row.get("amount") or 0),
            "score": result["score"],
            "niveau": result["niveau"],
            "raison": result.get("reasons", []),
            "unsupervised": {
                "clusterId": result.get("cluster_id"),
                "anomalyDistance": result.get("cluster_distance"),
                "isWeakSignal": bool(result.get("isolation_anomaly")),
            },
            "supervised": {"probability": None, "modelVersion": result.get("model_version")},
            "decision": "pending",
            "scoredAt": datetime.now(timezone.utc).isoformat(),
        }


def _legacy_to_operation(row: dict[str, Any]) -> dict[str, Any]:
    total = float(row.get("total") or row.get("amount") or 0)
    catalogue = float(row.get("catalogue_price") or row.get("cataloguePrice") or total or 1000)
    return {
        "operation_id": str(row.get("id") or row.get("invoiceId") or "UNK"),
        "patient": row.get("patient") or row.get("patientName"),
        "exam_type": row.get("examen") or row.get("examType"),
        "catalogue_price": catalogue,
        "billed_amount": total,
        "invoice_total": total,
        "insurance_share": float(row.get("partMutuelle") or row.get("mutuelleShare") or 0),
        "patient_exam_count_30d": row.get("examsLast30Days"),
        "same_exam_count_30d": row.get("daysSinceLastSameExam"),
        "document_hash_duplicate_count": row.get("isDuplicate"),
        "discount_percentage": max(0.0, (1 - total / catalogue) * 100) if catalogue > 0 else 0,
        "discount_amount": max(0.0, catalogue - total),
    }
