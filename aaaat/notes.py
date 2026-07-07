from __future__ import annotations

import sqlite3
from typing import Any

from .db import new_id, row_to_dict, utc_now


def create_note(
    conn: sqlite3.Connection,
    body: str,
    *,
    application_id: str | None = None,
    note_type: str = "general",
    created_by: str = "user",
) -> dict[str, Any]:
    now = utc_now()
    item = {
        "id": new_id("note"),
        "application_id": application_id,
        "note_type": note_type,
        "body": body,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    conn.execute(
        """INSERT INTO notes(
          id, application_id, note_type, body, created_by, created_at, updated_at
        ) VALUES (
          :id, :application_id, :note_type, :body, :created_by, :created_at, :updated_at
        )""",
        item,
    )
    conn.commit()
    return item


def list_notes(conn: sqlite3.Connection, application_id: str | None = None) -> list[dict[str, Any]]:
    if application_id:
        rows = conn.execute(
            "SELECT * FROM notes WHERE application_id = ? ORDER BY updated_at DESC",
            (application_id,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
    return [row_to_dict(row) for row in rows]


def get_note(conn: sqlite3.Connection, note_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    if row is None:
        raise KeyError(f"Note not found: {note_id}")
    return row_to_dict(row)


def update_note(conn: sqlite3.Connection, note_id: str, **fields: Any) -> dict[str, Any]:
    allowed = {"application_id", "note_type", "body", "created_by"}
    updates = {key: fields[key] for key in allowed if key in fields}
    if updates:
        updates["updated_at"] = utc_now()
        updates["id"] = note_id
        assignments = ", ".join(f"{key} = :{key}" for key in updates if key != "id")
        conn.execute(f"UPDATE notes SET {assignments} WHERE id = :id", updates)
        conn.commit()
    return get_note(conn, note_id)
