from __future__ import annotations

import sqlite3
from typing import Any

from .artifacts import list_artifacts
from .db import list_applications, list_glossary, list_raw_intake, profile_variables, required_profile_variables


def dashboard_payload(conn: sqlite3.Connection, include_raw: bool = False) -> dict[str, Any]:
    apps = list_applications(conn)
    for app in apps:
        app["artifacts"] = list_artifacts(conn, app["id"])
        if include_raw:
            app["raw_intake"] = list_raw_intake(conn, app["id"])
    return {
        "applications": apps,
        "glossary": list_glossary(conn),
        "profile_variables": profile_variables(conn),
        "missing_profile_variables": required_profile_variables(conn),
    }


def application_context(conn: sqlite3.Connection, application_id: str) -> dict[str, Any]:
    payload = dashboard_payload(conn, include_raw=True)
    selected = next(app for app in payload["applications"] if app["id"] == application_id)
    return {
        "application": selected,
        "glossary": payload["glossary"],
        "artifact_slots": ["cover_letter", "cv_variant", "interview_guide", "form_answer"],
    }
