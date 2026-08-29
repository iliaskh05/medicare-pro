"""Training pipeline for unsupervised anomaly models."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.preprocessing import StandardScaler

from app.config import SETTINGS
from app.features.builder import FeatureBuilder
from app.features.schema import NUMERIC_FEATURE_NAMES
from app.models.anomaly import AnomalyModel
from app.models.clustering import ClusterModel
from app.storage.model_registry import ModelBundle, ModelRegistry


def train_from_operations(
    operations: list[dict[str, Any]],
    version: str | None = None,
    registry: ModelRegistry | None = None,
) -> ModelBundle:
    if len(operations) < 3:
        raise ValueError("At least 3 operations are required for training")

    registry = registry or ModelRegistry()
    version = version or registry.next_version()

    center_stats = FeatureBuilder.compute_center_stats(operations)
    _, X_raw = FeatureBuilder.build_batch(operations, center_stats=center_stats)

    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    cluster_model = ClusterModel.train(X, config=SETTINGS.cluster)
    anomaly_model = AnomalyModel.train(X, config=SETTINGS.isolation)

    # Training metrics
    cluster_results = cluster_model.predict(X)
    isolation_results = anomaly_model.predict(X)
    metrics = {
        "samples": len(operations),
        "feature_count": X.shape[1],
        "cluster_silhouette": cluster_model.silhouette,
        "mean_cluster_distance": float(np.mean([r.distance_to_centroid for r in cluster_results])),
        "isolation_anomaly_rate": float(np.mean([1 if r.isolation_anomaly else 0 for r in isolation_results])),
    }

    bundle = ModelBundle(
        version=version,
        scaler=scaler,
        cluster_model=cluster_model,
        anomaly_model=anomaly_model,
        feature_names=list(NUMERIC_FEATURE_NAMES),
        center_stats=center_stats,
        config={
            "n_clusters": SETTINGS.cluster.n_clusters,
            "iso_contamination": SETTINGS.isolation.contamination,
            "weights": {
                "cluster": SETTINGS.weights.cluster,
                "isolation": SETTINGS.weights.isolation,
                "rules": SETTINGS.weights.rules,
            },
        },
        trained_at=ModelRegistry.now_iso(),
        sample_count=len(operations),
        metrics=metrics,
    )
    registry.save(bundle)
    return bundle
