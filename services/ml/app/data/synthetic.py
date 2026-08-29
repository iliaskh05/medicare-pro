"""Synthetic training/scoring data — TEST / BOOTSTRAP ONLY, not real centre data."""

from __future__ import annotations

from typing import Any


def _base_normal(i: int = 0) -> dict[str, Any]:
    return {
        "operation_id": f"SYN-NORMAL-{i:03d}",
        "patient_id": 100 + i,
        "exam_id": 200 + i,
        "invoice_id": 300 + i,
        "operator_id": 1,
        "exam_type": "Scanner Thoracique",
        "modality": "CT",
        "catalogue_price": 1000,
        "billed_amount": 1000,
        "deposit_amount": 200,
        "amount_paid": 1000,
        "amount_refunded": 0,
        "discount_amount": 0,
        "discount_percentage": 0,
        "invoice_total": 1000,
        "insurance_share": 0,
        "patient_share": 1000,
        "dossier_not_retrieved": False,
        "document_uploaded": True,
        "document_reprint_count": 0,
        "document_hash_duplicate_count": 0,
        "patient_exam_count_30d": 1,
        "operator_discount_rate": 0.05,
        "operator_average_discount": 5.0,
        "operator_discount_std": 3.0,
        "operator_non_retrieval_rate": 0.05,
        "operator_cancellation_rate": 0.02,
        "operator_refund_rate": 0.01,
        "operator_modification_rate": 0.03,
        "invoice_modification_count": 0,
        "payment_method": "ESPECES",
        "exam_at": "2026-01-10T09:00:00",
        "invoice_at": "2026-01-10T09:15:00",
        "payment_at": "2026-01-10T10:00:00",
        "document_at": "2026-01-10T09:30:00",
        "dossier_retrieved_at": "2026-01-10T11:00:00",
    }


def scenario_normal() -> dict[str, Any]:
    return _base_normal(1)


def scenario_high_discount() -> dict[str, Any]:
    op = _base_normal(2)
    op.update(
        {
            "operation_id": "SYN-HIGH-DISCOUNT-001",
            "billed_amount": 400,
            "discount_amount": 600,
            "discount_percentage": 60,
            "amount_paid": 400,
        }
    )
    return op


def scenario_non_retrieved() -> dict[str, Any]:
    op = _base_normal(3)
    op.update(
        {
            "operation_id": "SYN-NON-RETRIEVED-001",
            "dossier_not_retrieved": True,
            "dossier_retrieved_at": None,
            "operator_non_retrieval_rate": 0.12,
        }
    )
    return op


def scenario_operator_outlier() -> dict[str, Any]:
    op = _base_normal(4)
    op.update(
        {
            "operation_id": "SYN-OPERATOR-OUTLIER-001",
            "discount_amount": 350,
            "discount_percentage": 35,
            "billed_amount": 650,
            "amount_paid": 650,
            "dossier_not_retrieved": True,
            "operator_discount_rate": 0.35,
            "operator_average_discount": 32.0,
            "operator_non_retrieval_rate": 0.65,
            "operator_modification_rate": 0.25,
            "operator_cancellation_rate": 0.18,
            "invoice_modification_count": 4,
        }
    )
    return op


def scenario_duplicate_document() -> dict[str, Any]:
    op = _base_normal(5)
    op.update(
        {
            "operation_id": "SYN-DUPLICATE-DOC-001",
            "document_hash_duplicate_count": 2,
            "duplicate_document_count": 2,
        }
    )
    return op


def scenario_temporal_anomaly() -> dict[str, Any]:
    op = _base_normal(6)
    op.update(
        {
            "operation_id": "SYN-TEMPORAL-001",
            "exam_at": "2026-01-10T10:00:00",
            "invoice_at": "2026-01-10T09:00:00",
            "payment_at": "2026-01-09T08:00:00",
        }
    )
    return op


def synthetic_training_operations() -> list[dict[str, Any]]:
    """Diverse synthetic batch for bootstrapping unsupervised models."""
    ops: list[dict[str, Any]] = []
    for i in range(20):
        op = _base_normal(i)
        op["operation_id"] = f"SYN-TRAIN-{i:03d}"
        op["catalogue_price"] = 800 + (i % 5) * 100
        op["billed_amount"] = op["catalogue_price"] * (0.9 + (i % 3) * 0.03)
        op["discount_percentage"] = max(0, (1 - op["billed_amount"] / op["catalogue_price"]) * 100)
        op["operator_non_retrieval_rate"] = 0.03 + (i % 4) * 0.02
        ops.append(op)

    ops.extend(
        [
            scenario_high_discount(),
            scenario_operator_outlier(),
            scenario_duplicate_document(),
            scenario_temporal_anomaly(),
        ]
    )
    return ops


def all_scenarios() -> dict[str, dict[str, Any]]:
    return {
        "NORMAL": scenario_normal(),
        "HIGH_DISCOUNT": scenario_high_discount(),
        "NON_RETRIEVED": scenario_non_retrieved(),
        "OPERATOR_OUTLIER": scenario_operator_outlier(),
        "DUPLICATE_DOCUMENT": scenario_duplicate_document(),
        "TEMPORAL_ANOMALY": scenario_temporal_anomaly(),
    }
