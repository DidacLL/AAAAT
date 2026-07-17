from __future__ import annotations

from pathlib import Path
from typing import Any

from .integration_setup import current_integration
from .provider_adapters import adapter_health


def integration_readiness(storage_path: str | Path) -> dict[str, Any]:
    """Return local configuration readiness without executing an external host.

    This validates only the selected AAAAT-side settings and local primitive
    availability. It is not connector certification and does not send a
    challenge or run a host test suite.
    """
    selected = current_integration(storage_path)
    adapter_id = str(selected.get("id") or "no_ai_connection")
    settings = dict(selected.get("settings") or {})
    health = adapter_health(adapter_id, settings)
    status = str(health.get("status") or "error")
    return {
        "status": "ready" if status == "ready" else "needs_attention",
        "adapter_id": adapter_id,
        "message": str(health.get("message") or "Integration settings need attention."),
    }
