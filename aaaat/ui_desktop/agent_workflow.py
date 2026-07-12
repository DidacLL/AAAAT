from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from aaaat.agent_access import submit_agent_task_result, task_handle
from aaaat.artifacts import get_artifact
from aaaat.db import connect
from aaaat.dispatch.command import run_backend_command
from aaaat.dispatch.manual import dispatch_manual
from aaaat.dispatch.packet import build_task_packet
from aaaat.task_definitions import snapshot_task_definition, task_definition_snapshot
from aaaat.tasks import apply_task_result, create_task, get_task, list_tasks, update_task
from aaaat.templates import render_document_artifact, safe_artifact_output_path
from aaaat.text_blobs import get_text_blob, update_text_blob

DESKTOP_TASK_TYPES = {
    "company_research": ("Research company", "Prepare concise company research for review.", "candidature:company_research"),
    "field_inference": ("Complete candidature fields", "Infer missing candidature fields from bounded source material.", "candidature:field_inference"),
    "draft_cover_letter": ("Draft cover letter", "Draft a cover-letter body for local rendering and review.", "artifact:cover_letter"),
}


class DesktopAgentWorkflowError(ValueError):
    pass


class DesktopAgentWorkflowService:
    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def create_task(self, candidature_ref: str, task_type: str) -> dict[str, Any]:
        if task_type not in DESKTOP_TASK_TYPES:
            raise DesktopAgentWorkflowError(f"Unsupported desktop task type: {task_type}")
        title, instructions, context_hint = DESKTOP_TASK_TYPES[task_type]
        with connect(self.storage_path) as conn:
            task = create_task(
                conn,
                task_type,
                title,
                application_id=candidature_ref,
                instructions=instructions,
                context_hint=context_hint,
                created_by="user",
            )
            snapshot_task_definition(conn, task)
            return self._task_view(task, conn=conn)

    def list_tasks(self, candidature_ref: str) -> list[dict[str, Any]]:
        with connect(self.storage_path) as conn:
            return [self._task_view(task, conn=conn) for task in list_tasks(conn, application_id=candidature_ref)]

    def export_packet(self, task_id: str) -> Path:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            result = dispatch_manual(conn, self.storage_path, task_handle(task))
        return Path(result["packet_path"])

    def run_command(self, task_id: str, command: str) -> dict[str, Any]:
        if not command.strip():
            raise DesktopAgentWorkflowError("Command is required")
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            packet = build_task_packet(conn, task_handle(task))
            completed = run_backend_command(command, json.dumps(packet, indent=2, sort_keys=True) + "\n")
            if completed.returncode != 0:
                raise DesktopAgentWorkflowError((completed.stderr or f"Command exited with {completed.returncode}").strip())
            if not completed.stdout.strip():
                raise DesktopAgentWorkflowError("Command returned no result")
            try:
                result = json.loads(completed.stdout)
            except json.JSONDecodeError as exc:
                raise DesktopAgentWorkflowError("Command result must be valid JSON") from exc
            if not isinstance(result, dict):
                raise DesktopAgentWorkflowError("Command result must be one JSON object")
            self._validate_result(conn, task, result)
            completed_task = submit_agent_task_result(
                conn,
                task_handle(task),
                json.dumps(result, ensure_ascii=False, sort_keys=True),
                result_title=f"Command result: {task['title']}",
                agent_name="command",
                agent_runtime="command",
            )
            return self._task_view(completed_task, conn=conn)

    def submit_result_file(
        self,
        task_id: str,
        result_path: str | Path,
        *,
        agent_name: str = "external agent",
        agent_runtime: str = "manual",
        model_provider: str = "",
    ) -> dict[str, Any]:
        try:
            result = json.loads(Path(result_path).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise DesktopAgentWorkflowError("Result file must contain one valid JSON object") from exc
        return self._submit_result(task_id, result, agent_name=agent_name, agent_runtime=agent_runtime, model_provider=model_provider)

    def update_result(self, task_id: str, result_text: str) -> dict[str, Any]:
        try:
            result = json.loads(result_text)
        except json.JSONDecodeError as exc:
            raise DesktopAgentWorkflowError("Edited result must contain one valid JSON object") from exc
        if not isinstance(result, dict):
            raise DesktopAgentWorkflowError("Edited result must contain one JSON object")
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if not task.get("result_blob_id"):
                raise DesktopAgentWorkflowError("Task has no result to edit")
            self._validate_result(conn, task, result)
            update_text_blob(
                conn,
                task["result_blob_id"],
                body=json.dumps(result, ensure_ascii=False, sort_keys=True),
                review_state="suggested",
                notes="Edited by user before apply.",
            )
            if task.get("task_type") in {"draft_cover_letter", "draft_cv"} and task.get("artifact_id"):
                task = update_task(conn, task_id, artifact_id=None)
            return self._task_view(task, conn=conn)

    def render_cover_letter(self, task_id: str, *, compile_pdf: bool = False) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            definition = task_definition_snapshot(conn, task)
            template_name = str(definition.get("artifact_template") or "")
            mapping = definition.get("artifact_mapping") or {}
            if not template_name or not mapping:
                raise DesktopAgentWorkflowError("Task definition has no artifact template mapping")
            if not task.get("result_blob_id"):
                raise DesktopAgentWorkflowError("The task has no submitted result")
            blob = get_text_blob(conn, task["result_blob_id"])
            try:
                result = json.loads(str(blob.get("body") or ""))
            except json.JSONDecodeError as exc:
                raise DesktopAgentWorkflowError("Artifact result is not valid JSON") from exc
            extra: dict[str, Any] = {}
            for result_field, template_variable in mapping.items():
                value = result.get(result_field) if isinstance(result, dict) else None
                if value in (None, ""):
                    raise DesktopAgentWorkflowError(f"Artifact result requires {result_field}")
                extra[str(template_variable)] = value
            output_path = safe_artifact_output_path(self.storage_path, task.get("application_id"), template_name)
            rendered = render_document_artifact(
                conn,
                template_name,
                output_path,
                task.get("application_id"),
                extra,
                compile_pdf=compile_pdf,
            )
            updated = update_task(conn, task_id, artifact_id=rendered["artifact_id"])
            return {"task": self._task_view(updated, conn=conn), "artifact": rendered}

    def artifact_path(self, task_id: str) -> Path:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if not task.get("artifact_id"):
                raise DesktopAgentWorkflowError("Task has no rendered artifact")
            artifact = get_artifact(conn, task["artifact_id"])
        path = Path(str(artifact.get("path") or ""))
        if not path.exists():
            raise DesktopAgentWorkflowError("Rendered artifact file no longer exists")
        return path

    def apply_result(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            definition = task_definition_snapshot(conn, task)
            if definition.get("artifact_template") and not task.get("artifact_id"):
                raise DesktopAgentWorkflowError("Render the configured artifact before applying it")
            return self._task_view(apply_task_result(conn, task_id), conn=conn)

    def reject_result(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("result_blob_id"):
                update_text_blob(conn, task["result_blob_id"], review_state="archived", notes="Rejected by user.")
            return self._task_view(
                update_task(conn, task_id, state="cancelled", notes="Result rejected by user."),
                conn=conn,
            )

    def _submit_result(self, task_id: str, result: Any, *, agent_name: str, agent_runtime: str, model_provider: str) -> dict[str, Any]:
        if not isinstance(result, dict):
            raise DesktopAgentWorkflowError("Result must contain one JSON object")
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            self._validate_result(conn, task, result)
            completed = submit_agent_task_result(
                conn,
                task_handle(task),
                json.dumps(result, ensure_ascii=False, sort_keys=True),
                result_title=f"External result: {task['title']}",
                agent_name=agent_name,
                agent_runtime=agent_runtime,
                model_provider=model_provider,
            )
            return self._task_view(completed, conn=conn)

    @staticmethod
    def _validate_result(conn, task: dict[str, Any], result: dict[str, Any]) -> None:
        definition = task_definition_snapshot(conn, task)
        required = set(definition.get("response_format", {}).get("required") or [])
        missing = required - result.keys()
        if missing:
            raise DesktopAgentWorkflowError(f"Missing required result fields: {sorted(missing)}")

    @staticmethod
    def _task_view(task: dict[str, Any], *, conn=None) -> dict[str, Any]:
        result_body = ""
        review_state = ""
        artifact_path = ""
        definition_version = None
        if conn is not None:
            definition_version = task_definition_snapshot(conn, task).get("version")
            if task.get("result_blob_id"):
                blob = get_text_blob(conn, task["result_blob_id"])
                result_body = str(blob.get("body") or "")
                review_state = str(blob.get("review_state") or "")
            if task.get("artifact_id"):
                artifact = get_artifact(conn, task["artifact_id"])
                artifact_path = str(artifact.get("path") or "")
        return {
            "id": task["id"],
            "task_handle": task_handle(task),
            "task_type": task.get("task_type", ""),
            "title": task.get("title", ""),
            "state": task.get("state", ""),
            "priority": task.get("priority", ""),
            "definition_version": definition_version,
            "result_blob_id": task.get("result_blob_id"),
            "artifact_id": task.get("artifact_id"),
            "artifact_path": artifact_path,
            "result_body": result_body,
            "review_state": review_state,
            "agent_name": task.get("agent_name", ""),
            "agent_runtime": task.get("agent_runtime", ""),
            "notes": task.get("notes", ""),
        }
