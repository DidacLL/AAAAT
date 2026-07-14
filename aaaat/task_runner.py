from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from .agent_access import build_agent_task_context, submit_agent_task_result, task_handle
from .db import connect, utc_now
from .local_model_protocol import build_local_model_prompt, extract_json_object
from .provider_adapters import adapter_definition, validate_adapter_settings
from .tasks import get_task, update_task
from .workspace_config import load_workspace_config


class TaskRunnerError(RuntimeError):
    pass


class TaskRunner:
    """Run one bounded AAAAT task through the configured external runtime."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def run(self, task_id: str) -> dict[str, Any]:
        config = load_workspace_config(self.storage_path)
        adapter_config = config["local_agent_adapter"]
        adapter_id = str(adapter_config["id"])
        adapter = adapter_definition(adapter_id)
        if not adapter.automatic_execution:
            raise TaskRunnerError(
                f"{adapter.title} is not an automatic integration. Export the grouped bounded task bundle and import its result."
            )

        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") not in {"queued", "blocked", "failed"}:
                raise TaskRunnerError(f"Task cannot run from state {task.get('state')}")
            update_task(conn, task_id, state="in_progress", notes="")
            context = build_agent_task_context(conn, task_handle(task))

        try:
            body, provenance = self._execute_adapter(adapter_id, adapter_config.get("settings") or {}, context)
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
                agent_name=str(provenance.get("agent_name") or ""),
                agent_runtime=str(provenance.get("agent_runtime") or f"local-adapter:{adapter_id}"),
                model_provider=str(provenance.get("model_provider") or ""),
            )
            return {"submitted": submitted, "task": get_task(conn, task_id), "provenance": provenance}

    def _execute_adapter(
        self,
        adapter_id: str,
        settings: dict[str, Any],
        context: dict[str, Any],
    ) -> tuple[str, dict[str, str]]:
        normalized = validate_adapter_settings(adapter_id, settings)
        timeout = int(normalized.get("timeout_seconds") or 60)

        if adapter_id == "ollama_cli":
            return self._execute_ollama(normalized, context, timeout)
        if adapter_id == "llama_cpp_cli":
            return self._execute_llama_cpp(normalized, context, timeout)
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

    def _execute_ollama(
        self,
        settings: dict[str, Any],
        context: dict[str, Any],
        timeout: int,
    ) -> tuple[str, dict[str, str]]:
        executable = str(settings.get("executable") or "ollama")
        model = str(settings.get("model") or "").strip()
        if not model:
            raise TaskRunnerError("Ollama model is not configured")
        argv = [executable, "run", model, *list(settings.get("args") or [])]
        output = self._run_stdio(argv, build_local_model_prompt(context), timeout, validate_result=False)
        return extract_json_object(output), {
            "agent_name": model,
            "agent_runtime": "ollama-cli",
            "model_provider": f"ollama:{model}",
        }

    def _execute_llama_cpp(
        self,
        settings: dict[str, Any],
        context: dict[str, Any],
        timeout: int,
    ) -> tuple[str, dict[str, str]]:
        executable = str(settings.get("executable") or "llama-cli")
        model_path = str(settings.get("model_path") or "").strip()
        if not model_path:
            raise TaskRunnerError("llama.cpp model file is not configured")
        prompt = build_local_model_prompt(context)
        with tempfile.TemporaryDirectory(prefix="aaaat-llama-") as temporary:
            prompt_path = Path(temporary) / "prompt.json"
            prompt_path.write_text(prompt, encoding="utf-8")
            argv = [
                executable,
                "--model",
                model_path,
                "--file",
                str(prompt_path),
                "--single-turn",
                "--no-display-prompt",
                "--no-show-timings",
                *list(settings.get("args") or []),
            ]
            output = self._run_stdio(argv, None, timeout, validate_result=False)
        return extract_json_object(output), {
            "agent_name": Path(model_path).name,
            "agent_runtime": "llama.cpp-cli",
            "model_provider": f"llama.cpp:{Path(model_path).name}",
        }

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

    def _fail(self, task_id: str, message: str) -> None:
        with connect(self.storage_path) as conn:
            current = get_task(conn, task_id)
            if current.get("state") != "cancelled":
                conn.execute(
                    "UPDATE tasks SET state = ?, notes = ?, updated_at = ? WHERE id = ?",
                    ("failed", message[:4000], utc_now(), task_id),
                )
                conn.commit()
