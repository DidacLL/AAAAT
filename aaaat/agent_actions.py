from __future__ import annotations

import json
import sqlite3
from typing import Any

from .candidatures import CANDIDATURE_DETAIL_FIELDS, create_candidature
from .db import APPLICATION_UPDATE_FIELDS
from .profile_facts import profile_context
from .templates import render_document_artifact, safe_artifact_output_path
from .text_blobs import create_text_blob


ACTION_SECTIONS = {"source_material", "candidature", "outputs", "render"}
PACKET_KEYS = {"action", "payload"}
SOURCE_MATERIAL_FIELDS = {
    "offer_text",
    "offer_url",
    "offer_source",
    "application_form_text",
    "user_instructions",
    "conversation_context",
}
CANDIDATURE_FIELDS = {
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
    "tech_stack",
    "valuation",
}
OUTPUT_FIELDS = {
    "company_research",
    "technical_reading",
    "call_signals",
    "pitch",
    "smart_question",
    "risks_to_avoid",
    "prepare_first",
    "prepare_later",
    "form_answers",
    "cover_letter_body",
    "cv_positioning",
}
OUTPUT_APP_FIELDS = {
    "company_research",
    "technical_reading",
    "call_signals",
    "pitch",
    "smart_question",
    "risks_to_avoid",
    "prepare_first",
    "prepare_later",
    "form_answers",
}
OUTPUT_BLOB_FIELDS = {"cover_letter_body", "cv_positioning"}
RENDER_FIELDS = {"cover_letter", "cv"}


def get_agent_context_bundle(conn: sqlite3.Connection, purpose: str) -> dict[str, Any]:
    return profile_context(conn, purpose, scope="agent")


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
        return _create_candidature_action(
            conn,
            packet["payload"],
            agent_name=agent_name,
            agent_runtime=agent_runtime,
            model_provider=model_provider,
            storage_path=storage_path,
        )
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
    unknown_payload = set(payload) - ACTION_SECTIONS
    if unknown_payload:
        raise ValueError("Unsupported create_candidature payload sections: " + ", ".join(sorted(unknown_payload)))
    for section in ACTION_SECTIONS:
        value = payload.get(section, {})
        if value is None:
            payload[section] = {}
        elif not isinstance(value, dict):
            raise ValueError(f"Agent action payload section must be an object: {section}")
    return {"action": action["action"], "payload": payload}


def _create_candidature_action(
    conn: sqlite3.Connection,
    payload: dict[str, Any],
    *,
    agent_name: str,
    agent_runtime: str,
    model_provider: str,
    storage_path: str,
) -> dict[str, Any]:
    source_material = payload.get("source_material", {})
    candidature = payload.get("candidature", {})
    outputs = payload.get("outputs", {})
    render = payload.get("render", {})
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
    if source_material.get("offer_source") and not fields.get("source"):
        fields["source"] = source_material["offer_source"]
    if source_material.get("application_form_text") and not fields.get("raw_application_form"):
        fields["raw_application_form"] = source_material["application_form_text"]
    if source_material.get("offer_text"):
        fields["raw_offer"] = source_material["offer_text"]
        fields["created_by"] = "agent"

    fields.setdefault("status", "draft")
    fields.setdefault("priority", "normal")
    fields.update(
        {
            "include_field_inference_task": False,
            "include_company_research_task": False,
            "include_keyword_detection_task": False,
            "include_cv_task": False,
            "include_cover_letter_task": False,
            "include_form_responses_task": False,
        }
    )

    created = create_candidature(conn, **fields)
    application_id = created["id"]

    for key in ("user_instructions", "conversation_context"):
        body = str(source_material.get(key) or "").strip()
        if body:
            _create_agent_blob(
                conn,
                key,
                body,
                application_id=application_id,
                title=key.replace("_", " ").title(),
                source_context=f"agent_action:create_candidature:{key}",
                agent_name=agent_name,
                agent_runtime=agent_runtime,
                model_provider=model_provider,
            )

    for key in OUTPUT_BLOB_FIELDS:
        body = str(outputs.get(key) or "").strip()
        if body:
            _create_agent_blob(
                conn,
                key,
                body,
                application_id=application_id,
                title=key.replace("_", " ").title(),
                source_context=f"agent_action:create_candidature:{key}",
                agent_name=agent_name,
                agent_runtime=agent_runtime,
                model_provider=model_provider,
            )

    rendered: dict[str, bool] = {}
    if render.get("cover_letter"):
        body = str(outputs.get("cover_letter_body") or "").strip()
        output_path = safe_artifact_output_path(storage_path, application_id, "cover-letter")
        render_document_artifact(
            conn,
            "cover-letter",
            output_path,
            application_id,
            {"artifact.cover_letter.body": body},
        )
        rendered["cover_letter"] = True
    if render.get("cv"):
        output_path = safe_artifact_output_path(storage_path, application_id, "cv")
        render_document_artifact(conn, "cv", output_path, application_id)
        rendered["cv"] = True

    return {
        "status": "accepted",
        "action": "create_candidature",
        "created": True,
        "rendered": rendered,
        "next": ["open_dashboard"],
    }


def _validate_section(name: str, section: dict[str, Any], allowed: set[str]) -> None:
    unknown = set(section) - allowed
    if unknown:
        raise ValueError(f"Unsupported {name} fields: " + ", ".join(sorted(unknown)))


def _known_fields(source: dict[str, Any], allowed: set[str]) -> dict[str, Any]:
    return {key: source[key] for key in allowed if key in source}


def _create_agent_blob(
    conn: sqlite3.Connection,
    blob_type: str,
    body: str,
    *,
    application_id: str,
    title: str,
    source_context: str,
    agent_name: str,
    agent_runtime: str,
    model_provider: str,
) -> dict[str, Any]:
    return create_text_blob(
        conn,
        blob_type,
        body,
        application_id=application_id,
        title=title,
        source_context=source_context,
        review_state="draft",
        created_by="agent",
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        model_provider=model_provider,
    )
