"""Pytest configuration."""

from __future__ import annotations

import os
from pathlib import Path

import pytest


@pytest.fixture()
def tmp_models_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    models_dir = tmp_path / "models_store"
    models_dir.mkdir()
    monkeypatch.setenv("ML_MODELS_DIR", str(models_dir))
    monkeypatch.delenv("ML_SERVICE_API_KEY", raising=False)

    # Reset engine singletons between tests
    import app.engine as engine_module
    import app.main as main_module

    engine_module._ENGINE = None
    main_module._LEGACY_ENGINE = None
    return models_dir
