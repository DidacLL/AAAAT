from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from .agent_access import build_agent_task_context, submit_agent_task_result, task_handle
from .db import connect, utc_now
from .provider_adapters import adapter_definition
from .tasks import get_task, update_task
from .workspace_config import load_workspace_config


class TaskRunnerError(RuntimeError):
    pass


class TaskRunner:
    """Run one bounded AAAAT task through the configured local adapter."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def run(self, task_id: str) -> dict[str, Any]:
        config = load_workspace_config(self.storage_path)
        adapter_config = config["local_agent_adapter"]
        adapter_id = str(adapter_config["id"])
        adapter = adapter_definition(adapter_id)
        if not adapter.automatic_execution:
            raise TaskRunnerError(
                f"{adapter.title} is a guided adapter. Export the task packet, run it in the chosen external agent, then submit the JSON result."
            )

        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") not in {"queued", "blocked", "failed"}:
                raise TaskRunnerError(f"Task cannot run from state {task.get('state')}")
            update_task(conn, task_id, state="in_progress", notes="")
            context = build_agent_task_context(conn, task_handle(task))

        try:
            body = self._execute_adapter(adapter_id, adapter_config.get("settings") or {}, context)
        except (OSError, ValueError, TaskRunnerError, subprocess.TimeoutExpired) as exc:
            self._fail(task_id, str(exc))
            raise TaskRunnerError(str(exc)) from exc

        with connect(self.storage_path) as conn:
            current = get_task(conn, task_id)
            if current.get("state") == "cancelled":
                return {"task": current, "cancelled": True}
            submitted = submit_agent_task_result(
                conn,
                task_handle(current),
                body,
                agent_runtime=f"local-adapter:{adapter_id}",
            )
            return {"submitted": submitted, "task": get_task(conn, task_id)}

    def _execute_adapter(self, adapter_id: str, settings: dict[str, Any], context: dict[str, Any]) -> str:
        if adapter_id != "argv_custom_command":
            raise TaskRunnerError(f"Local adapter '{adapter_id}' is not executable")
        argv = list(settings.get("argv") or [])
        if not argv:
            raise TaskRunnerError("Custom argv command is not configured")
        completed = subprocess.run(
            argv,
            input=json.dumps(context, ensure_ascii=False),
            text=True,
            capture_output=True,
            check=False,
            timeout=int(settings.get("timeout_seconds") or 60),
        )
        if completed.returncode != 0:
            message = (completed.stderr or completed.stdout or f"Runner exited with {completed.returncode}").strip()
            raise TaskRunnerError(message[:4000])
        body = completed.stdout.strip()
        if not body:
            raise TaskRunnerError("Local adapter returned no result")
        return body

    def _fail(self, task_id: str, message: str) -> None:
        with connect(self.storage_path) as conn:
            current = get_task(conn, task_id)
            if current.get("state") != "cancelled":
                conn.execute(
                    "UPDATE tasks SET state = ?, notes = ?, updated_at = ? WHERE id = ?",
                    ("failed", message[:4000], utc_now(), task_id),
                )
                conn.commit()
