"""FastAPI routes for anomaly detection."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import SETTINGS
from app.engine import get_engine

router = APIRouter()


def verify_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    expected = SETTINGS.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing ML_SERVICE_API_KEY")


class ScoreRequest(BaseModel):
    operation_id: str | None = Field(default=None, alias="operationId")
    patient_id: int | None = None
    exam_id: int | None = None
    invoice_id: int | None = None
    operator_id: int | str | None = None
    catalogue_price: float = 0
    billed_amount: float | None = None
    deposit_amount: float | None = None
    amount_paid: float | None = None
    amount_refunded: float | None = None
    discount_amount: float | None = None
    discount_percentage: float | None = None
    dossier_not_retrieved: bool | None = None
    document_uploaded: bool | None = None
    document_reprint_count: int | None = None
    # Allow extra fields from Spring Boot feature builder
    model_config = {"extra": "allow", "populate_by_name": True}


class BatchScoreRequest(BaseModel):
    operations: list[dict[str, Any]]


class TrainRequest(BaseModel):
    operations: list[dict[str, Any]]
    version: str | None = None


@router.get("/health")
def health() -> dict[str, Any]:
    engine = get_engine()
    info = engine.info()
    return {
        "ok": True,
        "service": "medicare-anomaly-ml",
        "model_version": info.get("model_version"),
        "ts": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/model/info")
def model_info(_: None = Depends(verify_api_key)) -> dict[str, Any]:
    return {"ok": True, "data": get_engine().info()}


@router.post("/score")
def score_operation(body: ScoreRequest, _: None = Depends(verify_api_key)) -> dict[str, Any]:
    payload = body.model_dump(by_alias=True, exclude_none=True)
    result = get_engine().score_operation(payload)
    return {"ok": True, "data": result}


@router.post("/score/batch")
def score_batch(body: BatchScoreRequest, _: None = Depends(verify_api_key)) -> dict[str, Any]:
    try:
        results = get_engine().score_batch(body.operations)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "data": {"results": results, "count": len(results)}}


@router.post("/train")
def train_model(body: TrainRequest, _: None = Depends(verify_api_key)) -> dict[str, Any]:
    if len(body.operations) < 3:
        raise HTTPException(status_code=400, detail="At least 3 operations required for training")
    try:
        meta = get_engine().train(body.operations, version=body.version)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "data": meta}
