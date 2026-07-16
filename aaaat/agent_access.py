from __future__ import annotations

import json
import secrets
import sqlite3
from typing import Any

from .assisted_profile import apply_profile_completion_result, profile_completion_context
from .candidatures import get_candidature_details
from .career_plans import career_plan_context
from .db import application_keywords, get_application, list_raw_intake, utc_now
from .profile_facts import profile_context
from .tasks import complete_task, get_task, keyword_from_context, list_tasks

ENVELOPE_FIELDS = {"task_type", "title", "state", "priority", "context_hint", "created_at", "updated_at"}
SAFE_CONTEXT_PREFIXES = ("field:", "keyword:", "candidature:", "artifact:", "blob:", "call:", "profile:")
TASK_CAPABILITY_PREFIX = "taskcap_"
FORBIDDEN_AGENT_CONTEXT_KEYS = {
    "application_id", "candidature_id", "artifact_id", "profile_fact_id", "note_id",
    "todo_id", "blob_id", "file_path", "storage_path",
}
TASK_PURPOSES = {
    "profile_completion": "professional_profile_completion",
    "field_inference": "candidature_field_inference",
    "company_research": "market_research",
    "keyword_definition": "keyword_definition",
    "draft_form_responses": "form_answers",
    "draft_cv": "cv_generation",
    "draft_cover_letter": "cover_letter",
    "career_plan_review": "career_plan_review",
}
DEFAULT_TASK_INSTRUCTIONS = {
    "profile_completion": "Complete eligible missing professional-profile fields from supplied bounded profile context. Preserve non-empty user values unless replacement is explicitly requested and justified.",
    "field_inference": "Infer missing candidature fields from bounded source material. Return supported fields only; do not infer lifecycle, user priority, lead source, or generated material bodies.",
    "company_research": "Prepare concise company research relevant to the candidature and role.",
    "keyword_definition": "Define the keyword for this job-search context.",
    "draft_form_responses": "Draft application form responses using only the supplied form prompt and bounded profile context.",
    "draft_cv": "Suggest CV positioning and role-specific adaptation notes. AAAAT renders final files locally.",
    "draft_cover_letter": "Draft a cover-letter body. AAAAT renders final files locally.",
    "career_plan_review": "Review the bounded career plan context and propose concrete improvements.",
}


