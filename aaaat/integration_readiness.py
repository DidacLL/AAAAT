from __future__ import annotations

from pathlib import Path
from typing import Any

from .integration_setup import current_integration


def integration_readiness(storage_path: str | Path) -> dict[str, Any]:
    """Return readiness of the selected local advanced method, without testing an AI host."""

    selected = current_integration(storage_path)
    health = dict(selected.get("health") or {})
    status = str(health.get("status") or "error")
    return {
        "status": "ready" if status == "ready" else "needs_attention",
        "method_id": str(selected.get("id") or "no_ai_connection"),
        "message": str(health.get("message") or "Integration settings need attention."),
    }
