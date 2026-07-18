from __future__ import annotations

import json
import os
import sqlite3
import subprocess
from pathlib import Path
from typing import Any, Callable

from .agent_access import build_agent_work_item, task_capability
from .agent_work import claim_agent_work
from .bounded_subprocess import OutputLimitExceeded, run_bounded_process
from .db import connect, utc_now
from .result_ingestion import ingest_task_result
from .subprocess_output import subprocess_failure_message
from .task_transports import execute_configured_transport
from .tasks import get_task
from .workspace_config import load_workspace_config

ProgressCallback = Callable[[dict[str, Any]], None]
_MAX_STDOUT_BYTES = 2_000_000
_MAX_STDERR_BYTES = 500_000
_MAX_PROGRESS_EVENTS = 200


class TaskRunnerError(RuntimeError):
    pass


class TaskRunner:
    """Run one ready bounded work item through an explicit user-owned command."""

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
        method_config = config["integration"]
        method_id = str(method_config["id"])
        if method_id != "user_command":
            raise TaskRunnerError("The selected integration method does not execute tasks automatically.")

        self._emit(task_id, "preparing_context", "Preparing bounded work item", 5)
        try:
            with connect(self.storage_path) as conn:
                task = claim_agent_work(conn, task_id, notes="")
                work_item = build_agent_work_item(conn, task)
                capability = task_capability(conn, task)
        except (KeyError, ValueError, sqlite3.Error) as exc:
            raise TaskRunnerError(str(exc)) from exc

        try:
            self._emit(task_id, "invoking_runtime", "Running the user-owned command", 25)
            body, provenance = self._execute_method(
                method_id,
                method_config.get("settings") or {},
                work_item,
            )
            self._emit(task_id, "validating_result", "Validating structured result", 70)
        except (OSError, ValueError, TaskRunnerError, subprocess.TimeoutExpired) as exc:
            self._fail(task_id, str(exc))
            self._emit(task_id, "failed", str(exc), 100)
            raise TaskRunnerError(str(exc)) from exc

        self._emit(task_id, "applying_result", "Applying permitted result through AAAAT", 85)
        try:
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
                    default_agent_runtime="user-owned-command",
                )
                final = get_task(conn, task_id)
        except (KeyError, TypeError, ValueError, sqlite3.Error) as exc:
            message = f"External runtime result was not accepted: {exc}"
            self._fail(task_id, message)
            self._emit(task_id, "failed", message, 100)
            raise TaskRunnerError(message) from exc

        self._emit(task_id, "completed", "Task completed", 100)
        return {"submitted": submitted, "task": final, "provenance": provenance}

    def _execute_method(
        self,
        method_id: str,
        settings: dict[str, Any],
        context: dict[str, Any],
    ) -> tuple[str, dict[str, str]]:
        execution = execute_configured_transport(
            method_id,
            settings,
            context,
            run_stdio=self._run_stdio,
        )
        return execution.body, dict(execution.provenance)

    def _run_stdio(
        self,
        argv: list[str],
        input_body: str | None,
        timeout: int,
        *,
        validate_result: bool = True,
    ) -> str:
        environment = dict(os.environ)
        environment.setdefault("NO_COLOR", "1")
        environment.setdefault("TERM", "dumb")
        environment.setdefault("CI", "1")
        try:
            completed = run_bounded_process(
                argv,
                input_text=input_body,
                timeout_seconds=timeout,
                stdout_limit_bytes=_MAX_STDOUT_BYTES,
                stderr_limit_bytes=_MAX_STDERR_BYTES,
                environment=environment,
            )
        except OutputLimitExceeded as exc:
            if exc.stream_name == "stdout":
                raise TaskRunnerError("External runtime stdout exceeded the 2 MB safety limit") from exc
            raise TaskRunnerError("External runtime stderr exceeded the 500 KB safety limit") from exc

        stdout = completed.stdout
        stderr = completed.stderr
        self._consume_structured_stderr(stderr)
        if completed.returncode != 0:
            raise TaskRunnerError(
                subprocess_failure_message(stderr, stdout, completed.returncode)
            )
        body = stdout.strip()
        if not body:
            raise TaskRunnerError("External runtime returned no result")
        if validate_result:
            try:
                value = json.loads(body)
            except json.JSONDecodeError as exc:
                raise TaskRunnerError(
                    f"External runtime returned invalid JSON: {exc.msg}"
                ) from exc
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
            if (
                not isinstance(value, dict)
                or str(value.get("type") or value.get("event") or "")
                not in {"progress", "aaaat_progress"}
            ):
                continue
            self._external_progress_count += 1
            message = str(
                value.get("message") or value.get("phase") or "External runtime progress"
            )[:1000]
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
        self.on_progress(event)

    def _fail(self, task_id: str, message: str) -> None:
        with connect(self.storage_path) as conn:
            current = get_task(conn, task_id)
            if current.get("state") != "cancelled":
                conn.execute(
                    "UPDATE tasks SET state = ?, notes = ?, updated_at = ? WHERE id = ?",
                    ("failed", message[:4000], utc_now(), task_id),
                )
                conn.execute("DELETE FROM agent_task_capabilities WHERE task_id = ?", (task_id,))
                conn.commit()
