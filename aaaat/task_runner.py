from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from .agent_access import build_agent_task_context, submit_agent_task_result, task_handle
from .db import connect
from .provider_adapters import adapter_definition
from .tasks import get_task, update_task
from .workspace_config import load_workspace_config


class TaskRunnerError(RuntimeError):
    pass


class TaskRunner:
    """Run one bounded task through the selected provider adapter."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def run(self, task_id: str) -> dict[str, Any]:
        config = load_workspace_config(self.storage_path)
        adapter_config = config["provider_adapter"]
        adapter_id = str(adapter_config["id"])
        adapter = adapter_definition(adapter_id)
        if not adapter.automatic_execution:
            raise TaskRunnerError(
                f"{adapter.title} does not run tasks automatically. Complete this task through your connected agent or choose a provider adapter in Preparation settings."
            )

        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") not in {"queued", "blocked"}:
                raise TaskRunnerError(f"Task cannot run from state {task.get('state')}")
            update_task(conn, task_id, state="in_progress", notes="")
            context = build_agent_task_context(conn, task_handle(task))

        try:
            body = self._execute_adapter(adapter_id, adapter_config.get("settings") or {}, context)
        except (OSError, ValueError, TaskRunnerError) as exc:
            self._block(task_id, str(exc))
            raise TaskRunnerError(str(exc)) from exc

        with connect(self.storage_path) as conn:
            submitted = submit_agent_task_result(
                conn,
                task_handle(get_task(conn, task_id)),
                body,
                agent_runtime=f"provider-adapter:{adapter_id}",
            )
            task = get_task(conn, task_id)
            return {"submitted": submitted, "task": task}

    def _execute_adapter(self, adapter_id: str, settings: dict[str, Any], context: dict[str, Any]) -> str:
        if adapter_id != "custom_command":
            raise TaskRunnerError(f"Provider adapter '{adapter_id}' is registered but has no executor")
        command = list(settings.get("command") or [])
        if not command:
            raise TaskRunnerError("Custom command is not configured")
        completed = subprocess.run(
            command,
            input=json.dumps(context, ensure_ascii=False),
            text=True,
            capture_output=True,
            check=False,
        )
        if completed.returncode != 0:
            raise TaskRunnerError((completed.stderr or completed.stdout or f"Runner exited with {completed.returncode}").strip())
        body = completed.stdout.strip()
        if not body:
            raise TaskRunnerError("Provider adapter returned no result")
        return body

    def _block(self, task_id: str, message: str) -> None:
        with connect(self.storage_path) as conn:
            update_task(conn, task_id, state="blocked", notes=message[:4000])
