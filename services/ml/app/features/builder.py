"""Feature builder — transforms raw operation payloads into documented features."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np

from .schema import NUMERIC_FEATURE_NAMES


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    if value is None or value == "":
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _safe_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).lower() in {"1", "true", "yes", "oui"}


def _minutes_between(start: Any, end: Any) -> float | None:
    if not start or not end:
        return None
    try:
        if isinstance(start, datetime):
            s = start
        else:
            s = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
        if isinstance(end, datetime):
            e = end
        else:
            e = datetime.fromisoformat(str(end).replace("Z", "+00:00"))
        return (e - s).total_seconds() / 60.0
    except (TypeError, ValueError):
        return None


def _ratio(numerator: float, denominator: float, default: float = 0.0) -> float:
    if denominator <= 0:
        return default
    return numerator / denominator


class FeatureBuilder:
    """Builds feature dictionaries and numeric vectors from operation payloads."""

    @staticmethod
    def build_operation_features(
        operation: dict[str, Any],
        center_stats: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Build full feature dict for one operation.

        Operator statistics in ``operation`` must already reflect history BEFORE
        this operation (computed by Spring Boot) to avoid data leakage.
        """
        center_stats = center_stats or operation.get("center_stats") or {}

        catalogue_price = _safe_float(
            operation.get("catalogue_price") or operation.get("cataloguePrice"),
            default=0.0,
        )
        billed_amount = _safe_float(
            operation.get("billed_amount")
            or operation.get("billedAmount")
            or operation.get("total")
            or operation.get("invoice_total"),
        )
        invoice_total = _safe_float(
            operation.get("invoice_total") or operation.get("invoiceTotal") or billed_amount,
        )
        discount_amount = _safe_float(
            operation.get("discount_amount")
            or operation.get("discountAmount")
            or operation.get("remise"),
        )
        if discount_amount == 0 and catalogue_price > 0 and billed_amount > 0:
            discount_amount = max(0.0, catalogue_price - billed_amount)

        discount_percentage = _safe_float(operation.get("discount_percentage") or operation.get("discountPercentage"))
        if discount_percentage == 0 and catalogue_price > 0:
            discount_percentage = _ratio(discount_amount, catalogue_price) * 100.0

        patient_share = _safe_float(operation.get("patient_share") or operation.get("patientShare"))
        amount_paid = _safe_float(operation.get("amount_paid") or operation.get("amountPaid"))
        amount_refunded = _safe_float(operation.get("amount_refunded") or operation.get("amountRefunded"))

        billed_to_catalogue_ratio = _ratio(billed_amount, catalogue_price, default=1.0)
        price_deviation = abs(billed_amount - catalogue_price) / catalogue_price * 100.0 if catalogue_price > 0 else 0.0

        exam_at = operation.get("exam_at") or operation.get("examAt")
        invoice_at = operation.get("invoice_at") or operation.get("invoiceAt") or operation.get("issued_at")
        payment_at = operation.get("payment_at") or operation.get("paymentAt")
        document_at = operation.get("document_at") or operation.get("documentAt")
        retrieval_at = operation.get("dossier_retrieved_at") or operation.get("dossierRetrievedAt")

        operator_discount_rate = _safe_float(
            operation.get("operator_discount_rate") or operation.get("operatorDiscountRate"),
        )
        operator_average_discount = _safe_float(
            operation.get("operator_average_discount") or operation.get("operatorAverageDiscount"),
        )
        operator_discount_std = _safe_float(
            operation.get("operator_discount_std") or operation.get("operatorDiscountStd"),
            default=5.0,
        )
        center_avg_discount = _safe_float(center_stats.get("average_discount_pct"), default=5.0)
        center_std_discount = _safe_float(center_stats.get("discount_std"), default=8.0)

        operator_non_retrieval_rate = _safe_float(
            operation.get("operator_non_retrieval_rate") or operation.get("operatorNonRetrievalRate"),
        )
        center_non_retrieval = _safe_float(center_stats.get("non_retrieval_rate"), default=0.05)

        operator_refund_rate = _safe_float(
            operation.get("operator_refund_rate") or operation.get("operatorRefundRate"),
        )
        center_refund_rate = _safe_float(center_stats.get("refund_rate"), default=0.03)

        features: dict[str, Any] = {
            # patient
            "patient_age": _safe_float(operation.get("patient_age") or operation.get("patientAge")),
            "patient_gender": str(operation.get("patient_gender") or operation.get("patientGender") or ""),
            "patient_insurance": str(
                operation.get("patient_insurance") or operation.get("patientInsurance") or operation.get("mutuelle") or ""
            ),
            "patient_visit_count_30d": _safe_int(
                operation.get("patient_visit_count_30d") or operation.get("patientVisitCount30d")
            ),
            "patient_exam_count_30d": _safe_int(
                operation.get("patient_exam_count_30d")
                or operation.get("patientExamCount30d")
                or operation.get("examsLast30Days")
            ),
            "patient_exam_count_90d": _safe_int(
                operation.get("patient_exam_count_90d") or operation.get("patientExamCount90d")
            ),
            "same_exam_count_30d": _safe_int(
                operation.get("same_exam_count_30d") or operation.get("sameExamCount30d")
            ),
            "same_exam_count_90d": _safe_int(
                operation.get("same_exam_count_90d") or operation.get("sameExamCount90d")
            ),
            # exam
            "exam_type": str(operation.get("exam_type") or operation.get("examType") or operation.get("examen") or ""),
            "modality": str(operation.get("modality") or ""),
            "catalogue_price": catalogue_price,
            "billed_amount": billed_amount,
            "deposit_amount": _safe_float(operation.get("deposit_amount") or operation.get("depositAmount")),
            "remaining_amount": _safe_float(
                operation.get("remaining_amount") or operation.get("remainingAmount") or max(0.0, invoice_total - amount_paid)
            ),
            "exam_status": str(operation.get("exam_status") or operation.get("examStatus") or ""),
            "priority": str(operation.get("priority") or ""),
            # billing
            "invoice_total": invoice_total,
            "insurance_share": _safe_float(operation.get("insurance_share") or operation.get("insuranceShare") or operation.get("partMutuelle")),
            "patient_share": patient_share if patient_share > 0 else max(0.0, invoice_total - _safe_float(operation.get("insurance_share") or operation.get("insuranceShare"))),
            "amount_paid": amount_paid,
            "amount_refunded": amount_refunded,
            "discount_amount": discount_amount,
            "discount_percentage": discount_percentage,
            "payment_method": str(operation.get("payment_method") or operation.get("paymentMethod") or operation.get("mode_paiement") or ""),
            "billed_to_catalogue_ratio": billed_to_catalogue_ratio,
            "patient_share_ratio": _ratio(patient_share, invoice_total),
            "paid_to_total_ratio": _ratio(amount_paid, invoice_total),
            "price_deviation": price_deviation,
            # time
            "exam_to_invoice_minutes": _minutes_between(exam_at, invoice_at),
            "exam_to_payment_minutes": _minutes_between(exam_at, payment_at),
            "invoice_to_payment_minutes": _minutes_between(invoice_at, payment_at),
            "exam_to_document_minutes": _minutes_between(exam_at, document_at),
            "document_to_retrieval_minutes": _minutes_between(document_at, retrieval_at),
            # dossier
            "dossier_status": str(operation.get("dossier_status") or operation.get("dossierStatus") or ""),
            "dossier_not_retrieved": _safe_bool(
                operation.get("dossier_not_retrieved") or operation.get("dossierNotRetrieved")
            ),
            "dossier_created_at": operation.get("dossier_created_at") or operation.get("dossierCreatedAt"),
            "dossier_retrieved_at": retrieval_at,
            "dossier_created_by": str(operation.get("dossier_created_by") or operation.get("dossierCreatedBy") or ""),
            "dossier_retrieved_by": str(operation.get("dossier_retrieved_by") or operation.get("dossierRetrievedBy") or ""),
            # documents
            "document_count": _safe_int(operation.get("document_count") or operation.get("documentCount")),
            "document_uploaded": _safe_bool(operation.get("document_uploaded") or operation.get("documentUploaded")),
            "document_uploaded_by": str(operation.get("document_uploaded_by") or operation.get("documentUploadedBy") or ""),
            "document_upload_delay": _safe_float(operation.get("document_upload_delay") or operation.get("documentUploadDelay")),
            "document_reprint_count": _safe_int(
                operation.get("document_reprint_count") or operation.get("documentReprintCount")
            ),
            "duplicate_document_count": _safe_int(
                operation.get("duplicate_document_count") or operation.get("duplicateDocumentCount")
            ),
            "document_hash_duplicate_count": _safe_int(
                operation.get("document_hash_duplicate_count") or operation.get("documentHashDuplicateCount")
                or operation.get("isDuplicate")
            ),
            # operator
            "operator_id": str(operation.get("operator_id") or operation.get("operatorId") or operation.get("created_by_id") or ""),
            "operator_average_discount": operator_average_discount,
            "operator_discount_std": operator_discount_std,
            "operator_discount_rate": operator_discount_rate,
            "operator_non_retrieval_rate": operator_non_retrieval_rate,
            "operator_cancellation_rate": _safe_float(
                operation.get("operator_cancellation_rate") or operation.get("operatorCancellationRate")
            ),
            "operator_refund_rate": operator_refund_rate,
            "operator_modification_rate": _safe_float(
                operation.get("operator_modification_rate") or operation.get("operatorModificationRate")
            ),
            "operator_reprint_rate": _safe_float(
                operation.get("operator_reprint_rate") or operation.get("operatorReprintRate")
            ),
            "operator_cash_payment_rate": _safe_float(
                operation.get("operator_cash_payment_rate") or operation.get("operatorCashPaymentRate")
            ),
            "operator_discount_deviation": (
                (discount_percentage - operator_average_discount) / max(operator_discount_std, 1.0)
                if operator_average_discount > 0
                else (discount_percentage - center_avg_discount) / max(center_std_discount, 1.0)
            ),
            "operator_non_retrieval_deviation": (
                operator_non_retrieval_rate - center_non_retrieval
            ) / max(_safe_float(center_stats.get("non_retrieval_std"), default=0.05), 0.01),
            "operator_refund_deviation": (operator_refund_rate - center_refund_rate) / max(
                _safe_float(center_stats.get("refund_std"), default=0.02), 0.01
            ),
            # behavior
            "invoice_modification_count": _safe_int(
                operation.get("invoice_modification_count") or operation.get("invoiceModificationCount")
            ),
            "invoice_cancellation_count": _safe_int(
                operation.get("invoice_cancellation_count") or operation.get("invoiceCancellationCount")
            ),
            "refund_count": _safe_int(operation.get("refund_count") or operation.get("refundCount")),
            "payment_count": _safe_int(operation.get("payment_count") or operation.get("paymentCount"), default=1),
        }
        return features

    @staticmethod
    def to_numeric_vector(features: dict[str, Any]) -> np.ndarray:
        values: list[float] = []
        for name in NUMERIC_FEATURE_NAMES:
            raw = features.get(name)
            if raw is None:
                values.append(0.0)
            elif isinstance(raw, bool):
                values.append(1.0 if raw else 0.0)
            else:
                values.append(_safe_float(raw))
        return np.array(values, dtype=float)

    @classmethod
    def build_batch(
        cls,
        operations: list[dict[str, Any]],
        center_stats: dict[str, Any] | None = None,
    ) -> tuple[list[dict[str, Any]], np.ndarray]:
        feature_rows = [cls.build_operation_features(op, center_stats=center_stats) for op in operations]
        matrix = np.vstack([cls.to_numeric_vector(row) for row in feature_rows])
        return feature_rows, matrix

    @staticmethod
    def compute_center_stats(operations: list[dict[str, Any]]) -> dict[str, float]:
        """Aggregate center-level statistics from a training batch."""
        if not operations:
            return {
                "average_discount_pct": 5.0,
                "discount_std": 8.0,
                "non_retrieval_rate": 0.05,
                "non_retrieval_std": 0.05,
                "refund_rate": 0.03,
                "refund_std": 0.02,
            }

        discounts: list[float] = []
        non_retrievals: list[float] = []
        refunds: list[float] = []
        for op in operations:
            feats = FeatureBuilder.build_operation_features(op)
            discounts.append(feats["discount_percentage"])
            non_retrievals.append(1.0 if feats["dossier_not_retrieved"] else 0.0)
            refunds.append(_safe_float(feats["operator_refund_rate"]))

        return {
            "average_discount_pct": float(np.mean(discounts)) if discounts else 5.0,
            "discount_std": float(np.std(discounts)) if len(discounts) > 1 else 8.0,
            "non_retrieval_rate": float(np.mean(non_retrievals)) if non_retrievals else 0.05,
            "non_retrieval_std": float(np.std(non_retrievals)) if len(non_retrievals) > 1 else 0.05,
            "refund_rate": float(np.mean(refunds)) if refunds else 0.03,
            "refund_std": float(np.std(refunds)) if len(refunds) > 1 else 0.02,
        }
