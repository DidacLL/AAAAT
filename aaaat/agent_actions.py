from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Callable

from .candidatures import create_candidature
from .profile_facts import PURPOSE_FLAGS, profile_context
from .templates import render_document_artifact, safe_artifact_output_path
from .text_blobs import create_text_blob


CREATE_PAYLOAD_SECTIONS = {"candidature", "research", "form_answers", "cover_letter", "render"}
SAFE_CANDIDATURE_FIELDS = {
    "company",
    "role",
    "status",
    "priority",
    "source",
    "source_url",
    "location",
    "remote_mode",
    "next_action",
    "offer_snapshot",
    "keywords",
    "description",
    "salary_expectation",
    "publication_date",
    "application_date",
    "raw_application_form",
    "tech_stack",
    "valuation",
}
RESEARCH_FIELDS = {
    "company_research",
    "technical_reading",
    "call_signals",
    "pitch",
    "smart_question",
    "risks_to_avoid",
    "prepare_first",
    "prepare_later",
}
RENDER_FIELDS = {"cover_letter"}
COVER_LETTER_FIELDS = {"body"}
NEXT_OPEN_DASHBOARD = ["open_dashboard"]


def get_agent_context_bundle(conn: sqlite3.Connection, purpose: str) -> dict[str, Any]:
    cleaned = str(purpose or "").strip()
    if cleaned not in PURPOSE_FLAGS:
        raise ValueError(f"Unsupported profile context purpose: {cleaned}")
    return {
        "status": "ok",
        "purpose": cleaned,
        "context": {"profile_context": profile_context(conn, cleaned, scope="agent")},
    }


def submit_agent_action(
    conn: sqlite3.Connection,
    action: dict[str, Any] | str,
    *,
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
    expose_internal_ids: bool = False,
    storage_path: str | Path = ".private",
) -> dict[str, Any]:
    data = _parse_action(action)
    unknown_top = set(data) - {"action", "payload"}
    if unknown_top:
        raise ValueError(f"Unsupported agent action keys: {', '.join(sorted(unknown_top))}")
    name = data.get("action")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Agent action requires action")
    handler = HANDLERS.get(name)
    if handler is None:
        raise ValueError(f"Unsupported agent action: {name}")
    payload = data.get("payload")
    if not isinstance(payload, dict):
        raise ValueError("Agent action requires object payload")
    return handler(
        conn,
        payload,
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        model_provider=model_provider,
        expose_internal_ids=expose_internal_ids,
        storage_path=storage_path,
    )


