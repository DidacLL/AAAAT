from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping

from .task_registry import (
    TASK_DEFINITIONS,
    default_automatic_task_types,
    task_snapshot,
    validate_task_snapshot,
)

CONFIG_VERSION = 1
SETTINGS_FILE = "settings.json"
TASK_DEFINITIONS_FILE = "task-definitions.json"
TEMPLATES_DIR = "templates"


class WorkspaceConfigError(ValueError):
    pass


def workspace_root(storage_path: str | Path) -> Path:
    path = Path(storage_path)
    return path.parent if path.suffix else path


def config_dir(storage_path: str | Path) -> Path:
    return workspace_root(storage_path) / "config"


def settings_path(storage_path: str | Path) -> Path:
    return config_dir(storage_path) / SETTINGS_FILE


def task_definitions_path(storage_path: str | Path) -> Path:
    return config_dir(storage_path) / TASK_DEFINITIONS_FILE


def templates_dir(storage_path: str | Path) -> Path:
    return config_dir(storage_path) / TEMPLATES_DIR


def default_settings() -> dict[str, Any]:
    return {
        "version": CONFIG_VERSION,
        "agent_command": "",
        "automatic_preparation": default_automatic_task_types(),
        "conditional_preparation": {
            "keyword_definition": "when_missing",
            "draft_form_responses": "when_form_present",
            "draft_cv": "manual",
            "draft_cover_letter": "manual",
        },
    }


def ensure_workspace_config(storage_path: str | Path) -> dict[str, Path]:
    from .db import default_cover_letter_template, default_cv_template

    root = config_dir(storage_path)
    template_root = templates_dir(storage_path)
    root.mkdir(parents=True, exist_ok=True)
    template_root.mkdir(parents=True, exist_ok=True)

    settings = settings_path(storage_path)
    if not settings.exists():
        settings.write_text(json.dumps(default_settings(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    definitions = task_definitions_path(storage_path)
    if not definitions.exists():
        definitions.write_text(
            json.dumps({"version": CONFIG_VERSION, "overrides": {}}, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    cv = template_root / "cv.tex"
    if not cv.exists():
        cv.write_text(default_cv_template().strip() + "\n", encoding="utf-8")
    cover_letter = template_root / "cover-letter.tex"
    if not cover_letter.exists():
        cover_letter.write_text(default_cover_letter_template().strip() + "\n", encoding="utf-8")

    return {
        "config_dir": root,
        "settings": settings,
        "task_definitions": definitions,
        "templates": template_root,
        "cv_template": cv,
        "cover_letter_template": cover_letter,
    }


def load_settings(storage_path: str | Path) -> dict[str, Any]:
    path = settings_path(storage_path)
    if not path.exists():
        raise WorkspaceConfigError(f"Workspace settings are missing: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise WorkspaceConfigError(f"Invalid workspace settings JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise WorkspaceConfigError("Workspace settings must contain one JSON object")
    merged = {**default_settings(), **value}
    _validate_settings(merged)
    return merged


def save_settings(storage_path: str | Path, settings: Mapping[str, Any]) -> dict[str, Any]:
    candidate = {**default_settings(), **dict(settings), "version": CONFIG_VERSION}
    _validate_settings(candidate)
    path = settings_path(storage_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(candidate, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return candidate


def load_task_overrides(storage_path: str | Path) -> dict[str, dict[str, Any]]:
    path = task_definitions_path(storage_path)
    if not path.exists():
        raise WorkspaceConfigError(f"Task definition overrides are missing: {path}")
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise WorkspaceConfigError(f"Invalid task definition JSON: {exc}") from exc
    if not isinstance(document, dict) or not isinstance(document.get("overrides", {}), dict):
        raise WorkspaceConfigError("task-definitions.json must contain an overrides object")
    overrides: dict[str, dict[str, Any]] = {}
    for task_type, override in document.get("overrides", {}).items():
        if task_type not in TASK_DEFINITIONS:
            raise WorkspaceConfigError(f"Unsupported task definition override: {task_type}")
        if not isinstance(override, dict):
            raise WorkspaceConfigError(f"Override for {task_type} must be an object")
        snapshot = task_snapshot(task_type, override)
        validate_task_snapshot(snapshot)
        overrides[task_type] = dict(override)
    return overrides


def effective_task_snapshot(storage_path: str | Path, task_type: str) -> dict[str, Any]:
    overrides = load_task_overrides(storage_path)
    override = overrides.get(task_type)
    snapshot = task_snapshot(task_type, override)
    validate_task_snapshot(snapshot)
    return snapshot


def template_path(storage_path: str | Path, template_name: str) -> Path:
    cleaned = str(template_name or "").strip()
    if cleaned not in {"cv", "cover-letter"}:
        raise WorkspaceConfigError(f"Unsupported local template: {cleaned}")
    return templates_dir(storage_path) / f"{cleaned}.tex"


def load_template(storage_path: str | Path, template_name: str) -> str:
    path = template_path(storage_path, template_name)
    if not path.exists():
        raise WorkspaceConfigError(f"Template file is missing: {path}")
    text = path.read_text(encoding="utf-8")
    if not text.strip():
        raise WorkspaceConfigError(f"Template file is empty: {path}")
    return text


def validate_workspace_config(storage_path: str | Path) -> dict[str, Any]:
    settings = load_settings(storage_path)
    overrides = load_task_overrides(storage_path)
    template_names = {
        snapshot.get("artifact_template")
        for task_type in TASK_DEFINITIONS
        for snapshot in [task_snapshot(task_type, overrides.get(task_type))]
        if snapshot.get("artifact_template")
    }
    templates = {}
    for name in sorted(template_names):
        templates[str(name)] = str(template_path(storage_path, str(name)))
        load_template(storage_path, str(name))
    return {
        "settings": settings,
        "task_overrides": sorted(overrides),
        "templates": templates,
    }


def _validate_settings(settings: Mapping[str, Any]) -> None:
    if int(settings.get("version", CONFIG_VERSION)) != CONFIG_VERSION:
        raise WorkspaceConfigError(f"Unsupported workspace config version: {settings.get('version')}")
    command = settings.get("agent_command", "")
    if not isinstance(command, str):
        raise WorkspaceConfigError("agent_command must be a string")
    automatic = settings.get("automatic_preparation")
    if not isinstance(automatic, list):
        raise WorkspaceConfigError("automatic_preparation must be a list")
    invalid = [item for item in automatic if item not in TASK_DEFINITIONS or item == "keyword_definition"]
    if invalid:
        raise WorkspaceConfigError(f"Unsupported automatic preparation entries: {invalid}")
    conditional = settings.get("conditional_preparation")
    if not isinstance(conditional, Mapping):
        raise WorkspaceConfigError("conditional_preparation must be an object")
    allowed_modes = {
        "keyword_definition": {"when_missing", "disabled"},
        "draft_form_responses": {"when_form_present", "always", "manual", "disabled"},
        "draft_cv": {"always", "manual", "disabled"},
        "draft_cover_letter": {"always", "manual", "disabled"},
    }
    for task_type, modes in allowed_modes.items():
        mode = str(conditional.get(task_type, default_settings()["conditional_preparation"][task_type]))
        if mode not in modes:
            raise WorkspaceConfigError(f"Invalid conditional preparation mode for {task_type}: {mode}")
