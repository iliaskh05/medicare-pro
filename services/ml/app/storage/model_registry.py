"""Model registry — versioned persistence with joblib."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
from sklearn.preprocessing import StandardScaler

from app.config import SETTINGS
from app.models.anomaly import AnomalyModel
from app.models.clustering import ClusterModel


@dataclass
class ModelBundle:
    version: str
    scaler: StandardScaler
    cluster_model: ClusterModel
    anomaly_model: AnomalyModel
    feature_names: list[str]
    center_stats: dict[str, float]
    config: dict[str, Any]
    trained_at: str
    sample_count: int
    metrics: dict[str, Any] = field(default_factory=dict)

    def to_metadata(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "trained_at": self.trained_at,
            "sample_count": self.sample_count,
            "feature_names": self.feature_names,
            "center_stats": self.center_stats,
            "config": self.config,
            "metrics": self.metrics,
            "clustering": self.cluster_model.to_metadata(),
            "isolation": self.anomaly_model.to_metadata(),
        }


class ModelRegistry:
    def __init__(self, base_dir: Path | None = None) -> None:
        self.base_dir = base_dir or SETTINGS.models_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _version_dir(self, version: str) -> Path:
        return self.base_dir / version

    def save(self, bundle: ModelBundle) -> Path:
        version_dir = self._version_dir(bundle.version)
        version_dir.mkdir(parents=True, exist_ok=True)

        joblib.dump(bundle.scaler, version_dir / "scaler.joblib")
        joblib.dump(bundle.cluster_model, version_dir / "cluster_model.joblib")
        joblib.dump(bundle.anomaly_model, version_dir / "anomaly_model.joblib")

        meta = bundle.to_metadata()
        (version_dir / "metadata.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
        (self.base_dir / "latest.txt").write_text(bundle.version, encoding="utf-8")
        return version_dir

    def load(self, version: str | None = None) -> ModelBundle:
        version = version or self.get_latest_version() or SETTINGS.default_model_version
        version_dir = self._version_dir(version)
        if not version_dir.exists():
            raise FileNotFoundError(f"Model version not found: {version}")

        meta = json.loads((version_dir / "metadata.json").read_text(encoding="utf-8"))
        scaler = joblib.load(version_dir / "scaler.joblib")
        cluster_model = joblib.load(version_dir / "cluster_model.joblib")
        anomaly_model = joblib.load(version_dir / "anomaly_model.joblib")

        return ModelBundle(
            version=version,
            scaler=scaler,
            cluster_model=cluster_model,
            anomaly_model=anomaly_model,
            feature_names=meta.get("feature_names", []),
            center_stats=meta.get("center_stats", {}),
            config=meta.get("config", {}),
            trained_at=meta.get("trained_at", ""),
            sample_count=meta.get("sample_count", 0),
            metrics=meta.get("metrics", {}),
        )

    def list_versions(self) -> list[str]:
        if not self.base_dir.exists():
            return []
        return sorted(
            [p.name for p in self.base_dir.iterdir() if p.is_dir() and (p / "metadata.json").exists()],
            key=lambda v: v,
        )

    def get_latest_version(self) -> str | None:
        latest_file = self.base_dir / "latest.txt"
        if latest_file.exists():
            return latest_file.read_text(encoding="utf-8").strip() or None
        versions = self.list_versions()
        return versions[-1] if versions else None

    def next_version(self) -> str:
        versions = self.list_versions()
        if not versions:
            return SETTINGS.default_model_version
        last = versions[-1]
        if last.startswith("fraud-v") and last[7:].isdigit():
            return f"fraud-v{int(last[7:]) + 1}"
        return f"fraud-v{len(versions) + 1}"

    @staticmethod
    def now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()
