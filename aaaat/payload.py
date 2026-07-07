from __future__ import annotations

import sqlite3
from typing import Any

from .artifacts import list_artifacts
from .db import list_applications, list_glossary, list_raw_intake, profile_variables, required_profile_variables
from .privacy import resolve_variables
from .review_queue import next_action_date, review_queue, sorted_applications


def dashboard_payload(conn: sqlite3.Connection, include_raw: bool = False) -> dict[str, Any]:
    glossary = list_glossary(conn)
    apps = sorted_applications(list_applications(conn), glossary)
    for app in apps:
        app["artifacts"] = list_artifacts(conn, app["id"])
        app["last_activity"] = app.get("updated_at") or app.get("created_at") or ""
        app["next_action_date"] = next_action_date(app)
        app["call_probability_label"] = "Call probability: pending signal model"
        if include_raw:
            app["raw_intake"] = list_raw_intake(conn, app["id"])
    payload = {
        "applications": apps,
        "glossary": glossary,
        "profile_variables": profile_variables(conn),
        "missing_profile_variables": required_profile_variables(conn),
    }
    payload["review_queue"] = review_queue(payload)
    return payload


def application_context(conn: sqlite3.Connection, application_id: str) -> dict[str, Any]:
    payload = dashboard_payload(conn, include_raw=True)
    selected = next(app for app in payload["applications"] if app["id"] == application_id)
    return {
        "application": selected,
        "glossary": payload["glossary"],
        "variables": resolve_variables(conn, "agent"),
        "artifact_slots": ["cover_letter", "cv_variant", "interview_guide", "form_answer"],
    }