def handle_create_candidature(
    conn: sqlite3.Connection,
    payload: dict[str, Any],
    *,
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
    expose_internal_ids: bool = False,
    storage_path: str | Path = ".private",
) -> dict[str, Any]:
    unknown_sections = set(payload) - CREATE_PAYLOAD_SECTIONS
    if unknown_sections:
        raise ValueError(f"Unsupported create_candidature sections: {', '.join(sorted(unknown_sections))}")
    candidature = _section(payload, "candidature", required=True)
    research = _section(payload, "research")
    cover_letter = _section(payload, "cover_letter")
    render = _section(payload, "render")
    unknown_candidature = set(candidature) - SAFE_CANDIDATURE_FIELDS
    if unknown_candidature:
        raise ValueError(f"Unsupported candidature fields: {', '.join(sorted(unknown_candidature))}")
    unknown_research = set(research) - RESEARCH_FIELDS
    if unknown_research:
        raise ValueError(f"Unsupported research fields: {', '.join(sorted(unknown_research))}")
    unknown_cover_letter = set(cover_letter) - COVER_LETTER_FIELDS
    if unknown_cover_letter:
        raise ValueError(f"Unsupported cover_letter fields: {', '.join(sorted(unknown_cover_letter))}")
    unknown_render = set(render) - RENDER_FIELDS
    if unknown_render:
        raise ValueError(f"Unsupported render fields: {', '.join(sorted(unknown_render))}")
    company = _required_text(candidature, "company")
    role = _required_text(candidature, "role")
    fields = _normalize_candidature_fields(candidature)
    fields.update(_normalize_text_fields(research))
    if "form_answers" in payload:
        if not isinstance(payload["form_answers"], str):
            raise ValueError("form_answers must be a string")
        fields["form_answers"] = payload["form_answers"]
    body = ""
    if cover_letter:
        body = _required_text(cover_letter, "body")
    render_cover_letter = False
    if "cover_letter" in render:
        if not isinstance(render["cover_letter"], bool):
            raise ValueError("render.cover_letter must be a boolean")
        render_cover_letter = render["cover_letter"]
    if render_cover_letter and not body:
        raise ValueError("render.cover_letter requires cover_letter.body")
    app = create_candidature(
        conn,
        **fields,
        company=company,
        role=role,
        include_field_inference_task=False,
        include_company_research_task=False,
        include_keyword_detection_task=False,
        include_cv_task=False,
        include_cover_letter_task=False,
        include_form_responses_task=False,
    )
    if body:
        create_text_blob(
            conn,
            "render_input",
            body,
            application_id=app["id"],
            title="Cover-letter body",
            source_context="render_input:cover-letter",
            review_state="suggested",
            created_by="agent",
            agent_name=agent_name,
            agent_runtime=agent_runtime,
            model_provider=model_provider,
        )
    rendered = False
    if render_cover_letter:
        output = safe_artifact_output_path(storage_path, app["id"], "cover-letter")
        render_document_artifact(
            conn,
            "cover-letter",
            output,
            app["id"],
            {"artifact.cover_letter.body": body},
        )
        rendered = True
    response: dict[str, Any] = {
        "status": "accepted",
        "action": "create_candidature",
        "created": True,
        "rendered": rendered,
        "next": NEXT_OPEN_DASHBOARD,
    }
    if expose_internal_ids:
        response["application_id"] = app["id"]
    return response


def _parse_action(action: dict[str, Any] | str) -> dict[str, Any]:
    if isinstance(action, str):
        try:
            parsed = json.loads(action)
        except json.JSONDecodeError as exc:
            raise ValueError("Agent action must be valid JSON") from exc
    else:
        parsed = action
    if not isinstance(parsed, dict):
        raise ValueError("Agent action must be a JSON object")
    return parsed


def _section(payload: dict[str, Any], name: str, *, required: bool = False) -> dict[str, Any]:
    if name not in payload:
        if required:
            raise ValueError(f"create_candidature requires {name}")
        return {}
    section = payload[name]
    if not isinstance(section, dict):
        raise ValueError(f"{name} must be an object")
    return section


def _required_text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} is required")
    return value


def _normalize_candidature_fields(fields: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in fields.items():
        if key in {"company", "role"}:
            continue
        if key == "keywords":
            normalized[key] = _normalize_keywords(value)
        elif key == "valuation":
            if isinstance(value, bool) or not isinstance(value, int):
                raise ValueError("valuation must be an integer")
            normalized[key] = value
        else:
            if not isinstance(value, str):
                raise ValueError(f"{key} must be a string")
            normalized[key] = value
    return normalized


def _normalize_text_fields(fields: dict[str, Any]) -> dict[str, str]:
    normalized = {}
    for key, value in fields.items():
        if not isinstance(value, str):
            raise ValueError(f"{key} must be a string")
        normalized[key] = value
    return normalized


def _normalize_keywords(value: Any) -> list[str]:
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, list) and all(isinstance(item, str) for item in value):
        return [item.strip() for item in value if item.strip()]
    raise ValueError("keywords must be a list of strings or comma-delimited string")


ActionHandler = Callable[..., dict[str, Any]]
HANDLERS: dict[str, ActionHandler] = {
    "create_candidature": handle_create_candidature,
}
