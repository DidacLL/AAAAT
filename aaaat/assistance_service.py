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
from .runtime_conformance import read_conformance_state, run_configured_runtime_conformance
from .tasks import create_task, list_tasks

_VISIBLE_STATES = {"queued", "claimed", "in_progress", "blocked", "failed", "cancelled", "completed"}


def assistance_snapshot(
    storage_path: str | Path,
    *,
    include_advanced: bool = False,
    progress_by_task: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Return one presentation-neutral snapshot for the wx Assistance workspace."""
    progress_by_task = progress_by_task or {}
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
                "progress": dict(progress_by_task.get(str(task.get("id") or "")) or {}),
            }
            for task in list_tasks(conn)
            if str(task.get("state") or "") in _VISIBLE_STATES
        ]
    tasks.sort(key=lambda item: (item["state"] == "completed", item["updated_at"]), reverse=False)
    return {
        "integration": current_integration(storage_path),
        "options": integration_options(include_advanced=include_advanced),
        "conformance": read_conformance_state(storage_path),
        "tasks": tasks,
    }


def create_profile_completion_task(storage_path: str | Path) -> dict[str, Any]:
    with connect(storage_path) as conn:
        return create_task(
            conn,
            "profile_completion",
            "Complete professional profile",
            instructions="Suggest bounded values for eligible missing profile fields. Preserve non-empty user values.",
            state="queued",
            priority="high",
            context_hint="profile:completion",
            created_by="desktop",
            idempotent=True,
        )


def save_integration(storage_path: str | Path, adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    return configure_integration(storage_path, adapter_id, settings)


def use_recommended_local_integration(storage_path: str | Path) -> dict[str, Any]:
    return configure_recommended_local_integration(storage_path)


def use_manual_integration(storage_path: str | Path) -> dict[str, Any]:
    return disable_automatic_integration(storage_path)


def run_integration_conformance(storage_path: str | Path) -> dict[str, Any]:
    return run_configured_runtime_conformance(storage_path)
