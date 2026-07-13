from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .task_registry import TASK_DEFINITIONS, automatic_task_types, task_snapshot, validate_task_snapshot


DEFAULT_SETTINGS = {
    "automatic_preparation": list(automatic_task_types()),
    "runner_command": [],
}


def _storage_directory(storage_path: str | Path) -> Path:
    base = Path(storage_path)
    return base.parent if base.suffix else base


def config_path(storage_path: str | Path) -> Path:
    """Internal settings path. The desktop UI is the normal editing surface."""

    return _storage_directory(storage_path) / "aaaat-settings.json"


def task_definitions_dir(storage_path: str | Path) -> Path:
    return _storage_directory(storage_path) / "task-definitions"


def task_definition_path(storage_path: str | Path, task_type: str) -> Path:
    if task_type not in TASK_DEFINITIONS:
        raise ValueError(f"Unsupported preparation task: {task_type}")
    return task_definitions_dir(storage_path) / f"{task_type}.json"


def ensure_workspace_config(storage_path: str | Path) -> Path:
    target = config_path(storage_path)
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(DEFAULT_SETTINGS, indent=2) + "\n", encoding="utf-8")
    return target


def load_workspace_config(storage_path: str | Path) -> dict[str, Any]:
    target = ensure_workspace_config(storage_path)
    try:
        value = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid internal settings file {target.name}: {exc.msg}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"{target.name} must contain a JSON object")

    automatic = value.get("automatic_preparation", DEFAULT_SETTINGS["automatic_preparation"])
    if not isinstance(automatic, list) or any(not isinstance(item, str) or not item.strip() for item in automatic):
        raise ValueError("Automatic preparation settings are invalid")
    unknown = [item for item in automatic if item not in TASK_DEFINITIONS]
    if unknown:
        raise ValueError("Unknown automatic preparation tasks: " + ", ".join(unknown))

    command = value.get("runner_command", [])
    if not isinstance(command, list) or any(not isinstance(item, str) or not item.strip() for item in command):
        raise ValueError("Runner command must contain non-empty command arguments")

    overrides = {
        task_type: load_task_definition_override(storage_path, task_type)
        for task_type in TASK_DEFINITIONS
        if task_definition_path(storage_path, task_type).exists()
    }
    return {
        "automatic_preparation": list(dict.fromkeys(automatic)),
        "runner_command": list(command),
        "task_overrides": overrides,
    }


def save_workspace_settings(
    storage_path: str | Path,
    *,
    automatic_preparation: list[str],
    runner_command: list[str],
) -> Path:
    unknown = [task_type for task_type in automatic_preparation if task_type not in TASK_DEFINITIONS]
    if unknown:
        raise ValueError("Unknown automatic preparation tasks: " + ", ".join(unknown))
    command = [str(item).strip() for item in runner_command if str(item).strip()]
    target = config_path(storage_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "automatic_preparation": list(dict.fromkeys(automatic_preparation)),
        "runner_command": command,
    }
    target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return target


def ensure_task_definition_file(storage_path: str | Path, task_type: str) -> Path:
    target = task_definition_path(storage_path, task_type)
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(task_snapshot(task_type), indent=2) + "\n", encoding="utf-8")
    return target


def load_task_definition_override(storage_path: str | Path, task_type: str) -> dict[str, Any]:
    target = task_definition_path(storage_path, task_type)
    try:
        value = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid task definition {target.name}: {exc.msg}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"{target.name} must contain one task definition object")
    candidate = dict(value)
    candidate["task_type"] = task_type
    validate_task_snapshot(candidate)
    base = task_snapshot(task_type)
    return {
        key: candidate[key]
        for key in ("version", "title", "instructions", "response_format", "artifact_template", "artifact_mapping")
        if candidate.get(key) != base.get(key)
    }


def effective_task_snapshot(config: dict[str, Any], task_type: str) -> dict[str, Any]:
    override = config["task_overrides"].get(task_type)
    return task_snapshot(task_type, override if isinstance(override, dict) else None)
