from __future__ import annotations

import sqlite3
from typing import Any

from .db import new_id, row_to_dict, utc_now


TODO_STATES = {"open", "done", "dismissed"}


def create_todo(
    conn: sqlite3.Connection,
    title: str,
    *,
    application_id: str | None = None,
    body: str = "",
    state: str = "open",
    pinned: bool = False,
    due_at: str = "",
) -> dict[str, Any]:
    if state not in TODO_STATES:
        raise ValueError(f"Invalid todo state: {state}")
    now = utc_now()
    item = {
        "id": new_id("todo"),
        "application_id": application_id,
        "title": title,
        "body": body,
        "state": state,
        "pinned": 1 if pinned else 0,
        "due_at": due_at,
        "created_at": now,
        "updated_at": now,
    }
    conn.execute(
        """INSERT INTO todos(
          id, application_id, title, body, state, pinned, due_at, created_at, updated_at
        ) VALUES (
          :id, :application_id, :title, :body, :state, :pinned, :due_at, :created_at, :updated_at
        )""",
        item,
    )
    conn.commit()
    return item


def list_todos(conn: sqlite3.Connection, application_id: str | None = None) -> list[dict[str, Any]]:
    if application_id:
        rows = conn.execute(
            "SELECT * FROM todos WHERE application_id = ? ORDER BY pinned DESC, due_at, updated_at DESC",
            (application_id,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM todos ORDER BY pinned DESC, due_at, updated_at DESC").fetchall()
    return [row_to_dict(row) for row in rows]


def get_todo(conn: sqlite3.Connection, todo_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    if row is None:
        raise KeyError(f"Todo not found: {todo_id}")
    return row_to_dict(row)


def update_todo(conn: sqlite3.Connection, todo_id: str, **fields: Any) -> dict[str, Any]:
    allowed = {"application_id", "title", "body", "state", "pinned", "due_at"}
    updates = {key: fields[key] for key in allowed if key in fields}
    if "state" in updates and updates["state"] not in TODO_STATES:
        raise ValueError(f"Invalid todo state: {updates['state']}")
    if "pinned" in updates:
        updates["pinned"] = 1 if updates["pinned"] else 0
    if updates:
        updates["updated_at"] = utc_now()
        updates["id"] = todo_id
        assignments = ", ".join(f"{key} = :{key}" for key in updates if key != "id")
        conn.execute(f"UPDATE todos SET {assignments} WHERE id = :id", updates)
        conn.commit()
    return get_todo(conn, todo_id)
