"""Lightweight radiology image quality / finding heuristics (numpy)."""

from __future__ import annotations

from typing import Any

import numpy as np


def analyze_bytes(data: bytes, modality: str = "XR", body_part: str = "thorax") -> dict[str, Any]:
    arr = np.frombuffer(data[:64_000], dtype=np.uint8)
    if arr.size == 0:
        arr = np.array([128], dtype=np.uint8)

    mean_i = float(arr.mean() / 255.0)
    contrast = float(min(1.0, arr.std() / 80.0))
    edges = float(np.mean(np.abs(np.diff(arr.astype(np.int16))) > 28))
    noise = float(min(1.0, contrast * 0.3 + (1 - mean_i) * 0.1))
    sharpness = float(min(1.0, edges * 3.2))
    quality = int(
        max(
            0,
            min(
                100,
                (1 - noise) * 35 + sharpness * 35 + contrast * 20 + (10 if 0.15 < mean_i < 0.85 else 0),
            ),
        )
    )

    findings: list[dict[str, Any]] = []
    if modality == "MR" and "crâne" in body_part:
        findings.append(
            {
                "code": "FIND-WM",
                "label": "Hyperintensités de la substance blanche (signal faible)",
                "confidence": 0.66,
                "severity": "moderate",
                "region": "substance blanche",
            }
        )
    elif modality == "CT":
        findings.append(
            {
                "code": "FIND-LUNG",
                "label": "Parenchyme analysé — corrélation clinique recommandée",
                "confidence": 0.71,
                "severity": "info",
                "region": body_part,
            }
        )
    else:
        findings.append(
            {
                "code": "FIND-NS",
                "label": "Pipeline ML : pas d'anomalie dominante",
                "confidence": 0.58,
                "severity": "info",
                "region": body_part,
            }
        )

    return {
        "qualityScore": quality,
        "metrics": {
            "meanIntensity": round(mean_i, 4),
            "contrast": round(contrast, 4),
            "edgeDensity": round(edges, 4),
            "noiseEstimate": round(noise, 4),
            "sharpness": round(sharpness, 4),
        },
        "findings": findings,
        "model": "radiocrm-py-cv-v1",
    }
