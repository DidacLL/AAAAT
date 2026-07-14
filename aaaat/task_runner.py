from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any, Callable

from .agent_access import build_agent_task_context, submit_agent_task_result, task_handle
from .db import connect, utc_now
from .local_cli_runtime import build_local_cli_invocation
from .local_model_protocol import build_local_model_prompt, extract_json_object
from .provider_adapters import adapter_definition, validate_adapter_settings
from .tasks import get_task, update_task
from .workspace_config import load_workspace_config

ProgressCallback = Callable[[dict[str, Any]], None]


class TaskRunnerError(RuntimeError):
    pass


class TaskRunner:
    """Run one bounded AAAAT task through the configured external runtime."""

    def __init__(self, storage_path: str | Path, *, on_progress: ProgressCallback | None = None) -> None:
        self.storage_path = str(storage_path)
        self.on_progress = on_progress or (lambda _event: None)
        self._sequence = 0

    def run(self, task_id: str) -> dict[str, Any]:
        self._sequence = 0
        config = load_workspace_config(self.storage_path)
        adapter_config = config["local_agent_adapter"]
        adapter_id = str(adapter_config["id"])
        adapter = adapter_definition(adapter_id)
        if not adapter.automatic_execution:
            raise TaskRunnerError(
                f"{adapter.title} is not an automatic integration. Export the grouped bounded task bundle and import its result."
            )

        self._emit(task_id, "preparing_context", "Preparing bounded task context", 5)
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") not in {"queued", "blocked", "failed"}:
                raise TaskRunnerError(f"Task cannot run from state {task.get('state')}")
            update_task(conn, task_id, state="in_progress", notes="")
            context = build_agent_task_context(conn, task_handle(task))

        try:
            self._emit(task_id, "invoking_runtime", f"Running through {adapter.title}", 25)
            body, provenance = self._execute_adapter(adapter_id, adapter_config.get("settings") or {}, context)
            self._emit(task_id, "validating_result", "Validating structured result", 70)
        except (OSError, ValueError, TaskRunnerError, subprocess.TimeoutExpired) as exc:
            self._fail(task_id, str(exc))
            self._emit(task_id, "failed", str(exc), 100)
            raise TaskRunnerError(str(exc)) from exc

        self._emit(task_id, "applying_result", "Applying permitted result through AAAAT", 85)
        with connect(self.storage_path) as conn:
            current = get_task(conn, task_id)
            if current.get("state") == "cancelled":
                self._emit(task_id, "cancelled", "Task cancelled before result application", 100)
                return {"task": current, "cancelled": True}
            submitted = submit_agent_task_result(
                conn,
                task_handle(current),
                body,
                agent_name=str(provenance.get("agent_name") or ""),
                agent_runtime=str(provenance.get("agent_runtime") or f"local-adapter:{adapter_id}"),
                model_provider=str(provenance.get("model_provider") or ""),
            )
            final = get_task(conn, task_id)
        self._emit(task_id, "completed", "Task completed", 100)
        return {"submitted": submitted, "task": final, "provenance": provenance}

    def _execute_adapter(
        self,
        adapter_id: str,
        settings: dict[str, Any],
        context: dict[str, Any],
    ) -> tuple[str, dict[str, str]]:
        normalized = validate_adapter_settings(adapter_id, settings)
        timeout = int(normalized.get("timeout_seconds") or 60)

        if adapter_id in {"ollama_cli", "llama_cpp_cli"}:
            prompt = build_local_model_prompt(context)
            with build_local_cli_invocation(adapter_id, normalized, prompt) as invocation:
                output = self._run_stdio(
                    list(invocation.argv),
                    invocation.input_body,
                    timeout,
                    validate_result=False,
                )
                return extract_json_object(output), dict(invocation.provenance)

        if adapter_id == "codex_cli":
            argv = [str(normalized.get("executable") or "codex"), *list(normalized.get("args") or [])]
            body = self._run_stdio(argv, json.dumps(context, ensure_ascii=False), timeout)
            return body, {"agent_runtime": "codex-cli", "model_provider": "host-reported"}

        if adapter_id == "argv_custom_command":
            argv = list(normalized.get("argv") or [])
            if not argv:
                raise TaskRunnerError("Local command adapter is not configured")
            body = self._run_stdio(argv, json.dumps(context, ensure_ascii=False), timeout)
            return body, {"agent_runtime": "user-owned-command"}

        raise TaskRunnerError(f"Local adapter '{adapter_id}' is not executable")

    def _run_stdio(
        self,
        argv: list[str],
        input_body: str | None,
        timeout: int,
        *,
        validate_result: bool = True,
    ) -> str:
        completed = subprocess.run(
            argv,
            input=input_body,
            text=True,
            capture_output=True,
            check=False,
            timeout=timeout,
        )
        if completed.returncode != 0:
            message = (completed.stderr or completed.stdout or f"Runner exited with {completed.returncode}").strip()
            raise TaskRunnerError(message[:4000])
        body = completed.stdout.strip()
        if not body:
            raise TaskRunnerError("External runtime returned no result")
        if validate_result:
            try:
                value = json.loads(body)
            except json.JSONDecodeError as exc:
                raise TaskRunnerError(f"External runtime returned invalid JSON: {exc.msg}") from exc
            if not isinstance(value, dict):
                raise TaskRunnerError("External runtime result must be one JSON object")
        return body

    def _emit(self, task_id: str, phase: str, message: str, percent: int) -> None:
        self._sequence += 1
        self.on_progress(
            {
                "task_id": task_id,
                "state": phase,
                "phase": phase,
                "message": message,
                "percent": max(0, min(100, int(percent))),
                "sequence": self._sequence,
                "occurred_at": utc_now(),
            }
        )

    def _fail(self, task_id: str, message: str) -> None:
        with connect(self.storage_path) as conn:
            current = get_task(conn, task_id)
            if current.get("state") != "cancelled":
                conn.execute(
                    "UPDATE tasks SET state = ?, notes = ?, updated_at = ? WHERE id = ?",
                    ("failed", message[:4000], utc_now(), task_id),
                )
                conn.commit()
