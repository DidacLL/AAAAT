from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .provider_adapters import DEFAULT_ADAPTER_ID, adapter_definition, validate_adapter_settings

DEFAULT_AUTOMATIC_TASKS = [
    "field_inference",
    "company_research",
    "career_plan_review",
]
DEFAULT_SETTINGS = {
    "automatic_preparation": DEFAULT_AUTOMATIC_TASKS,
    "local_agent_adapter": {
        "id": DEFAULT_ADAPTER_ID,
        "settings": {},
    },
}


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
    target = ensure_workspace_config(storage_path)
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid workspace settings file {target}: {exc.msg}") from exc
    if not isinstance(payload, dict):
        raise ValueError("Workspace settings must be a JSON object")

    automatic = payload.get("automatic_preparation", DEFAULT_AUTOMATIC_TASKS)
    if not isinstance(automatic, list) or any(not isinstance(item, str) or not item.strip() for item in automatic):
        raise ValueError("automatic_preparation must be a list of task type strings")

    adapter_value = payload.get("local_agent_adapter") or payload.get("provider_adapter") or DEFAULT_SETTINGS["local_agent_adapter"]
    if not isinstance(adapter_value, dict):
        raise ValueError("local_agent_adapter must be an object")
    adapter_id = str(adapter_value.get("id") or DEFAULT_ADAPTER_ID)
    adapter_definition(adapter_id)
    settings = validate_adapter_settings(adapter_id, adapter_value.get("settings"))
    return {
        "automatic_preparation": list(dict.fromkeys(str(item).strip() for item in automatic if str(item).strip())),
        "local_agent_adapter": {
            "id": adapter_id,
            "settings": settings,
        },
    }


def save_workspace_settings(
    storage_path: str | Path,
    *,
    automatic_preparation: list[str],
    local_agent_adapter_id: str,
    local_agent_adapter_settings: dict[str, Any] | None = None,
) -> Path:
    adapter_definition(local_agent_adapter_id)
    settings = validate_adapter_settings(local_agent_adapter_id, local_agent_adapter_settings)
    target = config_path(storage_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "automatic_preparation": list(dict.fromkeys(str(item).strip() for item in automatic_preparation if str(item).strip())),
        "local_agent_adapter": {
            "id": local_agent_adapter_id,
            "settings": settings,
        },
    }
    target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return target
