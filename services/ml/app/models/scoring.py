"""Final anomaly score composition and niveau mapping."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.config import ScoringWeights
from app.models.anomaly import IsolationResult
from app.models.clustering import ClusterModel
from app.models.rules import RuleEngine, RuleResult


def score_to_niveau(score: int) -> str:
    if score >= 85:
        return "critique"
    if score >= 70:
        return "élevé"
    if score >= 50:
        return "moyen"
    if score >= 30:
        return "modéré"
    return "faible"


@dataclass
class ScoreBreakdown:
    cluster_component: float
    isolation_component: float
    rules_component: float
    final_score: int
    niveau: str
    triggered_rules: list[str]
    reasons: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "cluster_component": round(self.cluster_component, 2),
            "isolation_component": round(self.isolation_component, 2),
            "rules_component": round(self.rules_component, 2),
            "final_score": self.final_score,
            "score": self.final_score,
            "niveau": self.niveau,
            "triggered_rules": self.triggered_rules,
            "reasons": self.reasons,
        }


class ScoringEngine:
    def __init__(self, weights: ScoringWeights | None = None) -> None:
        self.weights = weights or ScoringWeights()
        total = self.weights.cluster + self.weights.isolation + self.weights.rules
        if total <= 0:
            self.weights = ScoringWeights()
        else:
            self._norm = ScoringWeights(
                cluster=self.weights.cluster / total,
                isolation=self.weights.isolation / total,
                rules=self.weights.rules / total,
            )

    def combine(
        self,
        cluster_model: ClusterModel,
        cluster_distance: float,
        isolation: IsolationResult,
        rule_results: list[RuleResult],
        extra_reasons: list[str] | None = None,
    ) -> ScoreBreakdown:
        cluster_comp = cluster_model.cluster_component_score(cluster_distance)
        isolation_comp = isolation.isolation_score
        rules_comp = RuleEngine.rules_component_score(rule_results)

        w = self._norm
        blended = w.cluster * cluster_comp + w.isolation * isolation_comp + w.rules * rules_comp
        final = int(round(min(100.0, max(0.0, blended))))

        triggered = [r.rule_id for r in rule_results if r.triggered]
        reasons = [r.reason for r in rule_results if r.triggered]
        if isolation.isolation_anomaly:
            reasons.append("Comportement éloigné du cluster habituel (Isolation Forest)")
        if cluster_distance > cluster_model.distance_threshold:
            reasons.append("Distance au centroïde supérieure au seuil")
        if extra_reasons:
            reasons.extend(extra_reasons)
        if not reasons:
            reasons.append("Revue de routine — aucun signal majeur")

        return ScoreBreakdown(
            cluster_component=cluster_comp,
            isolation_component=isolation_comp,
            rules_component=rules_comp,
            final_score=final,
            niveau=score_to_niveau(final),
            triggered_rules=triggered,
            reasons=reasons,
        )
