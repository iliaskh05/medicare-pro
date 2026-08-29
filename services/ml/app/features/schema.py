"""Documented feature schema for MediCare Pro anomaly detection.

All features are derived from operation payloads supplied by Spring Boot.
The ML service does NOT read PostgreSQL directly in this phase.
"""

from __future__ import annotations

from typing import Any, TypedDict


class FeatureMeta(TypedDict):
    name: str
    group: str
    dtype: str
    description: str
    nullable: bool


FEATURE_SCHEMA: list[FeatureMeta] = [
    # PATIENT
    {"name": "patient_age", "group": "patient", "dtype": "float", "description": "Patient age in years", "nullable": True},
    {"name": "patient_gender", "group": "patient", "dtype": "str", "description": "Patient gender code (M/F/other)", "nullable": True},
    {"name": "patient_insurance", "group": "patient", "dtype": "str", "description": "Insurance / mutuelle name", "nullable": True},
    {"name": "patient_visit_count_30d", "group": "patient", "dtype": "int", "description": "Patient visits in last 30 days", "nullable": True},
    {"name": "patient_exam_count_30d", "group": "patient", "dtype": "int", "description": "Patient exams in last 30 days", "nullable": True},
    {"name": "patient_exam_count_90d", "group": "patient", "dtype": "int", "description": "Patient exams in last 90 days", "nullable": True},
    {"name": "same_exam_count_30d", "group": "patient", "dtype": "int", "description": "Same exam type count in 30 days", "nullable": True},
    {"name": "same_exam_count_90d", "group": "patient", "dtype": "int", "description": "Same exam type count in 90 days", "nullable": True},
    # EXAMEN
    {"name": "exam_type", "group": "exam", "dtype": "str", "description": "Exam type label from catalogue", "nullable": True},
    {"name": "modality", "group": "exam", "dtype": "str", "description": "Imaging modality (CT, MR, US, XR…)", "nullable": True},
    {"name": "catalogue_price", "group": "exam", "dtype": "float", "description": "Reference catalogue price (MAD)", "nullable": False},
    {"name": "billed_amount", "group": "exam", "dtype": "float", "description": "Amount billed on invoice", "nullable": True},
    {"name": "deposit_amount", "group": "exam", "dtype": "float", "description": "Deposit / acompte amount", "nullable": True},
    {"name": "remaining_amount", "group": "exam", "dtype": "float", "description": "Remaining balance", "nullable": True},
    {"name": "exam_status", "group": "exam", "dtype": "str", "description": "Exam workflow status", "nullable": True},
    {"name": "priority", "group": "exam", "dtype": "str", "description": "Exam priority", "nullable": True},
    # FACTURATION
    {"name": "invoice_total", "group": "billing", "dtype": "float", "description": "Invoice total", "nullable": True},
    {"name": "insurance_share", "group": "billing", "dtype": "float", "description": "Insurance share", "nullable": True},
    {"name": "patient_share", "group": "billing", "dtype": "float", "description": "Patient share", "nullable": True},
    {"name": "amount_paid", "group": "billing", "dtype": "float", "description": "Amount paid", "nullable": True},
    {"name": "amount_refunded", "group": "billing", "dtype": "float", "description": "Amount refunded", "nullable": True},
    {"name": "discount_amount", "group": "billing", "dtype": "float", "description": "Discount amount (remise)", "nullable": True},
    {"name": "discount_percentage", "group": "billing", "dtype": "float", "description": "discount_amount / catalogue_price * 100", "nullable": True},
    {"name": "payment_method", "group": "billing", "dtype": "str", "description": "Payment method", "nullable": True},
    {"name": "billed_to_catalogue_ratio", "group": "billing", "dtype": "float", "description": "billed_amount / catalogue_price", "nullable": True},
    {"name": "patient_share_ratio", "group": "billing", "dtype": "float", "description": "patient_share / invoice_total", "nullable": True},
    {"name": "paid_to_total_ratio", "group": "billing", "dtype": "float", "description": "amount_paid / invoice_total", "nullable": True},
    {"name": "price_deviation", "group": "billing", "dtype": "float", "description": "Relative deviation from catalogue price", "nullable": True},
    # TEMPS
    {"name": "exam_to_invoice_minutes", "group": "time", "dtype": "float", "description": "Minutes between exam and invoice", "nullable": True},
    {"name": "exam_to_payment_minutes", "group": "time", "dtype": "float", "description": "Minutes between exam and payment", "nullable": True},
    {"name": "invoice_to_payment_minutes", "group": "time", "dtype": "float", "description": "Minutes between invoice and payment", "nullable": True},
    {"name": "exam_to_document_minutes", "group": "time", "dtype": "float", "description": "Minutes between exam and document upload", "nullable": True},
    {"name": "document_to_retrieval_minutes", "group": "time", "dtype": "float", "description": "Minutes between document and dossier retrieval", "nullable": True},
    # DOSSIER
    {"name": "dossier_status", "group": "dossier", "dtype": "str", "description": "Dossier status", "nullable": True},
    {"name": "dossier_not_retrieved", "group": "dossier", "dtype": "bool", "description": "Dossier not retrieved by patient (behavioral signal)", "nullable": True},
    {"name": "dossier_created_at", "group": "dossier", "dtype": "str", "description": "Dossier creation timestamp ISO", "nullable": True},
    {"name": "dossier_retrieved_at", "group": "dossier", "dtype": "str", "description": "Dossier retrieval timestamp ISO", "nullable": True},
    {"name": "dossier_created_by", "group": "dossier", "dtype": "str", "description": "Operator who created dossier", "nullable": True},
    {"name": "dossier_retrieved_by", "group": "dossier", "dtype": "str", "description": "Operator who retrieved dossier", "nullable": True},
    # DOCUMENTS
    {"name": "document_count", "group": "documents", "dtype": "int", "description": "Number of documents linked", "nullable": True},
    {"name": "document_uploaded", "group": "documents", "dtype": "bool", "description": "At least one document uploaded", "nullable": True},
    {"name": "document_uploaded_by", "group": "documents", "dtype": "str", "description": "Uploader operator id/name", "nullable": True},
    {"name": "document_upload_delay", "group": "documents", "dtype": "float", "description": "Upload delay in minutes", "nullable": True},
    {"name": "document_reprint_count", "group": "documents", "dtype": "int", "description": "Document reprint count", "nullable": True},
    {"name": "duplicate_document_count", "group": "documents", "dtype": "int", "description": "Duplicate document occurrences", "nullable": True},
    {"name": "document_hash_duplicate_count", "group": "documents", "dtype": "int", "description": "Hash duplicate count across patients/ops", "nullable": True},
    # OPÉRATEUR (historical — must be computed BEFORE the operation to avoid leakage)
    {"name": "operator_id", "group": "operator", "dtype": "str", "description": "Operator identifier", "nullable": True},
    {"name": "operator_average_discount", "group": "operator", "dtype": "float", "description": "Operator historical mean discount %", "nullable": True},
    {"name": "operator_discount_std", "group": "operator", "dtype": "float", "description": "Operator historical discount std", "nullable": True},
    {"name": "operator_discount_rate", "group": "operator", "dtype": "float", "description": "Operator discount rate (0-1)", "nullable": True},
    {"name": "operator_non_retrieval_rate", "group": "operator", "dtype": "float", "description": "Operator non-retrieval rate (0-1)", "nullable": True},
    {"name": "operator_cancellation_rate", "group": "operator", "dtype": "float", "description": "Operator cancellation rate (0-1)", "nullable": True},
    {"name": "operator_refund_rate", "group": "operator", "dtype": "float", "description": "Operator refund rate (0-1)", "nullable": True},
    {"name": "operator_modification_rate", "group": "operator", "dtype": "float", "description": "Operator modification rate (0-1)", "nullable": True},
    {"name": "operator_reprint_rate", "group": "operator", "dtype": "float", "description": "Operator reprint rate (0-1)", "nullable": True},
    {"name": "operator_cash_payment_rate", "group": "operator", "dtype": "float", "description": "Operator cash payment rate (0-1)", "nullable": True},
    {"name": "operator_discount_deviation", "group": "operator", "dtype": "float", "description": "Deviation from operator historical discount", "nullable": True},
    {"name": "operator_non_retrieval_deviation", "group": "operator", "dtype": "float", "description": "Deviation from operator historical non-retrieval", "nullable": True},
    {"name": "operator_refund_deviation", "group": "operator", "dtype": "float", "description": "Deviation from operator historical refund rate", "nullable": True},
    # COMPORTEMENT
    {"name": "invoice_modification_count", "group": "behavior", "dtype": "int", "description": "Invoice modification count", "nullable": True},
    {"name": "invoice_cancellation_count", "group": "behavior", "dtype": "int", "description": "Invoice cancellation count", "nullable": True},
    {"name": "refund_count", "group": "behavior", "dtype": "int", "description": "Refund count on operation", "nullable": True},
    {"name": "payment_count", "group": "behavior", "dtype": "int", "description": "Payment count on operation", "nullable": True},
]

