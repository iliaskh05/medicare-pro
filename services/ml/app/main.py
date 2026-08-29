"""RadioCRM ML microservice — anomaly detection + legacy fraud + image heuristics."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .api.routes import router as anomaly_router
from .fraud_engine import HybridFraudEngine, default_training_rows
from .image_analysis import analyze_bytes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="MediCare Pro ML", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# New anomaly detection API (/health, /score, /train, /model/info)
app.include_router(anomaly_router)

# Legacy fraud engine for backward compatibility (lazy init)
_LEGACY_ENGINE: HybridFraudEngine | None = None


def get_legacy_engine() -> HybridFraudEngine:
    global _LEGACY_ENGINE
    if _LEGACY_ENGINE is None:
        _LEGACY_ENGINE = HybridFraudEngine()
    return _LEGACY_ENGINE


class InvoiceIn(BaseModel):
    id: str = Field(alias="id")
    patient: str
    examen: str
    total: float
    partMutuelle: float | None = 0
    examsLast30Days: float | None = None
    daysSinceLastSameExam: float | None = None
    isGenderIncoherent: float | None = None
    isDuplicate: float | None = None
    mutuelleExpired: float | None = None
    catalogue_price: float | None = None

    model_config = {"populate_by_name": True}


class TrainIn(BaseModel):
    rows: list[dict[str, Any]]


@app.post("/fraud/train")
def fraud_train(body: TrainIn) -> dict[str, Any]:
    global _LEGACY_ENGINE
    rows = body.rows or default_training_rows()
    _LEGACY_ENGINE = HybridFraudEngine.train(rows)
    return {"ok": True, "data": {"version": _LEGACY_ENGINE.version, "samples": len(rows)}}


@app.post("/fraud/score")
def fraud_score(invoice: InvoiceIn) -> dict[str, Any]:
    result = get_legacy_engine().score(invoice.model_dump())
    return {"ok": True, "data": result}


@app.post("/fraud/analyze")
def fraud_analyze(rows: list[InvoiceIn]) -> dict[str, Any]:
    engine = get_legacy_engine()
    results = [engine.score(r.model_dump()) for r in rows]
    results.sort(key=lambda r: r["score"], reverse=True)
    return {"ok": True, "data": {"results": results}}


@app.post("/imaging/analyze")
async def imaging_analyze(
    modality: str = Form("XR"),
    bodyPart: str = Form("thorax"),
    studyId: str = Form("STD-UNKNOWN"),
    file: UploadFile | None = File(None),
) -> dict[str, Any]:
    data = await file.read() if file else b""
    analysis = analyze_bytes(data, modality=modality, body_part=bodyPart)
    return {
        "ok": True,
        "data": {
            "studyId": studyId,
            "analyzedAt": datetime.now(timezone.utc).isoformat(),
            **analysis,
            "latencyMs": 0,
        },
    }


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "medicare-ml", "docs": "/docs", "anomaly_api": "/health"}
