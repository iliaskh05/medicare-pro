"""Configuration for the MediCare Pro anomaly detection ML service."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return float(raw)


@dataclass(frozen=True)
class ClusteringConfig:
    n_clusters: int = field(default_factory=lambda: _env_int("N_CLUSTERS", 5))
    random_state: int = field(default_factory=lambda: _env_int("CLUSTER_RANDOM_STATE", 42))
    n_init: int = field(default_factory=lambda: _env_int("KMEANS_N_INIT", 10))


@dataclass(frozen=True)
class IsolationConfig:
    contamination: float = field(default_factory=lambda: _env_float("ISO_CONTAMINATION", 0.12))
    random_state: int = field(default_factory=lambda: _env_int("ISO_RANDOM_STATE", 42))
    n_estimators: int = field(default_factory=lambda: _env_int("ISO_N_ESTIMATORS", 200))


@dataclass(frozen=True)
class ScoringWeights:
    cluster: float = field(default_factory=lambda: _env_float("WEIGHT_CLUSTER", 0.40))
    isolation: float = field(default_factory=lambda: _env_float("WEIGHT_ISOLATION", 0.30))
    rules: float = field(default_factory=lambda: _env_float("WEIGHT_RULES", 0.30))


@dataclass(frozen=True)
class RuleThresholds:
    high_discount_pct: float = field(default_factory=lambda: _env_float("RULE_HIGH_DISCOUNT_PCT", 40.0))
    discount_outlier_z: float = field(default_factory=lambda: _env_float("RULE_DISCOUNT_OUTLIER_Z", 2.5))
    operator_discount_outlier_z: float = field(
        default_factory=lambda: _env_float("RULE_OPERATOR_DISCOUNT_OUTLIER_Z", 2.0)
    )
    high_non_retrieval_rate: float = field(
        default_factory=lambda: _env_float("RULE_HIGH_NON_RETRIEVAL_RATE", 0.35)
    )
    operator_non_retrieval_outlier_z: float = field(
        default_factory=lambda: _env_float("RULE_OPERATOR_NON_RETRIEVAL_OUTLIER_Z", 2.0)
    )
    excessive_modifications: int = field(default_factory=lambda: _env_int("RULE_EXCESSIVE_MODIFICATIONS", 3))
    excessive_refunds_rate: float = field(
        default_factory=lambda: _env_float("RULE_EXCESSIVE_REFUNDS_RATE", 0.20)
    )
    price_deviation_pct: float = field(default_factory=lambda: _env_float("RULE_PRICE_DEVIATION_PCT", 35.0))
    high_frequency_patient_30d: int = field(
        default_factory=lambda: _env_int("RULE_HIGH_FREQUENCY_PATIENT_30D", 6)
    )
    unusual_payment_sequence_minutes: int = field(
        default_factory=lambda: _env_int("RULE_UNUSUAL_PAYMENT_SEQUENCE_MINUTES", -30)
    )


@dataclass(frozen=True)
class ServiceConfig:
    api_key: str = field(default_factory=lambda: os.getenv("ML_SERVICE_API_KEY", ""))
    models_dir: Path = field(
        default_factory=lambda: Path(os.getenv("ML_MODELS_DIR", str(Path(__file__).resolve().parent.parent / "models_store")))
    )
    default_model_version: str = field(default_factory=lambda: os.getenv("ML_DEFAULT_MODEL_VERSION", "fraud-v1"))
    max_batch_size: int = field(default_factory=lambda: _env_int("ML_MAX_BATCH_SIZE", 500))
    cluster: ClusteringConfig = field(default_factory=ClusteringConfig)
    isolation: IsolationConfig = field(default_factory=IsolationConfig)
    weights: ScoringWeights = field(default_factory=ScoringWeights)
    rules: RuleThresholds = field(default_factory=RuleThresholds)


SETTINGS = ServiceConfig()
