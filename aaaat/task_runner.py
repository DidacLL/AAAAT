from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from .agent_access import build_agent_task_context, submit_agent_task_result, task_handle
from .db import connect
from .tasks import apply_task_result, get_task, update_task
from .workspace_config import load_workspace_config


class TaskRunnerError(RuntimeError):
    pass


class TaskRunner:
    """Run one bounded task through the user-configured external command."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def run(self, task_id: str) -> dict[str, Any]:
        config = load_workspace_config(self.storage_path)
        command = list(config["runner_command"])
        if not command:
            raise TaskRunnerError("No runner command is configured in aaaat-config.json")
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") not in {"queued", "blocked"}:
                raise TaskRunnerError(f"Task cannot run from state {task.get('state')}")
            update_task(conn, task_id, state="in_progress", notes="")
            context = build_agent_task_context(conn, task_handle(task))
        try:
            completed = subprocess.run(
                command,
                input=json.dumps(context, ensure_ascii=False),
                text=True,
                capture_output=True,
                check=False,
            )
        except OSError as exc:
            self._block(task_id, str(exc))
            raise TaskRunnerError(str(exc)) from exc
        if completed.returncode != 0:
            message = (completed.stderr or completed.stdout or f"Runner exited with {completed.returncode}").strip()
            self._block(task_id, message)
            raise TaskRunnerError(message)
        body = completed.stdout.strip()
        if not body:
            self._block(task_id, "Runner returned no result")
            raise TaskRunnerError("Runner returned no result")
        with connect(self.storage_path) as conn:
            submitted = submit_agent_task_result(
                conn,
                task_handle(get_task(conn, task_id)),
                body,
                agent_runtime="configured-command",
            )
            applied = apply_task_result(conn, task_id)
            return {"submitted": submitted, "task": applied}

    def _block(self, task_id: str, message: str) -> None:
        with connect(self.storage_path) as conn:
            update_task(conn, task_id, state="blocked", notes=message[:4000])
