from __future__ import annotations

import json
import sqlite3
from typing import Any

from .db import profile_variables, set_profile_variable


PROFILE_COMPLETION_KEYS = (
    "profile.display_name",
    "profile.email",
    "profile.phone",
    "profile.location",
    "profile.main_page_url",
    "profile.links",
    "profile.summary.default",
    "profile.experience",
    "profile.education",
    "profile.skills",
    "profile.projects",
    "profile.career.objectives",
    "profile.career.constraints",
    "profile.career.target_roles",
    "profile.career.target_markets",
    "profile.career.direction",
    "profile.writing.tone",
    "profile.writing.preferences",
    "profile.cv.reusable_material",
    "profile.cover_letter.reusable_material",
)
DENIED_PROFILE_KEYS = {"profile.internal_id", "profile.storage_path"}


def profile_completion_context(conn: sqlite3.Connection) -> dict[str, Any]:
    values = profile_variables(conn)
    missing = [key for key in PROFILE_COMPLETION_KEYS if not str(values.get(key) or "").strip()]
    protected = [key for key in PROFILE_COMPLETION_KEYS if str(values.get(key) or "").strip()]
    return {
        "eligible_fields": list(PROFILE_COMPLETION_KEYS),
        "missing_fields": missing,
        "protected_fields": protected,
        "instructions": [
            "Discuss the professional profile naturally and follow the user's chosen level of detail.",
            "Store only grounded values the user chooses to provide for eligible missing fields.",
            "The user decides when the supplied profile information is enough for their current purpose.",
            "Existing non-empty desktop values are protected; their raw contents are intentionally not included here.",
            "Omit fields that the user does not provide or does not want to include.",
        ],
    }


def parse_profile_completion_result(result_body: str) -> dict[str, Any]:
    try:
        payload = json.loads(result_body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Profile completion result is not valid JSON: {exc.msg}") from exc
    if not isinstance(payload, dict):
        raise ValueError("Profile completion result must be an object")
    variables = payload.get("variables", payload.get("fields"))
    if not isinstance(variables, dict):
        raise ValueError("Profile completion result requires a variables object")
    return variables


def apply_profile_completion_result(
    conn: sqlite3.Connection,
    result_body: str,
    *,
    agent_name: str = "",
    agent_runtime: str = "",
) -> dict[str, Any]:
    variables = parse_profile_completion_result(result_body)
    current = profile_variables(conn)
    bounded: dict[str, Any] = {}
    retained: list[str] = []
    for key, value in variables.items():
        cleaned = str(key).strip()
        if cleaned not in PROFILE_COMPLETION_KEYS:
            raise ValueError(f"Profile variable is not permitted: {cleaned}")
        if str(current.get(cleaned) or "").strip():
            retained.append(cleaned)
            continue
        bounded[cleaned] = value
    acknowledgement = submit_profile_updates(
        conn,
        bounded,
        agent_name=agent_name,
        agent_runtime=agent_runtime,
    )
    retained_fields = sorted(retained)
    acknowledgement["retained"] = retained_fields
    acknowledgement["skipped"] = retained_fields
    return acknowledgement


def submit_profile_updates(
    conn: sqlite3.Connection,
    variables: dict[str, Any],
    *,
    agent_name: str = "",
    agent_runtime: str = "",
) -> dict[str, Any]:
    """Apply a bounded assisted-profile result without exposing record IDs."""
    if not isinstance(variables, dict) or len(variables) > 64:
        raise ValueError("Profile updates must be an object with at most 64 values")
    updated: list[str] = []
    for raw_key, value in variables.items():
        key = str(raw_key).strip()
        if key not in PROFILE_COMPLETION_KEYS or key in DENIED_PROFILE_KEYS:
            raise ValueError(f"Profile variable is not permitted: {key}")
        if not isinstance(value, str) or len(value) > 20000:
            raise ValueError(f"Profile variable must be bounded text: {key}")
        set_profile_variable(conn, key, value.strip())
        updated.append(key)
    return {
        "status": "accepted",
        "action": "update_profile",
        "updated": sorted(updated),
        "provenance": {"agent_name": agent_name, "agent_runtime": agent_runtime},
        "next": ["continue_conversation"],
    }
