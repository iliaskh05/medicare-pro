"""Hybrid anti-fraud engine: IsolationForest / KMeans + GradientBoostingClassifier."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler


BAREMES = {
    "IRM Cérébrale": 2500,
    "IRM Lombaire": 2500,
    "IRM Genou": 2200,
    "Scanner Thoracique": 1400,
    "Scanner Abdominal": 1600,
    "Scanner Cérébral": 1500,
    "Échographie Abdominale": 450,
    "Échographie Pelvienne": 400,
    "Mammographie": 700,
    "Radio Thorax": 250,
}


def _features(row: dict[str, Any]) -> np.ndarray:
    amount = float(row.get("total") or row.get("amount") or 0)
    mutuelle = float(row.get("partMutuelle") or row.get("mutuelleShare") or 0)
    exam = str(row.get("examen") or row.get("examType") or "Radio Thorax")
    bareme = BAREMES.get(exam, amount or 1)
    bareme_ratio = amount / max(bareme, 1)
    exams_30 = float(row.get("examsLast30Days") or 1)
    days_since = float(row.get("daysSinceLastSameExam") or 30)
    gender = float(row.get("isGenderIncoherent") or 0)
    duplicate = float(row.get("isDuplicate") or 0)
    expired = float(row.get("mutuelleExpired") or 0)
    return np.array(
        [
            amount / 10000,
            mutuelle / 10000,
            days_since / 60,
            exams_30 / 10,
            gender,
            duplicate,
            expired,
            min(bareme_ratio, 4) / 4,
        ],
        dtype=float,
    )


@dataclass
class HybridFraudEngine:
    scaler: StandardScaler
    kmeans: KMeans
    iso: IsolationForest
    clf: GradientBoostingClassifier
    anomaly_threshold: float
    version: str = "sklearn-hybrid-v1"

    @classmethod
    def train(cls, rows: list[dict[str, Any]]) -> "HybridFraudEngine":
        X = np.vstack([_features(r) for r in rows])
        y = np.array([int(r.get("label", 0)) for r in rows])
        scaler = StandardScaler()
        Xs = scaler.fit_transform(X)

        kmeans = KMeans(n_clusters=min(4, max(2, len(rows) // 3)), n_init=10, random_state=42)
        kmeans.fit(Xs)

        iso = IsolationForest(contamination=0.2, random_state=42)
        iso.fit(Xs)

        # Distance to assigned centroid → threshold at 88th percentile
        labels = kmeans.predict(Xs)
        dists = np.linalg.norm(Xs - kmeans.cluster_centers_[labels], axis=1)
        threshold = float(np.quantile(dists, 0.88))

        clf = GradientBoostingClassifier(random_state=42)
        # Ensure both classes exist
        if len(set(y.tolist())) < 2:
            y = np.array([1 if i % 3 == 0 else 0 for i in range(len(rows))])
        clf.fit(Xs, y)

        return cls(scaler=scaler, kmeans=kmeans, iso=iso, clf=clf, anomaly_threshold=threshold)

    def score(self, row: dict[str, Any]) -> dict[str, Any]:
        x = _features(row).reshape(1, -1)
        xs = self.scaler.transform(x)
        cluster_id = int(self.kmeans.predict(xs)[0])
        dist = float(np.linalg.norm(xs - self.kmeans.cluster_centers_[cluster_id]))
        iso_flag = int(self.iso.predict(xs)[0] == -1)
        proba = float(self.clf.predict_proba(xs)[0][1])
        weak = dist > self.anomaly_threshold or iso_flag == 1
        boost = min(0.35, max(0.0, dist - self.anomaly_threshold) * 0.5) if weak else 0.0
        blended = min(0.99, proba * 0.7 + boost + 0.1 * iso_flag)
        score = int(round(blended * 100))

        reasons: list[str] = []
        bareme_ratio = float(x[0][7] * 4)
        if bareme_ratio >= 1.6:
            reasons.append("Montant hors norme")
        if weak:
            reasons.append("Signal faible / anomalie clustering")
        if proba >= 0.7:
            reasons.append("Profil similaire aux fraudes historiques")
        if not reasons:
            reasons.append("Revue de routine")

        niveau = "critique" if score >= 80 else "eleve" if score >= 60 else "moyen" if score >= 40 else "faible"
        invoice_id = str(row.get("id") or row.get("invoiceId") or "UNK")
        return {
            "invoiceId": invoice_id,
            "patientName": row.get("patient") or row.get("patientName") or "",
            "amount": float(row.get("total") or row.get("amount") or 0),
            "score": score,
            "niveau": niveau,
            "raison": reasons,
            "unsupervised": {
                "clusterId": cluster_id,
                "anomalyDistance": round(dist, 3),
                "isWeakSignal": weak,
            },
            "supervised": {"probability": round(proba, 3), "modelVersion": self.version},
            "decision": "pending",
            "scoredAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        }


def default_training_rows() -> list[dict[str, Any]]:
    """Seed rows mirroring the CRM mock historical labels."""
    return [
        {"id": "FCT-8912", "patient": "Karim Bennani", "examen": "IRM Cérébrale", "total": 2500, "partMutuelle": 1750, "label": 0},
        {"id": "FCT-8910", "patient": "Salma Chraibi", "examen": "Échographie Abdominale", "total": 450, "partMutuelle": 0, "label": 0},
        {"id": "FCT-8841", "patient": "Karim Bennani", "examen": "IRM Cérébrale", "total": 4800, "partMutuelle": 3000, "label": 1, "examsLast30Days": 4, "daysSinceLastSameExam": 3},
        {"id": "FCT-8836", "patient": "Hicham Tazi", "examen": "Scanner Abdominal", "total": 6400, "partMutuelle": 4000, "label": 1, "examsLast30Days": 5, "daysSinceLastSameExam": 2},
        {"id": "FCT-8829", "patient": "Meryem Alaoui", "examen": "Échographie Pelvienne", "total": 400, "partMutuelle": 0, "label": 1, "isGenderIncoherent": 0},
        {"id": "FCT-8795", "patient": "Mehdi Fassi Fihri", "examen": "IRM Cérébrale", "total": 7500, "partMutuelle": 5000, "label": 1, "isDuplicate": 1},
        {"id": "FCT-SYN-01", "patient": "Youssef El Amrani", "examen": "Radio Thorax", "total": 250, "partMutuelle": 150, "label": 0},
        {"id": "FCT-SYN-02", "patient": "Nadia Berrada", "examen": "Mammographie", "total": 700, "partMutuelle": 490, "label": 0},
        {"id": "FCT-SYN-03", "patient": "Amina Hakimi", "examen": "Radio Poignet", "total": 250, "partMutuelle": 175, "label": 0},
        {"id": "FCT-8808", "patient": "Zineb Sekkat", "examen": "IRM Genou", "total": 5200, "partMutuelle": 3000, "label": 1},
    ]
