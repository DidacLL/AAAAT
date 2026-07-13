from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .task_registry import TASK_DEFINITIONS, automatic_task_types, task_snapshot


DEFAULT_CONFIG = {
    "automatic_preparation": list(automatic_task_types()),
    "runner_command": [],
    "task_overrides": {},
}


def config_path(storage_path: str | Path) -> Path:
    base = Path(storage_path)
    if base.suffix:
        base = base.parent
    return base / "aaaat-config.json"


def ensure_workspace_config(storage_path: str | Path) -> Path:
    target = config_path(storage_path)
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(DEFAULT_CONFIG, indent=2) + "\n", encoding="utf-8")
    return target


def load_workspace_config(storage_path: str | Path) -> dict[str, Any]:
    target = ensure_workspace_config(storage_path)
    try:
        value = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {target.name}: {exc.msg}") from exc
    if not isinstance(value, dict):
        raise ValueError("aaaat-config.json must contain a JSON object")

    automatic = value.get("automatic_preparation", DEFAULT_CONFIG["automatic_preparation"])
    if not isinstance(automatic, list) or any(not isinstance(item, str) or not item.strip() for item in automatic):
        raise ValueError("automatic_preparation must be a JSON array of task type strings")
    unknown = [item for item in automatic if item not in TASK_DEFINITIONS]
    if unknown:
        raise ValueError("Unknown automatic preparation tasks: " + ", ".join(unknown))

    command = value.get("runner_command", [])
    if not isinstance(command, list) or any(not isinstance(item, str) or not item.strip() for item in command):
        raise ValueError("runner_command must be a JSON array of command arguments")

    overrides = value.get("task_overrides", {})
    if not isinstance(overrides, dict):
        raise ValueError("task_overrides must be a JSON object")
    for task_type, override in overrides.items():
        if task_type not in TASK_DEFINITIONS:
            raise ValueError(f"Unknown task override: {task_type}")
        if not isinstance(override, dict):
            raise ValueError(f"Task override for {task_type} must be a JSON object")
        task_snapshot(task_type, override)

    return {
        "automatic_preparation": list(dict.fromkeys(automatic)),
        "runner_command": list(command),
        "task_overrides": overrides,
    }


def effective_task_snapshot(config: dict[str, Any], task_type: str) -> dict[str, Any]:
    override = config["task_overrides"].get(task_type)
    return task_snapshot(task_type, override if isinstance(override, dict) else None)
