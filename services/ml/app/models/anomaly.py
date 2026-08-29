"""Isolation Forest anomaly detection."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

from app.config import IsolationConfig


@dataclass
class IsolationResult:
    isolation_anomaly: bool
    isolation_score: float


@dataclass
class AnomalyModel:
    model: IsolationForest

    @classmethod
    def train(cls, X: np.ndarray, config: IsolationConfig | None = None) -> "AnomalyModel":
        config = config or IsolationConfig()
        contamination = min(max(config.contamination, 0.01), 0.5)
        iso = IsolationForest(
            contamination=contamination,
            random_state=config.random_state,
            n_estimators=config.n_estimators,
        )
        iso.fit(X)
        return cls(model=iso)

    def predict(self, X: np.ndarray) -> list[IsolationResult]:
        if X.ndim == 1:
            X = X.reshape(1, -1)
        flags = self.model.predict(X)
        scores = self.model.decision_function(X)
        results: list[IsolationResult] = []
        for flag, score in zip(flags, scores):
            # decision_function: lower = more anomalous; map to 0-100
            component = float(min(100.0, max(0.0, (0.5 - float(score)) * 100.0)))
            results.append(IsolationResult(isolation_anomaly=flag == -1, isolation_score=round(component, 2)))
        return results

    def to_metadata(self) -> dict[str, Any]:
        return {
            "contamination": getattr(self.model, "contamination", "auto"),
            "n_estimators": self.model.n_estimators,
        }
