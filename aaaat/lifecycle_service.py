from __future__ import annotations

from pathlib import Path
from typing import Any

from .candidature_lifecycle import ensure_lifecycle_tasks, lifecycle_plan, release_ready_lifecycle_tasks
from .db import connect
from .integration_setup import current_integration
from .task_runner import TaskRunner
from .tasks import list_tasks


def candidature_lifecycle_snapshot(storage_path: str | Path, candidature_ref: str) -> dict[str, Any]:
    integration = current_integration(storage_path)
    research_capable = bool(integration.get("research_capable"))
    with connect(storage_path) as conn:
        plan = lifecycle_plan(conn, candidature_ref, research_capable=research_capable)
        tasks = list_tasks(conn, application_id=candidature_ref)
    return {
        "candidature_ref": candidature_ref,
        "integration": {
            "id": integration.get("id"),
            "title": integration.get("title"),
            "automatic": bool(integration.get("automatic")),
            "research_capable": research_capable,
        },
        "plan": plan,
        "tasks": tasks,
    }


def plan_candidature_lifecycle(storage_path: str | Path, candidature_ref: str) -> dict[str, Any]:
    integration = current_integration(storage_path)
    with connect(storage_path) as conn:
        ensure_lifecycle_tasks(conn, candidature_ref, research_capable=bool(integration.get("research_capable")))
        release_ready_lifecycle_tasks(conn, candidature_ref)
    return candidature_lifecycle_snapshot(storage_path, candidature_ref)


def run_ready_candidature_tasks(storage_path: str | Path, candidature_ref: str) -> dict[str, Any]:
    """Run currently queued lifecycle tasks synchronously for CLI/tests.

    wx must call the owned background worker instead of this helper.
    """
    runner = TaskRunner(storage_path)
    completed: list[str] = []
    failed: list[dict[str, str]] = []
    while True:
        with connect(storage_path) as conn:
            release_ready_lifecycle_tasks(conn, candidature_ref)
            queued = [task for task in list_tasks(conn, application_id=candidature_ref) if str(task.get("state") or "") == "queued"]
        if not queued:
            break
        for task in queued:
            task_id = str(task.get("id") or "")
            try:
                runner.run(task_id)
                completed.append(task_id)
            except Exception as exc:
                failed.append({"task_id": task_id, "error": str(exc)[:1000]})
        if failed:
            break
    snapshot = candidature_lifecycle_snapshot(storage_path, candidature_ref)
    snapshot.update({"completed_task_ids": completed, "failed": failed})
    return snapshot
