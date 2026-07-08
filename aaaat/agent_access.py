from __future__ import annotations

import sqlite3
from typing import Any

from .candidatures import get_candidature_details
from .db import application_keywords, get_application, list_raw_intake
from .profile_facts import profile_context
from .tasks import complete_task, get_task, keyword_from_context, list_tasks, update_task


ENVELOPE_FIELDS = {"task_type", "title", "state", "priority", "context_hint", "created_at", "updated_at"}
SAFE_CONTEXT_PREFIXES = ("field:", "keyword:", "candidature:", "artifact:", "blob:", "call:")
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


def safe_context_hint(value: str | None) -> str:
    hint = str(value or "").strip()
    if len(hint) > 160:
        return ""
    return hint if hint.startswith(SAFE_CONTEXT_PREFIXES) else ""


def allowed_actions(task: dict[str, Any]) -> list[str]:
    actions = ["context"]
    if task.get("state", "") in {"queued", "claimed", "in_progress", "blocked"}:
        actions.append("submit")
    return actions


def task_handle(task: dict[str, Any]) -> str:
    """Return the transitional handle for one task.

    For the MVP the handle is the task row identifier. Agent-facing code must still
    treat it only as a task endpoint handle, never as generic entity authority.
    """

    return str(task.get("id", ""))


def task_envelope(task: dict[str, Any]) -> dict[str, Any]:
    envelope = {key: task.get(key, "") for key in ENVELOPE_FIELDS if key != "context_hint"}
    envelope["task_handle"] = task_handle(task)
    envelope["context_hint"] = safe_context_hint(task.get("context_hint"))
    envelope["allowed_actions"] = allowed_actions(task)
    return envelope


def list_agent_task_envelopes(
    conn: sqlite3.Connection,
    *,
    state: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    rows = list_tasks(conn, state=state)
    envelopes = [task_envelope(row) for row in rows]
    return envelopes[:limit] if limit else envelopes


def next_agent_task_envelope(conn: sqlite3.Connection) -> dict[str, Any] | None:
    tasks = list_tasks(conn, state="queued")
    return task_envelope(tasks[0]) if tasks else None


def task_result_ack(task: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "accepted",
        "task": {"task_handle": task_handle(task), "state": task.get("state", "")},
        "next": ["open_dashboard"],
    }


def build_agent_task_context(conn: sqlite3.Connection, task_handle: str) -> dict[str, Any]:
    task = get_task(conn, task_handle)
    envelope = task_envelope(task)
    task_type = task.get("task_type", "")
    application_id = task.get("application_id")
    context: dict[str, Any] = {}
    privacy_notes = [
        "agent-scoped task context",
        "broad candidature collections are not exposed",
        "task_handle is a task endpoint handle, not entity mutation authority",
    ]

    if application_id:
        app = get_application(conn, application_id)
        details = get_candidature_details(conn, application_id)
        if task_type == "field_inference":
            source = "\n\n".join(item["content"] for item in list_raw_intake(conn, application_id))
            candidate_fields = {
                key: app.get(key, "")
                for key in (
                    "company",
                    "role",
                    "status",
                    "priority",
                    "source",
                    "source_url",
                    "location",
                    "remote_mode",
                    "next_action",
                    "pitch",
                    "smart_question",
                    "risks_to_avoid",
                    "prepare_first",
                    "prepare_later",
                    "offer_snapshot",
                    "company_research",
                    "form_answers",
                )
            }
            detail_fields = {
                key: details.get(key, "")
                for key in (
                    "description",
                    "salary_expectation",
                    "publication_date",
                    "application_date",
                    "raw_application_form",
                    "strengths",
                    "questions_to_ask",
                    "tech_stack",
                    "valuation",
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
            }
        elif task_type == "keyword_definition":
            context = {
                "keyword": keyword_from_context(task.get("context_hint", "")),
                "role_hint": app.get("role", ""),
            }
        elif task_type == "draft_form_responses":
            context = {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "raw_application_form": details.get("raw_application_form", ""),
                "profile_context": profile_context(conn, "form_answers", scope="agent"),
            }
        elif task_type == "draft_cv":
            context = {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "keywords": application_keywords(conn, application_id),
                "profile_context": profile_context(conn, "cv_generation", scope="agent"),
                "artifact_slot": {"artifact_type": "cv", "source_context": "task:draft_cv"},
            }
        elif task_type == "draft_cover_letter":
            context = {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "keywords": application_keywords(conn, application_id),
                "profile_context": profile_context(conn, "cover_letter", scope="agent"),
                "artifact_slot": {"artifact_type": "cover_letter", "source_context": "task:draft_cover_letter"},
            }
        else:
            context = {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "context_hint": envelope.get("context_hint", ""),
            }
    elif task_type == "keyword_definition":
        context = {"keyword": keyword_from_context(task.get("context_hint", ""))}

    result = {
        "task": envelope,
        "context": scrub_forbidden_agent_context(context),
        "privacy": {"scope": "agent", "notes": privacy_notes},
        "allowed_actions": envelope["allowed_actions"],
        "write_back": {
            "submit": f"/api/agent/tasks/{envelope['task_handle']}/result",
        },
    }
    return scrub_forbidden_agent_context(result)


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
        task_handle,
        result_body=result_body,
        result_title=result_title,
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        model_provider=model_provider,
    )


def claim_agent_task(conn: sqlite3.Connection, task_handle: str, *, agent_name: str = "", agent_runtime: str = "") -> dict[str, Any]:
    task = get_task(conn, task_handle)
    if task.get("state") not in {"queued", "blocked"}:
        raise ValueError("Only queued or blocked tasks can be claimed")
    return task_envelope(update_task(conn, task_handle, state="claimed", agent_name=agent_name, agent_runtime=agent_runtime))


def release_agent_task(conn: sqlite3.Connection, task_handle: str) -> dict[str, Any]:
    task = get_task(conn, task_handle)
    if task.get("state") not in {"claimed", "in_progress", "blocked"}:
        raise ValueError("Only claimed, in-progress, or blocked tasks can be released")
    return task_envelope(update_task(conn, task_handle, state="queued", agent_name="", agent_runtime=""))
