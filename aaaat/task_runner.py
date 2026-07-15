from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any, Callable

from .agent_access import build_agent_work_item, task_capability
from .candidature_lifecycle import release_ready_lifecycle_tasks
from .db import connect, utc_now
from .provider_adapters import adapter_definition
from .result_ingestion import ingest_task_result
from .subprocess_output import subprocess_failure_message
from .task_transports import execute_configured_transport
from .tasks import get_task, update_task
from .workspace_config import load_workspace_config, storage_directory

ProgressCallback = Callable[[dict[str, Any]], None]
_MAX_STDOUT_BYTES = 2_000_000
_MAX_STDERR_BYTES = 500_000
_MAX_PROGRESS_EVENTS = 200


class TaskRunnerError(RuntimeError):
    pass


class TaskRunner:
    """Run one bounded work item through the explicit Advanced command transport."""

    def __init__(self, storage_path: str | Path, *, on_progress: ProgressCallback | None = None) -> None:
        self.storage_path = str(storage_path)
        self.on_progress = on_progress or (lambda _event: None)
        self._sequence = 0
        self._active_task_id = ""
        self._external_progress_count = 0

    def run(self, task_id: str) -> dict[str, Any]:
        self._sequence = 0
        self._active_task_id = task_id
        self._external_progress_count = 0
        config = load_workspace_config(self.storage_path)
        adapter_config = config["local_agent_adapter"]
        adapter_id = str(adapter_config["id"])
        adapter = adapter_definition(adapter_id)
        if not adapter.automatic_execution:
            raise TaskRunnerError(f"{adapter.title} is not an automatic integration. Export bounded work and import its result.")
        self._emit(task_id, "preparing_context", "Preparing bounded work item", 5)
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") not in {"queued", "blocked", "failed"}:
                raise TaskRunnerError(f"Task cannot run from state {task.get('state')}")
            update_task(conn, task_id, state="in_progress", notes="")
            work_item = build_agent_work_item(conn, task)
            capability = task_capability(conn, task)
        try:
            self._emit(task_id, "invoking_runtime", f"Running through {adapter.title}", 25)
            body, provenance = self._execute_adapter(adapter_id, adapter_config.get("settings") or {}, work_item)
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
            submitted = ingest_task_result(
                conn,
                capability,
                body,
                provenance=provenance,
                default_agent_runtime=f"configured-adapter:{adapter_id}",
            )
            application_id = str(current.get("application_id") or "")
            released = release_ready_lifecycle_tasks(conn, application_id) if application_id else []
            final = get_task(conn, task_id)
        self._emit(task_id, "completed", "Task completed", 100)
        return {"submitted": submitted, "task": final, "provenance": provenance, "released_tasks": released}

    def _execute_adapter(self, adapter_id: str, settings: dict[str, Any], context: dict[str, Any]) -> tuple[str, dict[str, str]]:
        execution = execute_configured_transport(adapter_id, settings, context, run_stdio=self._run_stdio)
        return execution.body, dict(execution.provenance)

    def _run_stdio(self, argv: list[str], input_body: str | None, timeout: int, *, validate_result: bool = True) -> str:
        environment = dict(os.environ)
        environment.setdefault("NO_COLOR", "1")
        environment.setdefault("TERM", "dumb")
        environment.setdefault("CI", "1")
        completed = subprocess.run(argv, input=input_body, text=True, capture_output=True, check=False, timeout=timeout, env=environment)
        stdout = completed.stdout or ""
        stderr = completed.stderr or ""
        if len(stdout.encode("utf-8", errors="replace")) > _MAX_STDOUT_BYTES:
            raise TaskRunnerError("External runtime stdout exceeded the 2 MB safety limit")
        if len(stderr.encode("utf-8", errors="replace")) > _MAX_STDERR_BYTES:
            raise TaskRunnerError("External runtime stderr exceeded the 500 KB safety limit")
        self._consume_structured_stderr(stderr)
        if completed.returncode != 0:
            raise TaskRunnerError(subprocess_failure_message(stderr, stdout, completed.returncode))
        body = stdout.strip()
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

    def _consume_structured_stderr(self, stderr: str) -> None:
        if not self._active_task_id:
            return
        for line in stderr.splitlines():
            if self._external_progress_count >= _MAX_PROGRESS_EVENTS:
                break
            try:
                value = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(value, dict) or str(value.get("type") or value.get("event") or "") not in {"progress", "aaaat_progress"}:
                continue
            self._external_progress_count += 1
            message = str(value.get("message") or value.get("phase") or "External runtime progress")[:1000]
            percent = max(25, min(69, int(value.get("percent") or 25)))
            self._emit(self._active_task_id, "runtime_progress", message, percent)

    def _emit(self, task_id: str, phase: str, message: str, percent: int) -> None:
        self._sequence += 1
        event = {
            "task_id": task_id,
            "state": phase,
            "phase": phase,
            "message": str(message)[:2000],
            "percent": max(0, min(100, int(percent))),
            "sequence": self._sequence,
            "occurred_at": utc_now(),
        }
        self._persist_progress(event)
        self.on_progress(event)

    def _persist_progress(self, event: dict[str, Any]) -> None:
        safe_task_id = "".join(char for char in str(event.get("task_id") or "") if char.isalnum() or char in {"-", "_"})[:96]
        if not safe_task_id:
            return
        root = storage_directory(self.storage_path) / "task-progress"
        root.mkdir(parents=True, exist_ok=True)
        with (root / f"{safe_task_id}.ndjson").open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")

    def _fail(self, task_id: str, message: str) -> None:
        with connect(self.storage_path) as conn:
            current = get_task(conn, task_id)
            if current.get("state") != "cancelled":
                conn.execute(
                    "UPDATE tasks SET state = ?, notes = ?, updated_at = ? WHERE id = ?",
                    ("failed", message[:4000], utc_now(), task_id),
                )
                conn.commit()
