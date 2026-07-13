from __future__ import annotations

import sqlite3
from typing import Any

from .artifacts import list_artifacts
from .candidatures import list_candidatures
from .db import list_glossary, list_raw_intake, profile_variables, required_profile_variables
from .privacy import list_variables, resolve_variables
from .profile_facts import list_profile_facts, profile_context
from .review_queue import review_queue, sorted_applications


def dashboard_payload(conn: sqlite3.Connection, include_raw: bool = False) -> dict[str, Any]:
    glossary = list_glossary(conn)
    apps = sorted_applications(list_candidatures(conn, include_related=False), glossary)
    for app in apps:
        app["artifacts"] = list_artifacts(conn, app["id"])
        app["last_activity"] = app.get("updated_at") or app.get("created_at") or ""
        app["call_probability_label"] = "Call probability: pending signal model"
        if include_raw:
            app["raw_intake"] = list_raw_intake(conn, app["id"])
    payload = {
        "applications": apps,
        "glossary": glossary,
        "profile_variables": profile_variables(conn),
        "profile_variable_records": list_variables(conn),
        "profile_facts": list_profile_facts(conn),
        "profile_context_dashboard": profile_context(conn, "candidature_fit", scope="local_dashboard"),
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
        "profile_context": profile_context(conn, "candidature_fit", scope="agent"),
        "artifact_slots": ["cover_letter", "cv_variant", "interview_guide", "form_answer"],
    }
