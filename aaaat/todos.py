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
    columns = _todo_columns(conn)
    insert_item = {key: value for key, value in item.items() if key in columns}
    column_sql = ", ".join(insert_item)
    placeholder_sql = ", ".join(":" + key for key in insert_item)
    conn.execute(f"INSERT INTO todos({column_sql}) VALUES ({placeholder_sql})", insert_item)
    conn.commit()
    return get_todo(conn, item["id"])


def list_todos(conn: sqlite3.Connection, application_id: str | None = None) -> list[dict[str, Any]]:
    columns = _todo_columns(conn)
    order = _todo_order_clause(columns)
    if application_id:
        rows = conn.execute(
            f"SELECT * FROM todos WHERE application_id = ? {order}",
            (application_id,),
        ).fetchall()
    else:
        rows = conn.execute(f"SELECT * FROM todos {order}").fetchall()
    return [_normalize_todo_row(row_to_dict(row)) for row in rows]


def get_todo(conn: sqlite3.Connection, todo_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    if row is None:
        raise KeyError(f"Todo not found: {todo_id}")
    return _normalize_todo_row(row_to_dict(row))


def update_todo(conn: sqlite3.Connection, todo_id: str, **fields: Any) -> dict[str, Any]:
    allowed = {"application_id", "title", "body", "state", "pinned", "due_at"}
    columns = _todo_columns(conn)
    updates = {key: fields[key] for key in allowed if key in fields and key in columns}
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


def _todo_columns(conn: sqlite3.Connection) -> set[str]:
    return {str(row["name"]) for row in conn.execute("PRAGMA table_info(todos)").fetchall()}


def _todo_order_clause(columns: set[str]) -> str:
    order_parts = []
    if "pinned" in columns:
        order_parts.append("pinned DESC")
    if "due_at" in columns:
        order_parts.append("due_at")
    order_parts.append("updated_at DESC")
    return "ORDER BY " + ", ".join(order_parts)


def _normalize_todo_row(row: dict[str, Any]) -> dict[str, Any]:
    row.setdefault("pinned", 0)
    row.setdefault("due_at", "")
    return row
