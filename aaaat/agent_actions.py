from __future__ import annotations

import json
import sqlite3
from typing import Any

from .candidatures import CANDIDATURE_DETAIL_FIELDS, create_candidature
from .career_plans import CONTEXT_PURPOSES as CAREER_PLAN_PURPOSES
from .career_plans import career_plan_context
from .db import APPLICATION_UPDATE_FIELDS
from .profile_facts import PURPOSE_FLAGS as PROFILE_CONTEXT_PURPOSES
from .profile_facts import profile_context
from .tasks import create_task, find_open_task
from .templates import render_document_artifact, safe_artifact_output_path
from .text_blobs import create_text_blob

ACTION_SECTIONS = {"source_material", "candidature", "outputs", "render", "requested_tasks"}
DICT_ACTION_SECTIONS = ACTION_SECTIONS - {"requested_tasks"}
PACKET_KEYS = {"action", "payload"}
SOURCE_MATERIAL_FIELDS = {"offer_text", "offer_url", "application_form_text", "user_instructions", "conversation_context"}
CANDIDATURE_FIELDS = {
    "company", "role", "status", "priority", "source", "source_url", "location", "remote_mode",
    "offer_snapshot", "keywords", "description", "salary_expectation", "publication_date", "application_date", "tech_stack", "valuation",
}
OUTPUT_FIELDS = {
    "company_research", "call_signals", "pitch", "smart_question", "risks_to_avoid",
    "form_answers", "cover_letter_body", "cv_positioning",
}
OUTPUT_APP_FIELDS = {
    "company_research", "call_signals", "pitch", "smart_question", "risks_to_avoid", "form_answers",
}
OUTPUT_BLOB_FIELDS = {"cover_letter_body", "cv_positioning"}
RENDER_FIELDS = {"cover_letter", "cv"}
REQUESTED_TASK_FIELDS = {"task_type", "priority", "reason", "keyword"}
REQUESTED_TASK_PRIORITIES = {"low", "normal", "medium", "high"}
REQUESTED_TASK_ALIASES = {
    "company_research": "company_research",
    "form_answers": "draft_form_responses",
    "draft_form_responses": "draft_form_responses",
    "cover_letter": "draft_cover_letter",
    "draft_cover_letter": "draft_cover_letter",
    "cv": "draft_cv",
    "draft_cv": "draft_cv",
    "keyword_definition": "keyword_definition",
}
REQUESTED_TASK_DEFINITIONS = {
    "company_research": ("Research company context", "Prepare company research for the current candidature.", "candidature:company_research"),
    "draft_form_responses": ("Prepare form responses", "Prepare application form responses.", "blob:form_responses"),
    "draft_cover_letter": ("Prepare cover letter", "Prepare cover-letter body for local rendering.", "artifact:cover_letter"),
    "draft_cv": ("Prepare CV adaptation", "Prepare CV positioning for local rendering.", "artifact:cv"),
}


def get_agent_context_bundle(conn: sqlite3.Connection, purpose: str) -> dict[str, Any]:
    if purpose not in CAREER_PLAN_PURPOSES:
        raise ValueError(f"Unsupported agent context purpose: {purpose}")
    bundle = profile_context(conn, purpose, scope="agent") if purpose in PROFILE_CONTEXT_PURPOSES else {"purpose": purpose, "scope": "agent", "facts": []}
    bundle["career_plans"] = career_plan_context(conn, purpose, scope="agent")["career_plans"]
    return bundle


def submit_agent_action(
    conn: sqlite3.Connection,
    action: dict[str, Any] | str,
    *,
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
    expose_internal_ids: bool = False,
    storage_path: str = ".private",
) -> dict[str, Any]:
    _ = expose_internal_ids
    packet = parse_action_packet(action)
    if packet["action"] == "create_candidature":
        return _create_candidature_action(conn, packet["payload"], agent_name=agent_name, agent_runtime=agent_runtime, model_provider=model_provider, storage_path=storage_path)
    if packet["action"] == "start_profile":
        return _start_profile_action(conn, packet["payload"], agent_name=agent_name, agent_runtime=agent_runtime)
    raise ValueError(f"Unsupported agent action: {packet['action']}")


