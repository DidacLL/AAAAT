from __future__ import annotations

import sqlite3
from typing import Any

from .db import new_id, row_to_dict, utc_now


TEXT_BLOB_REVIEW_STATES = {"draft", "suggested", "reviewed", "applied", "archived"}


def create_text_blob(
    conn: sqlite3.Connection,
    blob_type: str,
    body: str,
    *,
    application_id: str | None = None,
    title: str = "",
    source_context: str = "",
    review_state: str = "draft",
    created_by: str = "user",
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
    notes: str = "",
) -> dict[str, Any]:
    if review_state not in TEXT_BLOB_REVIEW_STATES:
        raise ValueError(f"Invalid text blob review state: {review_state}")
    now = utc_now()
    item = {
        "id": new_id("blob"),
        "application_id": application_id,
        "blob_type": blob_type,
        "title": title,
        "body": body,
        "source_context": source_context,
        "review_state": review_state,
        "created_by": created_by,
        "agent_name": agent_name,
        "agent_runtime": agent_runtime,
        "model_provider": model_provider,
        "created_at": now,
        "updated_at": now,
        "notes": notes,
    }
    conn.execute(
        """INSERT INTO text_blobs(
          id, application_id, blob_type, title, body, source_context, review_state,
          created_by, agent_name, agent_runtime, model_provider, created_at, updated_at, notes
        ) VALUES (
          :id, :application_id, :blob_type, :title, :body, :source_context, :review_state,
          :created_by, :agent_name, :agent_runtime, :model_provider, :created_at, :updated_at, :notes
        )""",
        item,
    )
    conn.commit()
    return item


def list_text_blobs(conn: sqlite3.Connection, application_id: str | None = None) -> list[dict[str, Any]]:
    if application_id:
        rows = conn.execute(
            "SELECT * FROM text_blobs WHERE application_id = ? ORDER BY updated_at DESC",
            (application_id,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM text_blobs ORDER BY updated_at DESC").fetchall()
    return [row_to_dict(row) for row in rows]


def get_text_blob(conn: sqlite3.Connection, blob_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM text_blobs WHERE id = ?", (blob_id,)).fetchone()
    if row is None:
        raise KeyError(f"Text blob not found: {blob_id}")
    return row_to_dict(row)


def update_text_blob(conn: sqlite3.Connection, blob_id: str, **fields: Any) -> dict[str, Any]:
    allowed = {
        "application_id",
        "blob_type",
        "title",
        "body",
        "source_context",
        "review_state",
        "created_by",
        "agent_name",
        "agent_runtime",
        "model_provider",
        "notes",
    }
    updates = {key: fields[key] for key in allowed if key in fields}
    if "review_state" in updates and updates["review_state"] not in TEXT_BLOB_REVIEW_STATES:
        raise ValueError(f"Invalid text blob review state: {updates['review_state']}")
    if updates:
        updates["updated_at"] = utc_now()
        updates["id"] = blob_id
        assignments = ", ".join(f"{key} = :{key}" for key in updates if key != "id")
        conn.execute(f"UPDATE text_blobs SET {assignments} WHERE id = :id", updates)
        conn.commit()
    return get_text_blob(conn, blob_id)