FEATURE_NAMES: list[str] = [f["name"] for f in FEATURE_SCHEMA]

# Numeric subset used by KMeans / IsolationForest (order matters for model persistence)
NUMERIC_FEATURE_NAMES: list[str] = [
    "patient_age",
    "patient_visit_count_30d",
    "patient_exam_count_30d",
    "patient_exam_count_90d",
    "same_exam_count_30d",
    "same_exam_count_90d",
    "catalogue_price",
    "billed_amount",
    "deposit_amount",
    "remaining_amount",
    "invoice_total",
    "insurance_share",
    "patient_share",
    "amount_paid",
    "amount_refunded",
    "discount_amount",
    "discount_percentage",
    "billed_to_catalogue_ratio",
    "patient_share_ratio",
    "paid_to_total_ratio",
    "price_deviation",
    "exam_to_invoice_minutes",
    "exam_to_payment_minutes",
    "invoice_to_payment_minutes",
    "exam_to_document_minutes",
    "document_to_retrieval_minutes",
    "dossier_not_retrieved",
    "document_count",
    "document_uploaded",
    "document_upload_delay",
    "document_reprint_count",
    "duplicate_document_count",
    "document_hash_duplicate_count",
    "operator_average_discount",
    "operator_discount_std",
    "operator_discount_rate",
    "operator_non_retrieval_rate",
    "operator_cancellation_rate",
    "operator_refund_rate",
    "operator_modification_rate",
    "operator_reprint_rate",
    "operator_cash_payment_rate",
    "operator_discount_deviation",
    "operator_non_retrieval_deviation",
    "operator_refund_deviation",
    "invoice_modification_count",
    "invoice_cancellation_count",
    "refund_count",
    "payment_count",
]


def schema_as_dict() -> dict[str, Any]:
    return {
        "feature_count": len(FEATURE_NAMES),
        "numeric_feature_count": len(NUMERIC_FEATURE_NAMES),
        "features": FEATURE_SCHEMA,
        "numeric_features": NUMERIC_FEATURE_NAMES,
    }
