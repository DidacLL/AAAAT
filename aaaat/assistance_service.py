from __future__ import annotations

from pathlib import Path
from typing import Any

from .db import connect
from .host_connection import connection_status
from .integration_readiness import integration_readiness
from .integration_setup import (
    configure_integration,
    current_integration,
    disconnect_integration,
    integration_options,
)
from .tasks import create_task, list_tasks

_VISIBLE_STATES = {
    "queued",
    "claimed",
    "blocked",
    "failed",
    "cancelled",
    "completed",
}


def assistance_snapshot(
    storage_path: str | Path,
    *,
    include_advanced: bool = False,
    progress_by_task: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    integration = current_integration(storage_path)
    user_command_active = (
        bool(integration.get("automatic"))
        and str(integration.get("id") or "") == "user_command"
    )
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
                "can_run": (
                    user_command_active
                    and str(task.get("state") or "") == "queued"
                ),
                "can_retry": str(task.get("state") or "")
                in {"failed", "cancelled"},
                "can_cancel": (
                    user_command_active
                    and str(task.get("state") or "") in {"queued", "claimed"}
                ),
                "progress": dict((progress_by_task or {}).get(str(task.get("id") or "")) or {}),
            }
            for task in list_tasks(conn)
            if str(task.get("state") or "") in _VISIBLE_STATES
        ]
    tasks.sort(
        key=lambda item: (item["state"] == "completed", item["updated_at"]),
        reverse=False,
    )
    return {
        "connection": connection_status(storage_path),
        "integration": integration,
        "options": integration_options(include_advanced=include_advanced),
        "readiness": integration_readiness(storage_path),
        "tasks": tasks,
    }


def create_profile_completion_task(storage_path: str | Path) -> dict[str, Any]:
    with connect(storage_path) as conn:
        return create_task(
            conn,
            "profile_completion",
            "Add professional profile information",
            instructions=(
                "Discuss the profile naturally and return only eligible missing "
                "values the user chooses to provide. Preserve non-empty user values."
            ),
            state="queued",
            priority="high",
            context_hint="profile:completion",
            created_by="desktop_action",
            idempotent=True,
        )


def save_integration(
    storage_path: str | Path,
    method_id: str,
    settings: dict[str, Any],
) -> dict[str, Any]:
    return configure_integration(storage_path, method_id, settings)


def use_manual_integration(storage_path: str | Path) -> dict[str, Any]:
    return disconnect_integration(storage_path)