def parse_action_packet(action: dict[str, Any] | str) -> dict[str, Any]:
    if isinstance(action, str):
        try:
            action = json.loads(action)
        except json.JSONDecodeError as exc:
            raise ValueError("Agent action must be valid JSON") from exc
    if not isinstance(action, dict):
        raise ValueError("Agent action must be an object")
    unknown = set(action) - PACKET_KEYS
    if unknown:
        raise ValueError("Unsupported agent action keys: " + ", ".join(sorted(unknown)))
    if not isinstance(action.get("action"), str) or not action.get("action"):
        raise ValueError("Agent action name is required")
    payload = action.get("payload", {})
    if not isinstance(payload, dict):
        raise ValueError("Agent action payload must be an object")
    action_name = action["action"]
    if action_name == "start_profile":
        if payload:
            raise ValueError("start_profile does not require a payload")
        return {"action": action_name, "payload": {}}
    if action_name != "create_candidature":
        return {"action": action_name, "payload": payload}
    unknown_payload = set(payload) - ACTION_SECTIONS
    if unknown_payload:
        raise ValueError("Unsupported create_candidature payload sections: " + ", ".join(sorted(unknown_payload)))
    for section in DICT_ACTION_SECTIONS:
        value = payload.get(section, {})
        if value is None:
            payload[section] = {}
        elif not isinstance(value, dict):
            raise ValueError(f"Agent action payload section must be an object: {section}")
    if "requested_tasks" in payload:
        value = payload["requested_tasks"]
        if value is None:
            payload["requested_tasks"] = []
        elif not isinstance(value, list):
            raise ValueError("Agent action payload section must be a list: requested_tasks")
    return {"action": action["action"], "payload": payload}


def _start_profile_action(conn: sqlite3.Connection, payload: dict[str, Any], *, agent_name: str, agent_runtime: str) -> dict[str, Any]:
    _ = payload
    create_task(
        conn,
        "profile_completion",
        "Build professional profile",
        instructions="Guide the user through the eligible missing professional-profile fields and return only confirmed values.",
        state="queued",
        priority="high",
        context_hint="profile:completion",
        created_by="agent",
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        idempotent=True,
    )
    return {
        "status": "accepted",
        "action": "start_profile",
        "next": ["claim_profile_setup"],
    }


def _create_candidature_action(conn: sqlite3.Connection, payload: dict[str, Any], *, agent_name: str, agent_runtime: str, model_provider: str, storage_path: str) -> dict[str, Any]:
    source_material = payload.get("source_material", {})
    candidature = payload.get("candidature", {})
    outputs = payload.get("outputs", {})
    render = payload.get("render", {})
    requested_tasks_present = "requested_tasks" in payload
    requested_tasks = _normalize_requested_tasks(payload.get("requested_tasks", []))
    _validate_section("source_material", source_material, SOURCE_MATERIAL_FIELDS)
    _validate_section("candidature", candidature, CANDIDATURE_FIELDS)
    _validate_section("outputs", outputs, OUTPUT_FIELDS)
    _validate_section("render", render, RENDER_FIELDS)
    for key, value in render.items():
        if not isinstance(value, bool):
            raise ValueError(f"Render request must be boolean: {key}")
    if render.get("cover_letter") and not str(outputs.get("cover_letter_body") or "").strip():
        raise ValueError("cover_letter_body is required to render a cover letter")

    fields: dict[str, Any] = {}
    fields.update(_known_fields(candidature, APPLICATION_UPDATE_FIELDS | {"status", "priority", "company", "role"}))
    fields.update(_known_fields(candidature, CANDIDATURE_DETAIL_FIELDS))
    fields.update(_known_fields(outputs, OUTPUT_APP_FIELDS))
    if "keywords" in candidature:
        fields["keywords"] = candidature["keywords"]
    if source_material.get("offer_url") and not fields.get("source_url"):
        fields["source_url"] = source_material["offer_url"]
    if source_material.get("application_form_text") and not fields.get("raw_application_form"):
        fields["raw_application_form"] = source_material["application_form_text"]
    if source_material.get("offer_text"):
        fields["raw_offer"] = source_material["offer_text"]
        fields["created_by"] = "agent"
    fields.setdefault("status", "active")
    fields.setdefault("priority", "normal")
    fields.update({
        "include_field_inference_task": False,
        "include_company_research_task": False,
        "include_keyword_detection_task": True,
        "include_cv_task": False,
        "include_cover_letter_task": False,
        "include_form_responses_task": False,
    })

    created = create_candidature(conn, **fields)
    application_id = created["id"]

    for key in ("user_instructions", "conversation_context"):
        body = str(source_material.get(key) or "").strip()
        if body:
            _create_agent_blob(conn, key, body, application_id=application_id, title=key.replace("_", " ").title(), source_context=f"agent_action:create_candidature:{key}", agent_name=agent_name, agent_runtime=agent_runtime, model_provider=model_provider, current=False)

    for key in OUTPUT_BLOB_FIELDS:
        body = str(outputs.get(key) or "").strip()
        if body:
            _create_agent_blob(conn, key, body, application_id=application_id, title=key.replace("_", " ").title(), source_context=f"agent_action:create_candidature:{key}", agent_name=agent_name, agent_runtime=agent_runtime, model_provider=model_provider, current=True)

    rendered: dict[str, bool] = {}
    if render.get("cover_letter"):
        output_path = safe_artifact_output_path(storage_path, application_id, "cover-letter")
        render_document_artifact(conn, "cover-letter", output_path, application_id, {"artifact.cover_letter.body": str(outputs.get("cover_letter_body") or "").strip()}, save_version=True)
        rendered["cover_letter"] = True
    if render.get("cv"):
        output_path = safe_artifact_output_path(storage_path, application_id, "cv")
        render_document_artifact(conn, "cv", output_path, application_id, save_version=True)
        rendered["cv"] = True

    queued_count = _queue_requested_tasks(conn, application_id, requested_tasks, outputs=outputs, render=render, agent_name=agent_name, agent_runtime=agent_runtime)
    acknowledgement: dict[str, Any] = {"status": "accepted", "action": "create_candidature", "created": True, "rendered": rendered, "next": ["open_desktop"]}
    if requested_tasks_present:
        acknowledgement["queued"] = {"count": queued_count}
    return acknowledgement


