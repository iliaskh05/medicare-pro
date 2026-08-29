"""KMeans clustering for behavioral segmentation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from app.config import ClusteringConfig


@dataclass
class ClusterResult:
    cluster_id: int
    distance_to_centroid: float


@dataclass
class ClusterModel:
    model: KMeans
    distance_threshold: float
    silhouette: float | None
    n_clusters: int

    @classmethod
    def train(cls, X: np.ndarray, config: ClusteringConfig | None = None) -> "ClusterModel":
        config = config or ClusteringConfig()
        n_samples = X.shape[0]
        n_clusters = min(config.n_clusters, max(2, n_samples // 3)) if n_samples >= 6 else max(2, min(config.n_clusters, n_samples))

        kmeans = KMeans(n_clusters=n_clusters, n_init=config.n_init, random_state=config.random_state)
        kmeans.fit(X)

        labels = kmeans.predict(X)
        dists = np.linalg.norm(X - kmeans.cluster_centers_[labels], axis=1)
        threshold = float(np.quantile(dists, 0.88)) if len(dists) else 1.0

        sil: float | None = None
        if n_samples >= n_clusters + 1 and len(set(labels.tolist())) > 1:
            try:
                sil = float(silhouette_score(X, labels))
            except ValueError:
                sil = None

        return cls(model=kmeans, distance_threshold=threshold, silhouette=sil, n_clusters=n_clusters)

    def predict(self, X: np.ndarray) -> list[ClusterResult]:
        if X.ndim == 1:
            X = X.reshape(1, -1)
        labels = self.model.predict(X)
        results: list[ClusterResult] = []
        for i, cluster_id in enumerate(labels):
            dist = float(np.linalg.norm(X[i] - self.model.cluster_centers_[cluster_id]))
            results.append(ClusterResult(cluster_id=int(cluster_id), distance_to_centroid=dist))
        return results

    def cluster_component_score(self, distance: float) -> float:
        """Map distance to 0-100 component (higher = more anomalous)."""
        if self.distance_threshold <= 0:
            return min(100.0, distance * 20.0)
        ratio = distance / self.distance_threshold
        return float(min(100.0, max(0.0, (ratio - 0.5) * 50.0 + 25.0 * (ratio > 1.0))))

    def to_metadata(self) -> dict[str, Any]:
        return {
            "n_clusters": self.n_clusters,
            "distance_threshold": round(self.distance_threshold, 4),
            "silhouette_score": round(self.silhouette, 4) if self.silhouette is not None else None,
        }
