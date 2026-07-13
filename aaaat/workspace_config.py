from __future__ import annotations

import json
import shlex
from pathlib import Path
from typing import Any

from .task_registry import TASK_DEFINITIONS, automatic_task_types


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
    value = json.loads(target.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("aaaat-config.json must contain a JSON object")
    automatic = value.get("automatic_preparation", DEFAULT_CONFIG["automatic_preparation"])
    if not isinstance(automatic, list):
        raise ValueError("automatic_preparation must be a JSON array")
    unknown = [str(item) for item in automatic if str(item) not in TASK_DEFINITIONS]
    if unknown:
        raise ValueError("Unknown automatic preparation tasks: " + ", ".join(unknown))
    command = value.get("runner_command", [])
    if isinstance(command, str):
        command = shlex.split(command)
    if not isinstance(command, list) or any(not isinstance(item, str) or not item.strip() for item in command):
        raise ValueError("runner_command must be a JSON array of command arguments")
    overrides = value.get("task_overrides", {})
    if not isinstance(overrides, dict):
        raise ValueError("task_overrides must be a JSON object")
    return {
        "automatic_preparation": [str(item) for item in automatic],
        "runner_command": command,
        "task_overrides": overrides,
    }


def task_instructions(storage_path: str | Path, task_type: str, default: str) -> str:
    config = load_workspace_config(storage_path)
    override = config["task_overrides"].get(task_type)
    if not isinstance(override, dict):
        return default
    instructions = override.get("instructions")
    return str(instructions).strip() if instructions else default
