from __future__ import annotations

import hashlib
import json
import sqlite3
from typing import Any, Mapping

from .candidatures import get_candidature_details
from .career_plans import career_plan_context
from .db import application_keywords, get_application, list_raw_intake
from .profile_facts import profile_context
from .task_registry import TASK_DEFINITIONS, task_definition
from .tasks import complete_task, get_task, keyword_from_context, list_tasks, update_task

ENVELOPE_FIELDS = {"task_type", "title", "state", "priority", "context_hint", "created_at", "updated_at"}
SAFE_CONTEXT_PREFIXES = ("field:", "keyword:", "candidature:", "artifact:", "blob:", "call:")
TASK_HANDLE_PREFIX = "taskh_"
FORBIDDEN_AGENT_CONTEXT_KEYS = {
    "application_id",
    "candidature_id",
    "artifact_id",
    "profile_fact_id",
    "note_id",
    "todo_id",
    "blob_id",
    "file_path",
    "storage_path",
}
TASK_PURPOSES = {task_type: definition.purpose for task_type, definition in TASK_DEFINITIONS.items()}
DEFAULT_TASK_INSTRUCTIONS = {task_type: definition.instructions for task_type, definition in TASK_DEFINITIONS.items()}


def safe_context_hint(value: str | None) -> str:
    hint = str(value or "").strip()
    if len(hint) > 160:
        return ""
    return hint if hint.startswith(SAFE_CONTEXT_PREFIXES) else ""


def allowed_actions(task: Mapping[str, Any]) -> list[str]:
    actions = ["context"]
    if task.get("state", "") in {"queued", "claimed", "in_progress", "blocked"}:
        actions.append("submit")
    return actions


def _handle_for_task_id(task_id: str) -> str:
    digest = hashlib.blake2s(task_id.encode("utf-8"), digest_size=16).hexdigest()
    return f"{TASK_HANDLE_PREFIX}{digest}"


def task_handle(task: Mapping[str, Any]) -> str:
    return _handle_for_task_id(str(task.get("id", "")))


def task_id_for_handle(conn: sqlite3.Connection, handle: str) -> str:
    cleaned = str(handle or "").strip()
    if not cleaned.startswith(TASK_HANDLE_PREFIX):
        raise KeyError(f"Task handle not found: {handle}")
    rows = conn.execute("SELECT id FROM tasks ORDER BY created_at, id").fetchall()
    for row in rows:
        task_id = str(row["id"])
        if _handle_for_task_id(task_id) == cleaned:
            return task_id
    raise KeyError(f"Task handle not found: {handle}")


def get_task_for_handle(conn: sqlite3.Connection, handle: str) -> dict[str, Any]:
    return get_task(conn, task_id_for_handle(conn, handle))


def task_purpose(task: Mapping[str, Any]) -> str:
    task_type = str(task.get("task_type") or "task")
    return TASK_PURPOSES.get(task_type, task_type)


