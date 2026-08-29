"""Business rule engine — independent signals, not fraud confirmations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.config import RuleThresholds


@dataclass
class RuleResult:
    rule_id: str
    triggered: bool
    severity: str
    reason: str
    value: float
    threshold: float


class RuleEngine:
    """Evaluates configurable business rules on feature dictionaries."""

    def __init__(self, thresholds: RuleThresholds | None = None) -> None:
        self.thresholds = thresholds or RuleThresholds()

    def evaluate(self, features: dict[str, Any], center_stats: dict[str, Any] | None = None) -> list[RuleResult]:
        center_stats = center_stats or {}
        results: list[RuleResult] = []

        discount_pct = float(features.get("discount_percentage") or 0)
        results.append(
            RuleResult(
                rule_id="RULE_HIGH_DISCOUNT",
                triggered=discount_pct >= self.thresholds.high_discount_pct,
                severity="high" if discount_pct >= self.thresholds.high_discount_pct + 15 else "medium",
                reason=f"Remise de {discount_pct:.0f}%",
                value=discount_pct,
                threshold=self.thresholds.high_discount_pct,
            )
        )

        center_avg = float(center_stats.get("average_discount_pct") or 5.0)
        center_std = max(float(center_stats.get("discount_std") or 8.0), 1.0)
        z_discount = (discount_pct - center_avg) / center_std
        results.append(
            RuleResult(
                rule_id="RULE_DISCOUNT_OUTLIER",
                triggered=z_discount >= self.thresholds.discount_outlier_z,
                severity="high" if z_discount >= self.thresholds.discount_outlier_z + 1 else "medium",
                reason="Remise très supérieure à la moyenne du centre",
                value=z_discount,
                threshold=self.thresholds.discount_outlier_z,
            )
        )

        op_dev = float(features.get("operator_discount_deviation") or 0)
        results.append(
            RuleResult(
                rule_id="RULE_OPERATOR_DISCOUNT_OUTLIER",
                triggered=op_dev >= self.thresholds.operator_discount_outlier_z,
                severity="high" if op_dev >= self.thresholds.operator_discount_outlier_z + 1 else "medium",
                reason="Remise anormale pour cet opérateur",
                value=op_dev,
                threshold=self.thresholds.operator_discount_outlier_z,
            )
        )

        non_retrieval = float(features.get("operator_non_retrieval_rate") or 0)
        results.append(
            RuleResult(
                rule_id="RULE_HIGH_NON_RETRIEVAL_RATE",
                triggered=non_retrieval >= self.thresholds.high_non_retrieval_rate,
                severity="medium",
                reason="Taux de dossiers non récupérés inhabituellement élevé",
                value=non_retrieval,
                threshold=self.thresholds.high_non_retrieval_rate,
            )
        )

        nr_dev = float(features.get("operator_non_retrieval_deviation") or 0)
        results.append(
            RuleResult(
                rule_id="RULE_OPERATOR_NON_RETRIEVAL_OUTLIER",
                triggered=nr_dev >= self.thresholds.operator_non_retrieval_outlier_z,
                severity="high" if nr_dev >= self.thresholds.operator_non_retrieval_outlier_z + 1 else "medium",
                reason="Comportement opérateur atypique (non-récupération)",
                value=nr_dev,
                threshold=self.thresholds.operator_non_retrieval_outlier_z,
            )
        )

        dup_hash = int(features.get("document_hash_duplicate_count") or 0)
        dup_doc = int(features.get("duplicate_document_count") or 0)
        dup_total = max(dup_hash, dup_doc)
        results.append(
            RuleResult(
                rule_id="RULE_DUPLICATE_DOCUMENT",
                triggered=dup_total >= 1,
                severity="high" if dup_total >= 2 else "medium",
                reason="Document dupliqué détecté (hash ou copie)",
                value=float(dup_total),
                threshold=1.0,
            )
        )

        mod_count = int(features.get("invoice_modification_count") or 0)
        results.append(
            RuleResult(
                rule_id="RULE_EXCESSIVE_MODIFICATIONS",
                triggered=mod_count >= self.thresholds.excessive_modifications,
                severity="medium",
                reason=f"{mod_count} modification(s) sur la facture",
                value=float(mod_count),
                threshold=float(self.thresholds.excessive_modifications),
            )
        )

        refund_rate = float(features.get("operator_refund_rate") or 0)
        results.append(
            RuleResult(
                rule_id="RULE_EXCESSIVE_REFUNDS",
                triggered=refund_rate >= self.thresholds.excessive_refunds_rate,
                severity="medium",
                reason="Taux de remboursement inhabituel",
                value=refund_rate,
                threshold=self.thresholds.excessive_refunds_rate,
            )
        )

        exam_to_pay = features.get("exam_to_payment_minutes")
        invoice_to_pay = features.get("invoice_to_payment_minutes")
        unusual = False
        unusual_val = 0.0
        if exam_to_pay is not None and float(exam_to_pay) < self.thresholds.unusual_payment_sequence_minutes:
            unusual = True
            unusual_val = float(exam_to_pay)
        elif invoice_to_pay is not None and float(invoice_to_pay) < 0:
            unusual = True
            unusual_val = float(invoice_to_pay)
        results.append(
            RuleResult(
                rule_id="RULE_UNUSUAL_PAYMENT_SEQUENCE",
                triggered=unusual,
                severity="medium",
                reason="Séquence temporelle de paiement incohérente",
                value=unusual_val,
                threshold=float(self.thresholds.unusual_payment_sequence_minutes),
            )
        )

        price_dev = float(features.get("price_deviation") or 0)
        results.append(
            RuleResult(
                rule_id="RULE_PRICE_DEVIATION",
                triggered=price_dev >= self.thresholds.price_deviation_pct,
                severity="high" if price_dev >= self.thresholds.price_deviation_pct + 20 else "medium",
                reason="Montant facturé éloigné du tarif catalogue",
                value=price_dev,
                threshold=self.thresholds.price_deviation_pct,
            )
        )

        exam_30d = int(features.get("patient_exam_count_30d") or 0)
        results.append(
            RuleResult(
                rule_id="RULE_HIGH_FREQUENCY_PATIENT",
                triggered=exam_30d >= self.thresholds.high_frequency_patient_30d,
                severity="medium",
                reason=f"Fréquence d'examens élevée ({exam_30d} en 30j)",
                value=float(exam_30d),
                threshold=float(self.thresholds.high_frequency_patient_30d),
            )
        )

        return results

    @staticmethod
    def rules_component_score(rule_results: list[RuleResult]) -> float:
        if not rule_results:
            return 0.0
        triggered = [r for r in rule_results if r.triggered]
        if not triggered:
            return 0.0
        severity_weight = {"low": 15, "medium": 35, "high": 55, "critical": 75}
        scores = [severity_weight.get(r.severity, 30) for r in triggered]
        base = sum(scores) / len(scores)
        bonus = min(25.0, (len(triggered) - 1) * 8.0)
        return float(min(100.0, base + bonus))