def _validate_section(name: str, section: dict[str, Any], allowed: set[str]) -> None:
    unknown = set(section) - allowed
    if unknown:
        raise ValueError(f"Unsupported {name} fields: " + ", ".join(sorted(unknown)))


def _known_fields(source: dict[str, Any], allowed: set[str]) -> dict[str, Any]:
    return {key: source[key] for key in allowed if key in source}


def _normalize_requested_tasks(requested_tasks: list[Any]) -> list[dict[str, str]]:
    if len(requested_tasks) > 8:
        raise ValueError("requested_tasks may contain at most 8 tasks")
    normalized: list[dict[str, str]] = []
    for index, item in enumerate(requested_tasks):
        if not isinstance(item, dict):
            raise ValueError(f"requested_tasks item must be an object: {index}")
        unknown = set(item) - REQUESTED_TASK_FIELDS
        if unknown:
            raise ValueError("Unsupported requested_tasks fields: " + ", ".join(sorted(unknown)))
        raw_task_type = item.get("task_type")
        if not isinstance(raw_task_type, str) or not raw_task_type.strip():
            raise ValueError(f"requested_tasks item requires task_type: {index}")
        task_type = REQUESTED_TASK_ALIASES.get(raw_task_type.strip())
        if not task_type:
            raise ValueError(f"Unsupported requested task type: {raw_task_type}")
        priority = item.get("priority", "normal")
        if not isinstance(priority, str) or priority not in REQUESTED_TASK_PRIORITIES:
            raise ValueError(f"Unsupported requested task priority: {priority}")
        reason = item.get("reason", "") or ""
        if not isinstance(reason, str):
            raise ValueError(f"requested_tasks reason must be a string: {index}")
        keyword = item.get("keyword", "") or ""
        if not isinstance(keyword, str):
            raise ValueError(f"requested_tasks keyword must be a string: {index}")
        keyword = keyword.strip()
        if task_type == "keyword_definition" and not keyword:
            raise ValueError("keyword_definition requested task requires keyword")
        if task_type != "keyword_definition" and keyword:
            raise ValueError("requested_tasks keyword is only supported for keyword_definition")
        normalized.append({"task_type": task_type, "priority": priority, "reason": reason.strip()[:1000], "keyword": keyword})
    return normalized


def _queue_requested_tasks(conn: sqlite3.Connection, application_id: str, requested_tasks: list[dict[str, str]], *, outputs: dict[str, Any], render: dict[str, Any], agent_name: str, agent_runtime: str) -> int:
    queued_count = 0
    for request in requested_tasks:
        if _requested_task_completed(request["task_type"], outputs=outputs, render=render):
            continue
        task_type = request["task_type"]
        if task_type == "keyword_definition":
            keyword = request["keyword"]
            title = f"Define keyword: {keyword}"
            default_instructions = f"Define {keyword} for this candidature context."
            context_hint = f"keyword:{keyword}"
        else:
            title, default_instructions, context_hint = REQUESTED_TASK_DEFINITIONS[task_type]
        existing = find_open_task(conn, application_id, task_type, context_hint)
        create_task(conn, task_type, title, application_id=application_id, instructions=request["reason"] or default_instructions, priority=request["priority"], context_hint=context_hint, created_by="agent", agent_name=agent_name, agent_runtime=agent_runtime, notes="Requested by create_candidature action.", idempotent=True)
        if not existing:
            queued_count += 1
    return queued_count


def _requested_task_completed(task_type: str, *, outputs: dict[str, Any], render: dict[str, Any]) -> bool:
    if task_type == "company_research":
        return _has_text(outputs.get("company_research"))
    if task_type == "draft_form_responses":
        return _has_text(outputs.get("form_answers"))
    if task_type == "draft_cover_letter":
        return _has_text(outputs.get("cover_letter_body")) or bool(render.get("cover_letter"))
    if task_type == "draft_cv":
        return _has_text(outputs.get("cv_positioning")) or bool(render.get("cv"))
    return False


def _has_text(value: Any) -> bool:
    return bool(str(value or "").strip())


def _create_agent_blob(conn: sqlite3.Connection, blob_type: str, body: str, *, application_id: str, title: str, source_context: str, agent_name: str, agent_runtime: str, model_provider: str, current: bool) -> dict[str, Any]:
    return create_text_blob(
        conn,
        blob_type,
        body,
        application_id=application_id,
        title=title,
        source_context=source_context,
        review_state="current" if current else "history",
        created_by="agent",
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        model_provider=model_provider,
    )
