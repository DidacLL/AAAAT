from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Mapping

from .agent_access import build_agent_task_context, submit_agent_task_result, task_handle
from .artifacts import get_artifact
from .db import connect, new_id, row_to_dict, utc_now
from .dispatch.command import run_backend_command
from .task_registry import task_definition, validate_task_snapshot
from .tasks import apply_task_result, get_task, update_task
from .templates import render_document_artifact, safe_artifact_output_path
from .text_blobs import get_text_blob, update_text_blob
from .workspace_config import effective_task_snapshot, load_settings


class TaskWorkflowError(ValueError):
    pass


def decode_task(row: Mapping[str, Any]) -> dict[str, Any]:
    task = dict(row)
    for key in ("response_format", "artifact_mapping"):
        value = task.get(key)
        if isinstance(value, str):
            try:
                task[key] = json.loads(value or "{}")
            except json.JSONDecodeError:
                task[key] = {}
    task["definition_version"] = int(task.get("definition_version") or 1)
    return task


class TaskWorkflowService:
    """Provider-neutral orchestration for one bounded AAAAT task."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def create_task(
        self,
        candidature_ref: str,
        task_type: str,
        *,
        context_hint: str | None = None,
        created_by: str = "user",
        priority: str = "normal",
        force_new: bool = False,
    ) -> dict[str, Any]:
        snapshot = effective_task_snapshot(self.storage_path, task_type)
        validate_task_snapshot(snapshot)
        hint = context_hint if context_hint is not None else str(snapshot.get("context_hint") or "")
        with connect(self.storage_path) as conn:
            if not force_new:
                row = conn.execute(
                    """SELECT * FROM tasks
                    WHERE application_id = ? AND task_type = ? AND context_hint = ?
                      AND state IN ('queued', 'claimed', 'in_progress', 'blocked')
                    ORDER BY created_at DESC, rowid DESC LIMIT 1""",
                    (candidature_ref, task_type, hint),
                ).fetchone()
                if row is not None:
                    return self.view_task(decode_task(row), conn=conn)
            now = utc_now()
            item = {
                "id": new_id("task"),
                "application_id": candidature_ref,
                "task_type": task_type,
                "title": str(snapshot["title"]),
                "instructions": str(snapshot["instructions"]),
                "definition_version": int(snapshot.get("version") or 1),
                "response_format": json.dumps(snapshot["response_format"], sort_keys=True),
                "artifact_template": str(snapshot.get("artifact_template") or ""),
                "artifact_mapping": json.dumps(snapshot.get("artifact_mapping") or {}, sort_keys=True),
                "state": "queued",
                "priority": priority,
                "context_hint": hint,
                "created_by": created_by,
                "agent_name": "",
                "agent_runtime": "",
                "result_blob_id": None,
                "artifact_id": None,
                "created_at": now,
                "updated_at": now,
                "completed_at": "",
                "notes": "",
            }
            conn.execute(
                """INSERT INTO tasks(
                  id, application_id, task_type, title, instructions,
                  definition_version, response_format, artifact_template, artifact_mapping,
                  state, priority, context_hint, created_by, agent_name, agent_runtime,
                  result_blob_id, artifact_id, created_at, updated_at, completed_at, notes
                ) VALUES (
                  :id, :application_id, :task_type, :title, :instructions,
                  :definition_version, :response_format, :artifact_template, :artifact_mapping,
                  :state, :priority, :context_hint, :created_by, :agent_name, :agent_runtime,
                  :result_blob_id, :artifact_id, :created_at, :updated_at, :completed_at, :notes
                )""",
                item,
            )
            conn.commit()
            return self.view_task(decode_task(item), conn=conn)

    def list_tasks(self, candidature_ref: str) -> list[dict[str, Any]]:
        with connect(self.storage_path) as conn:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE application_id = ? ORDER BY created_at DESC, rowid DESC",
                (candidature_ref,),
            ).fetchall()
            return [self.view_task(decode_task(row_to_dict(row)), conn=conn) for row in rows]

    def get_task(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return self.view_task(decode_task(get_task(conn, task_id)), conn=conn)

    def packet(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = decode_task(get_task(conn, task_id))
            context = build_agent_task_context(conn, task_handle(task))
            instructions = dict(context.get("instructions") or {})
            instructions["default"] = task["instructions"]
            instructions["definition_version"] = task["definition_version"]
            output_contract = dict(context.get("output_contract") or {})
            output_contract["task_definition_version"] = task["definition_version"]
            output_contract["artifact"] = {
                "template": task.get("artifact_template") or "",
                "variable_mapping": task.get("artifact_mapping") or {},
            }
            return {
                "packet_version": "aaaat.task_packet.v2",
                "task_handle": task_handle(task),
                "task_type": task["task_type"],
                "title": task["title"],
                "instructions": instructions,
                "purpose": task_definition(task["task_type"]).purpose,
                "input_context": context.get("input_context", context.get("context", {})),
                "output_contract": output_contract,
                "response_format": task["response_format"],
                "allowed_actions": context.get("allowed_actions", []),
                "privacy_notes": context.get("privacy_notes", []),
                "callback_instructions": {
                    "auto_apply": False,
                    "submit_with": "the opaque task_handle",
                },
            }

    def run_configured(self, task_id: str) -> dict[str, Any]:
        command = str(load_settings(self.storage_path).get("agent_command") or "").strip()
        if not command:
            raise TaskWorkflowError("No AI command is configured")
        return self.run_command(task_id, command)

    def run_command(self, task_id: str, command: str) -> dict[str, Any]:
        if not command.strip():
            raise TaskWorkflowError("Command is required")
        with connect(self.storage_path) as conn:
            task = decode_task(get_task(conn, task_id))
            if task.get("state") not in {"queued", "blocked"}:
                raise TaskWorkflowError(f"Task cannot run from state {task.get('state')}")
            update_task(conn, task_id, state="in_progress", notes="")
        completed = run_backend_command(command, json.dumps(self.packet(task_id), indent=2, sort_keys=True) + "\n")
        if completed.returncode != 0:
            message = (completed.stderr or f"Command exited with {completed.returncode}").strip()
            self.mark_failed(task_id, message)
            raise TaskWorkflowError(message)
        if not completed.stdout.strip():
            self.mark_failed(task_id, "Command returned no result")
            raise TaskWorkflowError("Command returned no result")
        try:
            result = json.loads(completed.stdout)
        except json.JSONDecodeError as exc:
            self.mark_failed(task_id, "Command result is not valid JSON")
            raise TaskWorkflowError("Command result must be valid JSON") from exc
        return self.submit_result(task_id, result, agent_name="command", agent_runtime="command")

    def submit_result(
        self,
        task_id: str,
        result: Any,
        *,
        agent_name: str = "external agent",
        agent_runtime: str = "manual",
        model_provider: str = "",
    ) -> dict[str, Any]:
        if not isinstance(result, dict):
            raise TaskWorkflowError("Result must contain one JSON object")
        with connect(self.storage_path) as conn:
            task = decode_task(get_task(conn, task_id))
            self._validate_result(task, result)
            completed = submit_agent_task_result(
                conn,
                task_handle(task),
                json.dumps(result, ensure_ascii=False, sort_keys=True),
                result_title=f"Generated result: {task['title']}",
                agent_name=agent_name,
                agent_runtime=agent_runtime,
                model_provider=model_provider,
            )
            return self.view_task(decode_task(completed), conn=conn)

    def edit_result(self, task_id: str, result: Any) -> dict[str, Any]:
        if not isinstance(result, dict):
            raise TaskWorkflowError("Edited result must contain one JSON object")
        with connect(self.storage_path) as conn:
            task = decode_task(get_task(conn, task_id))
            if not task.get("result_blob_id"):
                raise TaskWorkflowError("Task has no generated result")
            self._validate_result(task, result)
            update_text_blob(
                conn,
                task["result_blob_id"],
                body=json.dumps(result, ensure_ascii=False, sort_keys=True),
                review_state="suggested",
                notes="Edited by user before apply.",
            )
            if task.get("artifact_id"):
                task = decode_task(update_task(conn, task_id, artifact_id=None))
            return self.view_task(task, conn=conn)

    def apply(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = decode_task(get_task(conn, task_id))
            if task.get("artifact_template") and not task.get("artifact_id"):
                raise TaskWorkflowError("Render the configured document before applying this result")
            if task["task_type"] == "career_plan_review":
                if not task.get("result_blob_id"):
                    raise TaskWorkflowError("Task has no result")
                update_text_blob(conn, task["result_blob_id"], review_state="applied")
                return self.view_task(task, conn=conn)
            applied = decode_task(apply_task_result(conn, task_id))
            return self.view_task(applied, conn=conn)

    def render_artifact(self, task_id: str, *, compile_pdf: bool = False) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = decode_task(get_task(conn, task_id))
            template_name = str(task.get("artifact_template") or "")
            mapping = task.get("artifact_mapping") or {}
            if not template_name or not mapping:
                raise TaskWorkflowError("Task has no configured document template")
            if not task.get("result_blob_id"):
                raise TaskWorkflowError("Task has no generated result")
            blob = get_text_blob(conn, task["result_blob_id"])
            try:
                result = json.loads(str(blob.get("body") or ""))
            except json.JSONDecodeError as exc:
                raise TaskWorkflowError("Generated result is not valid JSON") from exc
            extra: dict[str, Any] = {}
            for result_key, template_key in mapping.items():
                value = result.get(result_key)
                if value in (None, ""):
                    raise TaskWorkflowError(f"Generated result requires {result_key}")
                extra[str(template_key)] = value
            output_path = safe_artifact_output_path(self.storage_path, task.get("application_id"), template_name)
            rendered = render_document_artifact(
                conn,
                template_name,
                output_path,
                task.get("application_id"),
                extra,
                compile_pdf=compile_pdf,
                storage_path=self.storage_path,
            )
            updated = decode_task(update_task(conn, task_id, artifact_id=rendered["artifact_id"]))
            return {"task": self.view_task(updated, conn=conn), "artifact": rendered}

    def reject(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = decode_task(get_task(conn, task_id))
            if task.get("result_blob_id"):
                update_text_blob(conn, task["result_blob_id"], review_state="archived", notes="Rejected by user.")
            cancelled = decode_task(update_task(conn, task_id, state="cancelled", notes="Result rejected by user."))
            return self.view_task(cancelled, conn=conn)

    def retry(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = decode_task(update_task(conn, task_id, state="queued", notes=""))
            return self.view_task(task, conn=conn)

    def mark_failed(self, task_id: str, message: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = decode_task(update_task(conn, task_id, state="blocked", notes=message))
            return self.view_task(task, conn=conn)

    @staticmethod
    def _validate_result(task: Mapping[str, Any], result: Mapping[str, Any]) -> None:
        response = task.get("response_format") or {}
        required = set(response.get("required") or []) if isinstance(response, Mapping) else set()
        missing = sorted(required - set(result))
        if missing:
            raise TaskWorkflowError(f"Missing required result fields: {missing}")

    @staticmethod
    def view_task(task: Mapping[str, Any], *, conn: sqlite3.Connection) -> dict[str, Any]:
        value = decode_task(task)
        result_body = ""
        review_state = ""
        artifact = None
        if value.get("result_blob_id"):
            blob = get_text_blob(conn, value["result_blob_id"])
            result_body = str(blob.get("body") or "")
            review_state = str(blob.get("review_state") or "")
        if value.get("artifact_id"):
            artifact = get_artifact(conn, value["artifact_id"])
        return {
            **value,
            "task_handle": task_handle(value),
            "result_body": result_body,
            "review_state": review_state,
            "artifact": artifact,
        }
