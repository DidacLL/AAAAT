from __future__ import annotations

from pathlib import Path
from typing import Any

from .db import connect
from .host_connection import connection_status
from .integration_readiness import integration_readiness
from .integration_setup import (
    connection_modes,
    configure_integration,
    current_integration,
    disable_automatic_integration,
    integration_options,
)
from .tasks import create_task, list_tasks

_VISIBLE_STATES = {
    "queued",
    "claimed",
    "in_progress",
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
    advanced_command_active = (
        bool(integration.get("automatic"))
        and str(integration.get("id") or "") == "argv_custom_command"
    )
    with connect(storage_path) as conn:
        persisted_progress = _latest_progress_by_task(conn)
        persisted_progress.update(progress_by_task or {})
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
                    advanced_command_active
                    and str(task.get("state") or "") == "queued"
                ),
                "can_retry": str(task.get("state") or "")
                in {"failed", "cancelled"},
                "can_cancel": (
                    advanced_command_active
                    and str(task.get("state") or "")
                    in {"queued", "claimed", "in_progress"}
                ),
                "progress": dict(
                    persisted_progress.get(str(task.get("id") or "")) or {}
                ),
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
        "connection_modes": connection_modes(),
        "options": integration_options(include_advanced=include_advanced),
        "readiness": integration_readiness(storage_path),
        "tasks": tasks,
    }


def _latest_progress_by_task(conn: Any) -> dict[str, dict[str, Any]]:
    rows = conn.execute(
        """SELECT progress.task_id, progress.sequence, progress.phase,
                  progress.message, progress.percent, progress.created_at
           FROM agent_task_progress AS progress
           JOIN (
             SELECT task_id, MAX(sequence) AS sequence
             FROM agent_task_progress
             GROUP BY task_id
           ) AS latest
             ON latest.task_id = progress.task_id
            AND latest.sequence = progress.sequence"""
    ).fetchall()
    return {
        str(row["task_id"]): {
            "sequence": row["sequence"],
            "phase": row["phase"],
            "message": row["message"],
            "percent": row["percent"],
            "occurred_at": row["created_at"],
        }
        for row in rows
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
    adapter_id: str,
    settings: dict[str, Any],
) -> dict[str, Any]:
    return configure_integration(storage_path, adapter_id, settings)


def use_manual_integration(storage_path: str | Path) -> dict[str, Any]:
    return disable_automatic_integration(storage_path)
