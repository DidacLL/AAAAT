from __future__ import annotations

import json
import sqlite3
from typing import Any

from .agent_access import task_envelope
from .candidatures import create_candidature
from .db import row_to_dict
from .tasks import FIELD_INFERENCE_FIELDS, complete_task, get_task, list_tasks
from .text_blobs import create_text_blob


EXTRACTION_TOP_LEVEL_FIELDS = {"fields", "notes"}
EXTRACTION_NEXT_ACTIONS = ["list_tasks", "get_task_context"]
RAW_OFFER_NEXT_ACTIONS = ["submit_extraction", "list_tasks", "get_task_context"]


def agent_intake_raw_offer(
    conn: sqlite3.Connection,
    content: str,
    *,
    source_url: str = "",
    agent_name: str = "",
    agent_runtime: str = "",
) -> dict[str, Any]:
    cleaned = str(content or "").strip()
    if not cleaned:
        raise ValueError("Raw offer content is required")
    app = create_candidature(
        conn,
        company="Pending extraction",
        role="Pending role",
        status="intake",
        priority="normal",
        source="agent_raw_offer",
        source_url=source_url,
        next_action="Extract raw offer details",
        raw_offer=cleaned,
        created_by="agent",
        include_field_inference_task=True,
        include_company_research_task=True,
        include_keyword_detection_task=True,
    )
    intake_id = _latest_intake_id(conn, app["id"])
    tasks = [task_envelope(task) for task in list_tasks(conn, application_id=app["id"], state="queued")]
    return {
        "ok": True,
        "capability": "raw_offer_intake",
        "correlation_id": intake_id,
        "created_tasks": tasks,
        "next_allowed_actions": RAW_OFFER_NEXT_ACTIONS,
    }


def agent_submit_structured_extraction(
    conn: sqlite3.Connection,
    correlation_id: str,
    fields_json: str | dict[str, Any],
    *,
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
) -> dict[str, Any]:
    payload = validate_structured_extraction(fields_json)
    application_id, task_id, normalized_correlation_id = _resolve_correlation(conn, correlation_id)
    result_body = json.dumps(payload, sort_keys=True)
    if task_id:
        completed = complete_task(
            conn,
            task_id,
            result_body=result_body,
            result_title="Structured extraction proposal",
            agent_name=agent_name,
            agent_runtime=agent_runtime,
            model_provider=model_provider,
        )
        stored_as = {"kind": "task_result", "task": task_envelope(completed)}
    else:
        blob = create_text_blob(
            conn,
            "structured_extraction",
            result_body,
            application_id=application_id,
            title="Structured extraction proposal",
            source_context=f"intake:{normalized_correlation_id}",
            review_state="suggested",
            created_by="agent",
            agent_name=agent_name,
            agent_runtime=agent_runtime,
            model_provider=model_provider,
        )
        stored_as = {"kind": "text_blob", "id": blob["id"], "review_state": blob["review_state"]}
    return {
        "ok": True,
        "capability": "structured_extraction",
        "correlation_id": normalized_correlation_id,
        "accepted_fields": sorted(payload["fields"]),
        "stored_as": stored_as,
        "next_allowed_actions": EXTRACTION_NEXT_ACTIONS,
    }


def validate_structured_extraction(fields_json: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(fields_json, str):
        try:
            payload = json.loads(fields_json)
        except json.JSONDecodeError as exc:
            raise ValueError("Structured extraction must be valid JSON") from exc
    else:
        payload = fields_json
    if not isinstance(payload, dict):
        raise ValueError("Structured extraction must be a JSON object")
    unknown_top = set(payload) - EXTRACTION_TOP_LEVEL_FIELDS
    if unknown_top:
        raise ValueError(f"Unsupported extraction keys: {', '.join(sorted(unknown_top))}")
    if "replace_existing" in payload or "replace" in payload:
        raise ValueError("Structured extraction cannot request direct replacement")
    fields = payload.get("fields")
    if not isinstance(fields, dict) or not fields:
        raise ValueError("Structured extraction requires non-empty fields")
    unknown_fields = set(fields) - FIELD_INFERENCE_FIELDS
    if unknown_fields:
        raise ValueError(f"Unsupported extraction fields: {', '.join(sorted(unknown_fields))}")
    normalized: dict[str, Any] = {}
    for key, value in fields.items():
        normalized[key] = _validate_field_value(key, value)
    notes = payload.get("notes", "")
    if not isinstance(notes, str):
        raise ValueError("Extraction notes must be a string")
    return {"fields": normalized, "notes": notes}


def _validate_field_value(key: str, value: Any) -> Any:
    if key == "keywords":
        if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
            raise ValueError("keywords must be a list of strings")
        return [item.strip() for item in value if item.strip()]
    if key == "valuation":
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("valuation must be an integer")
        return value
    if not isinstance(value, str):
        raise ValueError(f"{key} must be a string")
    return value


def _latest_intake_id(conn: sqlite3.Connection, application_id: str) -> str:
    row = conn.execute(
        "SELECT id FROM raw_intake WHERE application_id = ? ORDER BY created_at DESC LIMIT 1",
        (application_id,),
    ).fetchone()
    if row is None:
        raise KeyError(f"Raw intake not found for application: {application_id}")
    return str(row["id"])


def _resolve_correlation(conn: sqlite3.Connection, correlation_id: str) -> tuple[str, str | None, str]:
    cleaned = str(correlation_id or "").strip()
    if not cleaned:
        raise ValueError("Correlation id is required")
    if cleaned.startswith("task_"):
        task = get_task(conn, cleaned)
        application_id = task.get("application_id")
        if not application_id:
            raise ValueError("Extraction task is not linked to an intake")
        return str(application_id), cleaned, cleaned
    row = conn.execute("SELECT * FROM raw_intake WHERE id = ?", (cleaned,)).fetchone()
    if row is None:
        raise KeyError(f"Intake not found: {cleaned}")
    intake = row_to_dict(row)
    application_id = str(intake["application_id"])
    task = _field_inference_task(conn, application_id)
    return application_id, task["id"] if task else None, cleaned


def _field_inference_task(conn: sqlite3.Connection, application_id: str) -> dict[str, Any] | None:
    for state in ("queued", "claimed", "in_progress", "blocked"):
        for task in list_tasks(conn, application_id=application_id, state=state):
            if task.get("task_type") == "field_inference":
                return task
    return None
