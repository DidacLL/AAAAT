from __future__ import annotations

import sqlite3
from typing import Any

from .artifacts import list_artifacts
from .db import (
    APPLICATION_UPDATE_FIELDS,
    add_raw_intake,
    create_application,
    get_application,
    list_raw_intake,
    row_to_dict,
    update_application,
    utc_now,
)
from .notes import list_notes
from .tasks import ensure_initial_tasks, list_tasks
from .text_blobs import list_text_blobs
from .todos import list_todos


CANDIDATURE_DETAIL_FIELDS = {
    "description",
    "salary_expectation",
    "publication_date",
    "application_date",
    "raw_application_form",
    "cv_sent_artifact_id",
    "cover_letter_artifact_id",
    "strengths",
    "questions_to_ask",
    "tech_stack",
    "valuation",
}


def create_candidature(conn: sqlite3.Connection, **fields: Any) -> dict[str, Any]:
    app_fields = {key: fields[key] for key in APPLICATION_UPDATE_FIELDS if key in fields}
    for required in ("company", "role", "status", "priority"):
        if required in fields:
            app_fields[required] = fields[required]
    if "keywords" in fields:
        app_fields["keywords"] = fields["keywords"]
    app = create_application(conn, **app_fields)
    detail_fields = {key: fields[key] for key in CANDIDATURE_DETAIL_FIELDS if key in fields}
    ensure_candidature_details(conn, app["id"], **detail_fields)
    if fields.get("raw_offer"):
        add_raw_intake(conn, app["id"], fields["raw_offer"], fields.get("created_by", "user"))
    ensure_initial_tasks(
        conn,
        app["id"],
        include_cv=bool(fields.get("include_cv_task")),
        include_cover_letter=bool(fields.get("include_cover_letter_task")),
        include_form_responses=bool(fields.get("include_form_responses_task")),
    )
    return get_candidature(conn, app["id"])


def ensure_candidature_details(conn: sqlite3.Connection, application_id: str, **fields: Any) -> dict[str, Any]:
    now = utc_now()
    conn.execute(
        "INSERT OR IGNORE INTO candidature_details(application_id, updated_at) VALUES (?, ?)",
        (application_id, now),
    )
    updates = {key: fields[key] for key in CANDIDATURE_DETAIL_FIELDS if key in fields}
    if updates:
        updates["updated_at"] = now
        updates["application_id"] = application_id
        assignments = ", ".join(f"{key} = :{key}" for key in updates if key != "application_id")
        conn.execute(f"UPDATE candidature_details SET {assignments} WHERE application_id = :application_id", updates)
    conn.commit()
    return get_candidature_details(conn, application_id)


def get_candidature_details(conn: sqlite3.Connection, application_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM candidature_details WHERE application_id = ?", (application_id,)).fetchone()
    if row is None:
        return ensure_candidature_details(conn, application_id)
    return row_to_dict(row)


def update_candidature(conn: sqlite3.Connection, application_id: str, **fields: Any) -> dict[str, Any]:
    app_fields = {key: fields[key] for key in APPLICATION_UPDATE_FIELDS if key in fields}
    if "keywords" in fields:
        app_fields["keywords"] = fields["keywords"]
    if app_fields:
        update_application(conn, application_id, **app_fields)
    detail_fields = {key: fields[key] for key in CANDIDATURE_DETAIL_FIELDS if key in fields}
    if detail_fields:
        ensure_candidature_details(conn, application_id, **detail_fields)
    return get_candidature(conn, application_id)


def get_candidature(conn: sqlite3.Connection, application_id: str, *, include_related: bool = True) -> dict[str, Any]:
    app = get_application(conn, application_id)
    app["domain_type"] = "Candidature"
    app["details"] = get_candidature_details(conn, application_id)
    if include_related:
        app["raw_intake"] = list_raw_intake(conn, application_id)
        app["artifacts"] = list_artifacts(conn, application_id)
        app["tasks"] = list_tasks(conn, application_id=application_id)
        app["todos"] = list_todos(conn, application_id)
        app["notes_records"] = list_notes(conn, application_id)
        app["text_blobs"] = list_text_blobs(conn, application_id)
    return app


def list_candidatures(conn: sqlite3.Connection, *, include_related: bool = False) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT id FROM applications ORDER BY updated_at DESC").fetchall()
    return [get_candidature(conn, row["id"], include_related=include_related) for row in rows]
