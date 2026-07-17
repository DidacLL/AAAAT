from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DEFAULT_SETTINGS = {"integration": {"id": "no_ai_connection", "settings": {}}}


def storage_directory(storage_path: str | Path) -> Path:
    base = Path(storage_path)
    return base.parent if base.suffix else base


def config_path(storage_path: str | Path) -> Path:
    return storage_directory(storage_path) / "aaaat-settings.json"


def ensure_workspace_config(storage_path: str | Path) -> Path:
    target = config_path(storage_path)
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(DEFAULT_SETTINGS, indent=2) + "\n", encoding="utf-8")
    return target


def load_workspace_config(storage_path: str | Path) -> dict[str, Any]:
    from .integration_setup import validate_integration_settings

    target = ensure_workspace_config(storage_path)
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid workspace settings file {target}: {exc.msg}") from exc
    if not isinstance(payload, dict):
        raise ValueError("Workspace settings must be a JSON object")
    selected = payload.get("integration", DEFAULT_SETTINGS["integration"])
    if not isinstance(selected, dict):
        raise ValueError("integration must be an object")
    method_id = str(selected.get("id") or "no_ai_connection")
    settings = validate_integration_settings(method_id, selected.get("settings"))
    return {"integration": {"id": method_id, "settings": settings}}


def save_workspace_settings(
    storage_path: str | Path,
    *,
    integration_method_id: str,
    integration_settings: dict[str, Any] | None = None,
) -> Path:
    from .integration_setup import validate_integration_settings

    settings = validate_integration_settings(integration_method_id, integration_settings)
    target = config_path(storage_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {"integration": {"id": integration_method_id, "settings": settings}}
    target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return target