def task_instructions(task: Mapping[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    default = DEFAULT_TASK_INSTRUCTIONS.get(task_type, "Complete the bounded AAAAT task using only the supplied task context.")
    return {
        "default": str(task.get("instructions") or default),
        "task_specific": str(task.get("instructions") or ""),
        "definition_version": int(task.get("definition_version") or 1),
        "process": [
            "Use only input_context from this packet/context.",
            "Return JSON matching response_format.",
            "Do not include application IDs, candidature IDs, artifact IDs, profile fact IDs, file paths, or storage paths.",
            "AAAAT applies results internally using the opaque task binding.",
        ],
    }


def output_contract(task: Mapping[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    definition = TASK_DEFINITIONS.get(task_type)
    return {
        "kind": "task_result",
        "for_task_type": task_type,
        "review_state": "suggested",
        "auto_apply_by_agent": False,
        "entity_ids_allowed": False,
        "apply_model": "AAAAT applies results internally from the opaque task binding.",
        "writes": (
            f"Deterministic result fields: {', '.join(definition.fixed_apply_fields)}"
            if definition and definition.fixed_apply_fields
            else "Generated content or artifact inputs for local use."
        ),
    }


def response_format(task: Mapping[str, Any]) -> dict[str, Any]:
    stored = task.get("response_format")
    if isinstance(stored, str):
        try:
            stored = json.loads(stored or "{}")
        except json.JSONDecodeError:
            stored = None
    if isinstance(stored, dict) and stored.get("type"):
        return stored
    task_type = str(task.get("task_type") or "task")
    definition = TASK_DEFINITIONS.get(task_type)
    if definition:
        return definition.response_format
    return {"type": "json_object", "required": ["result"], "schema": {"result": "string or object matching task instructions"}}


def task_privacy_notes(_task: Mapping[str, Any]) -> list[str]:
    return [
        "agent-scoped task context",
        "broad candidature collections are not exposed",
        "task_handle is an opaque callback handle, not a database or entity ID",
        "do not request or return internal entity IDs",
        "AAAAT owns applying results to local records",
    ]


def task_envelope(task: Mapping[str, Any]) -> dict[str, Any]:
    envelope = {key: task.get(key, "") for key in ENVELOPE_FIELDS if key != "context_hint"}
    envelope["task_handle"] = task_handle(task)
    envelope["purpose"] = task_purpose(task)
    envelope["context_hint"] = safe_context_hint(task.get("context_hint"))
    envelope["allowed_actions"] = allowed_actions(task)
    return envelope


def list_agent_task_envelopes(
    conn: sqlite3.Connection,
    *,
    state: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    envelopes = [task_envelope(row) for row in list_tasks(conn, state=state)]
    return envelopes[:limit] if limit else envelopes


def next_agent_task_envelope(conn: sqlite3.Connection) -> dict[str, Any] | None:
    tasks = list_tasks(conn, state="queued")
    return task_envelope(tasks[0]) if tasks else None


def task_result_ack(task: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "status": "accepted",
        "task": {"task_handle": task_handle(task), "state": task.get("state", "")},
        "next": ["open_dashboard"],
    }


def build_agent_task_context(conn: sqlite3.Connection, task_handle_value: str) -> dict[str, Any]:
    task = get_task_for_handle(conn, task_handle_value)
    envelope = task_envelope(task)
    task_type = str(task.get("task_type") or "")
    application_id = task.get("application_id")
    context: dict[str, Any] = {}

    if application_id:
        app = get_application(conn, application_id)
        details = get_candidature_details(conn, application_id)
        if task_type == "field_inference":
            source = "\n\n".join(item["content"] for item in list_raw_intake(conn, application_id))
            candidate_fields = {
                key: app.get(key, "")
                for key in (
                    "company", "role", "status", "priority", "source", "source_url", "location", "remote_mode",
                    "next_action", "call_signals", "technical_reading", "pitch", "smart_question", "risks_to_avoid",
                    "prepare_first", "prepare_later", "offer_snapshot", "company_research", "form_answers",
                )
            }
            detail_fields = {
                key: details.get(key, "")
                for key in (
                    "description", "salary_expectation", "publication_date", "application_date", "raw_application_form",
                    "strengths", "questions_to_ask", "tech_stack", "valuation",
                )
            }
            all_fields = {**candidate_fields, **detail_fields}
            context = {
                "source_material": source,
                "missing_fields": sorted(key for key, value in all_fields.items() if not str(value or "").strip()),
                "protected_fields": sorted(key for key, value in all_fields.items() if str(value or "").strip()),
            }
        elif task_type == "company_research":
            context = {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "source_url": app.get("source_url", ""),
                "offer_summary": app.get("offer_snapshot", ""),
            }
        elif task_type == "career_plan_review":
            context = {
                "candidature": {
                    "company": app.get("company", ""),
                    "role": app.get("role", ""),
                    "location": app.get("location", ""),
                    "remote_mode": app.get("remote_mode", ""),
                    "offer_summary": app.get("offer_snapshot", ""),
                    "strengths": details.get("strengths", ""),
                    "valuation": details.get("valuation"),
                    "keywords": application_keywords(conn, application_id),
                },
                "career_plan_context": career_plan_context(conn, "career_plan_review", scope="agent"),
            }
        elif task_type == "keyword_definition":
            context = {
                "keyword": keyword_from_context(str(task.get("context_hint") or "")),
                "role_hint": app.get("role", ""),
            }
        elif task_type == "draft_form_responses":
            context = {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "raw_application_form": details.get("raw_application_form", ""),
                "profile_context": profile_context(conn, "form_answers", scope="agent"),
            }
        elif task_type in {"draft_cv", "draft_cover_letter"}:
            purpose = "cv_generation" if task_type == "draft_cv" else "cover_letter"
            context = {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "keywords": application_keywords(conn, application_id),
                "offer_summary": app.get("offer_snapshot", ""),
                "profile_context": profile_context(conn, purpose, scope="agent"),
                "artifact_slot": {
                    "artifact_type": "cv" if task_type == "draft_cv" else "cover_letter",
                    "source_context": f"task:{task_type}",
                },
            }
        else:
            context = {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "context_hint": envelope.get("context_hint", ""),
            }
    elif task_type == "keyword_definition":
        context = {"keyword": keyword_from_context(str(task.get("context_hint") or ""))}
    elif task_type == "career_plan_review":
        context = {"career_plan_context": career_plan_context(conn, "career_plan_review", scope="agent")}

    privacy_notes = task_privacy_notes(task)
    return scrub_forbidden_agent_context(
        {
            "task": envelope,
            "purpose": task_purpose(task),
            "instructions": task_instructions(task),
            "context": context,
            "input_context": context,
            "output_contract": output_contract(task),
            "response_format": response_format(task),
            "privacy": {"scope": "agent", "notes": privacy_notes},
            "privacy_notes": privacy_notes,
            "allowed_actions": envelope["allowed_actions"],
            "write_back": {"submit": f"/api/agent/tasks/{envelope['task_handle']}/result"},
        }
    )


def scrub_forbidden_agent_context(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: scrub_forbidden_agent_context(item)
            for key, item in value.items()
            if key not in FORBIDDEN_AGENT_CONTEXT_KEYS
        }
    if isinstance(value, list):
        return [scrub_forbidden_agent_context(item) for item in value]
    return value


def submit_agent_task_result(
    conn: sqlite3.Connection,
    task_handle: str,
    result_body: str,
    *,
    result_title: str = "",
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
) -> dict[str, Any]:
    return complete_task(
        conn,
        task_id_for_handle(conn, task_handle),
        result_body=result_body,
        result_title=result_title,
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        model_provider=model_provider,
    )


def claim_agent_task(
    conn: sqlite3.Connection,
    task_handle: str,
    *,
    agent_name: str = "",
    agent_runtime: str = "",
) -> dict[str, Any]:
    task_id = task_id_for_handle(conn, task_handle)
    task = get_task(conn, task_id)
    if task.get("state") not in {"queued", "blocked"}:
        raise ValueError("Only queued or blocked tasks can be claimed")
    return task_envelope(update_task(conn, task_id, state="claimed", agent_name=agent_name, agent_runtime=agent_runtime))


def release_agent_task(conn: sqlite3.Connection, task_handle: str) -> dict[str, Any]:
    task_id = task_id_for_handle(conn, task_handle)
    task = get_task(conn, task_id)
    if task.get("state") not in {"claimed", "in_progress", "blocked"}:
        raise ValueError("Only claimed, in-progress, or blocked tasks can be released")
    return task_envelope(update_task(conn, task_id, state="queued", agent_name="", agent_runtime=""))
