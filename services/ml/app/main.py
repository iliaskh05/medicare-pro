"""RadioCRM ML microservice — fraud hybrid + image heuristics."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .fraud_engine import HybridFraudEngine, default_training_rows
from .image_analysis import analyze_bytes

app = FastAPI(title="RadioCRM ML", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ENGINE = HybridFraudEngine.train(default_training_rows())


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

    model_config = {"populate_by_name": True}


class TrainIn(BaseModel):
    rows: list[dict[str, Any]]


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "radiocrm-ml",
        "model": ENGINE.version,
        "ts": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/fraud/train")
def fraud_train(body: TrainIn) -> dict[str, Any]:
    global ENGINE
    rows = body.rows or default_training_rows()
    ENGINE = HybridFraudEngine.train(rows)
    return {"ok": True, "data": {"version": ENGINE.version, "samples": len(rows)}}


@app.post("/fraud/score")
def fraud_score(invoice: InvoiceIn) -> dict[str, Any]:
    result = ENGINE.score(invoice.model_dump())
    return {"ok": True, "data": result}


@app.post("/fraud/analyze")
def fraud_analyze(rows: list[InvoiceIn]) -> dict[str, Any]:
    results = [ENGINE.score(r.model_dump()) for r in rows]
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
    return {"service": "radiocrm-ml", "docs": "/docs"}