def _ensure_capability_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS agent_task_capabilities (
        capability TEXT PRIMARY KEY,
        task_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )"""
    )
    conn.commit()


def safe_context_hint(value: str | None) -> str:
    hint = str(value or "").strip()
    if len(hint) > 160:
        return ""
    return hint if hint.startswith(SAFE_CONTEXT_PREFIXES) else ""


def allowed_actions(task: dict[str, Any]) -> list[str]:
    actions: list[str] = []
    if task.get("state", "") in {"queued", "claimed", "in_progress", "blocked", "failed"}:
        actions.extend(["report_progress", "submit_result"])
    return actions


def task_capability(conn: sqlite3.Connection, task: dict[str, Any]) -> str:
    _ensure_capability_table(conn)
    task_id = str(task.get("id") or "")
    row = conn.execute("SELECT capability FROM agent_task_capabilities WHERE task_id = ?", (task_id,)).fetchone()
    if row:
        return str(row["capability"])
    capability = TASK_CAPABILITY_PREFIX + secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO agent_task_capabilities(capability, task_id, created_at) VALUES (?, ?, ?)",
        (capability, task_id, utc_now()),
    )
    conn.commit()
    return capability


def task_id_for_capability(conn: sqlite3.Connection, capability: str) -> str:
    cleaned = str(capability or "").strip()
    if not cleaned.startswith(TASK_CAPABILITY_PREFIX):
        raise KeyError("Task capability not found")
    _ensure_capability_table(conn)
    row = conn.execute("SELECT task_id FROM agent_task_capabilities WHERE capability = ?", (cleaned,)).fetchone()
    if row is None:
        raise KeyError("Task capability not found")
    return str(row["task_id"])


def get_task_for_capability(conn: sqlite3.Connection, capability: str) -> dict[str, Any]:
    return get_task(conn, task_id_for_capability(conn, capability))


def task_purpose(task: dict[str, Any]) -> str:
    task_type = str(task.get("task_type") or "task")
    return TASK_PURPOSES.get(task_type, task_type)


def task_instructions(task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    return {
        "default": DEFAULT_TASK_INSTRUCTIONS.get(task_type, "Complete the bounded AAAAT task using only the supplied context."),
        "task_specific": str(task.get("instructions") or ""),
        "process": [
            "Use only input_context from this work item.",
            "Return JSON matching response_format.",
            "Do not include internal entity IDs, file paths, or storage paths.",
            "AAAAT applies results internally from the private task binding.",
        ],
    }


def output_contract(task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    return {
        "kind": "task_result",
        "for_task_type": task_type,
        "entity_ids_allowed": False,
        "auto_apply_by_agent": False,
        "apply_model": "AAAAT makes generated values current when safe; stale conflicts remain non-current history.",
        "writes": _writes_description(task_type),
    }


def _writes_description(task_type: str) -> str:
    return {
        "profile_completion": "Eligible profile variables under variables. Non-empty user values are preserved unless replace_existing is true.",
        "field_inference": "Supported candidature fields under fields. Non-empty user/current fields are not overwritten unless replace_existing is true.",
        "company_research": "Company research text. Becomes current when the field is empty, otherwise remains history.",
        "keyword_definition": "Keyword definition and optional category for the task keyword.",
        "draft_form_responses": "Application form answers. Become current when the field is empty, otherwise remain history.",
        "draft_cv": "CV positioning/adaptation content. AAAAT renders final files locally.",
        "draft_cover_letter": "Cover-letter body. AAAAT renders final files locally.",
        "career_plan_review": "Career-plan review.",
    }.get(task_type, "General bounded task result.")


def response_format(task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    formats: dict[str, dict[str, Any]] = {
        "profile_completion": {"type": "json_object", "required": ["variables"], "schema": {"variables": "object containing eligible profile keys and bounded text values", "replace_existing": "optional boolean"}},
        "field_inference": {"type": "json_object", "required": ["fields"], "schema": {"fields": "object containing supported missing fields", "replace_existing": "optional boolean"}},
        "company_research": {"type": "json_object", "required": ["company_research"], "schema": {"company_research": "string", "sources_checked": "optional array"}},
        "keyword_definition": {"type": "json_object", "required": ["definition"], "schema": {"definition": "string", "category": "optional string"}},
        "draft_form_responses": {"type": "json_object", "required": ["form_answers"], "schema": {"form_answers": "string or object", "assumptions": "optional string"}},
        "draft_cv": {"type": "json_object", "required": ["cv_positioning"], "schema": {"cv_positioning": "string", "adaptation_notes": "optional string"}},
        "draft_cover_letter": {"type": "json_object", "required": ["cover_letter_body"], "schema": {"cover_letter_body": "string", "assumptions": "optional string"}},
        "career_plan_review": {"type": "json_object", "required": ["review"], "schema": {"review": "string"}},
    }
    return formats.get(task_type, {"type": "json_object", "required": ["result"], "schema": {"result": "string or object matching task instructions"}})


def task_privacy_notes() -> list[str]:
    return [
        "purpose-scoped work item",
        "broad candidature collections are not exposed",
        "task_capability is a random attempt-scoped callback capability, not a database or entity ID",
        "AAAAT owns applying results to local records",
    ]


def task_envelope(conn: sqlite3.Connection, task: dict[str, Any]) -> dict[str, Any]:
    envelope = {key: task.get(key, "") for key in ENVELOPE_FIELDS if key != "context_hint"}
    envelope["task_capability"] = task_capability(conn, task)
    envelope["purpose"] = task_purpose(task)
    envelope["context_hint"] = safe_context_hint(task.get("context_hint"))
    envelope["allowed_actions"] = allowed_actions(task)
    return envelope


def build_agent_work_item(conn: sqlite3.Connection, task: dict[str, Any]) -> dict[str, Any]:
    envelope = task_envelope(conn, task)
    result = {
        "task": envelope,
        "purpose": task_purpose(task),
        "instructions": task_instructions(task),
        "input_context": scrub_forbidden_agent_context(_task_context(conn, task)),
        "output_contract": output_contract(task),
        "response_format": response_format(task),
        "privacy": {"scope": "task", "notes": task_privacy_notes()},
        "allowed_actions": envelope["allowed_actions"],
    }
    return scrub_forbidden_agent_context(result)


def next_agent_work_item(conn: sqlite3.Connection) -> dict[str, Any] | None:
    tasks = list_tasks(conn, state="queued")
    return build_agent_work_item(conn, tasks[0]) if tasks else None


def task_result_ack(conn: sqlite3.Connection, task: dict[str, Any]) -> dict[str, Any]:
    return {"status": "accepted", "task": {"task_capability": task_capability(conn, task), "state": task.get("state", "")}, "next": ["open_desktop"]}


def _task_context(conn: sqlite3.Connection, task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "")
    if task_type == "profile_completion":
        return profile_completion_context(conn)
    if task_type == "keyword_definition" and not task.get("application_id"):
        return {"keyword": keyword_from_context(task.get("context_hint", ""))}
    application_id = task.get("application_id")
    if application_id:
        app = get_application(conn, application_id)
        details = get_candidature_details(conn, application_id)
        if task_type == "field_inference":
            source = "\n\n".join(item["content"] for item in list_raw_intake(conn, application_id))
            keys = ("company", "role", "source_url", "location", "remote_mode", "pitch", "smart_question", "risks_to_avoid", "offer_snapshot", "company_research")
            detail_keys = ("description", "salary_expectation", "publication_date", "application_date", "raw_application_form", "strengths", "questions_to_ask", "tech_stack", "valuation", "candidature_evaluation", "role_strategy", "recruiter_material")
            all_fields = {**{key: app.get(key, "") for key in keys}, **{key: details.get(key, "") for key in detail_keys}}
            return {"source_material": source, "missing_fields": sorted(k for k, v in all_fields.items() if not str(v or "").strip()), "protected_fields": sorted(k for k, v in all_fields.items() if str(v or "").strip())}
        if task_type == "company_research":
            return {"company": app.get("company", ""), "role": app.get("role", ""), "url": app.get("source_url", "")}
        if task_type == "keyword_definition":
            return {"keyword": keyword_from_context(task.get("context_hint", "")), "role_hint": app.get("role", "")}
        if task_type == "draft_form_responses":
            return {"company": app.get("company", ""), "role": app.get("role", ""), "raw_application_form": details.get("raw_application_form", ""), "profile_context": profile_context(conn, "form_answers", scope="agent")}
        if task_type == "draft_cv":
            return {"company": app.get("company", ""), "role": app.get("role", ""), "keywords": application_keywords(conn, application_id), "profile_context": profile_context(conn, "cv_generation", scope="agent")}
        if task_type == "draft_cover_letter":
            return {"company": app.get("company", ""), "role": app.get("role", ""), "keywords": application_keywords(conn, application_id), "profile_context": profile_context(conn, "cover_letter", scope="agent")}
    if task_type == "career_plan_review":
        return {"career_plan": career_plan_context(conn, purpose="career_plan_review", scope="agent")}
    return {"task_notes": task.get("notes", "")}


def scrub_forbidden_agent_context(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: scrub_forbidden_agent_context(item) for key, item in value.items() if key not in FORBIDDEN_AGENT_CONTEXT_KEYS}
    if isinstance(value, list):
        return [scrub_forbidden_agent_context(item) for item in value]
    return value


def submit_agent_task_result(
    conn: sqlite3.Connection,
    task_capability_value: str,
    result_body: str,
    *,
    result_title: str = "",
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
) -> dict[str, Any]:
    task = get_task_for_capability(conn, task_capability_value)
    if "submit_result" not in allowed_actions(task):
        raise ValueError(f"Task is not accepting results in state {task.get('state')}")
    _validate_result_shape(task, result_body)
    completed = complete_task(
        conn,
        task["id"],
        result_body=result_body,
        result_title=result_title,
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        model_provider=model_provider,
    )
    if str(task.get("task_type") or "") == "profile_completion":
        completed["profile_update"] = apply_profile_completion_result(
            conn,
            result_body,
            agent_name=agent_name,
            agent_runtime=agent_runtime,
        )
    return completed


def _validate_result_shape(task: dict[str, Any], result_body: str) -> None:
    """Enforce the public contract's required result fields before completion."""
    try:
        value = json.loads(result_body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Result must be valid JSON: {exc.msg}") from exc
    if not isinstance(value, dict):
        raise ValueError("Result must be one JSON object")
    required = [str(key) for key in response_format(task).get("required") or []]
    missing = [key for key in required if key not in value]
    if missing:
        raise ValueError(f"Result does not match this task's required fields: {', '.join(missing)}")
