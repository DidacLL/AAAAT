from __future__ import annotations

from pathlib import Path
from typing import Any

from .db import connect
from .integration_setup import (
    configure_integration,
    configure_recommended_local_integration,
    current_integration,
    disable_automatic_integration,
    integration_options,
)
from .tasks import list_tasks


_VISIBLE_STATES = {"queued", "claimed", "in_progress", "blocked", "failed", "cancelled", "completed"}


def assistance_snapshot(storage_path: str | Path, *, include_advanced: bool = False) -> dict[str, Any]:
    """Return one presentation-neutral snapshot for the wx Assistance workspace."""

    with connect(storage_path) as conn:
        tasks = [
            {
                "id": str(task.get("id") or ""),
                "title": str(task.get("title") or task.get("task_type") or "Task"),
                "task_type": str(task.get("task_type") or ""),
                "state": str(task.get("state") or ""),
                "priority": str(task.get("priority") or "normal"),
                "notes": str(task.get("notes") or ""),
                "updated_at": str(task.get("updated_at") or ""),
                "can_run": str(task.get("state") or "") in {"queued", "blocked"},
                "can_retry": str(task.get("state") or "") in {"failed", "cancelled"},
                "can_cancel": str(task.get("state") or "") in {"queued", "claimed", "in_progress", "blocked", "failed"},
            }
            for task in list_tasks(conn)
            if str(task.get("state") or "") in _VISIBLE_STATES
        ]
    tasks.sort(key=lambda item: (item["state"] == "completed", item["updated_at"]), reverse=False)
    return {
        "integration": current_integration(storage_path),
        "options": integration_options(include_advanced=include_advanced),
        "tasks": tasks,
    }


def save_integration(storage_path: str | Path, adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    return configure_integration(storage_path, adapter_id, settings)


def use_recommended_local_integration(storage_path: str | Path) -> dict[str, Any]:
    return configure_recommended_local_integration(storage_path)


def use_manual_integration(storage_path: str | Path) -> dict[str, Any]:
    return disable_automatic_integration(storage_path)
