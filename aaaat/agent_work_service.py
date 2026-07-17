from __future__ import annotations

import sqlite3
from typing import Any

from .agent_access import build_agent_work_item, get_task_for_capability, task_capability
from .db import row_to_dict, utc_now
from .tasks import get_task, update_task

_PROGRESS_PHASES = {"accepted", "planning", "working", "waiting", "blocked", "finalizing"}


def claim_next_agent_work(conn: sqlite3.Connection) -> dict[str, Any] | None:
    """Atomically claim one ready attempt and return its complete bounded work item.

    The most recent explicit desktop action is selected before background work so
    a connected conversation receives the operation the user just requested.
    """
    conn.execute("BEGIN IMMEDIATE")
    try:
        row = conn.execute(
            """SELECT * FROM tasks
            WHERE state = 'queued'
            ORDER BY
              CASE WHEN created_by = 'desktop_action' THEN 0 ELSE 1 END,
              CASE WHEN created_by = 'desktop_action' THEN created_at END DESC,
              CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
              created_at
            LIMIT 1"""
        ).fetchone()
        if row is None:
            conn.rollback()
            return None
        task = row_to_dict(row)
        changed = conn.execute(
            "UPDATE tasks SET state = 'claimed', updated_at = ? WHERE id = ? AND state = 'queued'",
            (utc_now(), task["id"]),
        ).rowcount
        if changed != 1:
            conn.rollback()
            return None
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    claimed = get_task(conn, str(task["id"]))
    return build_agent_work_item(conn, claimed)


def report_agent_task_progress(
    conn: sqlite3.Connection,
    capability: str,
    *,
    phase: str,
    message: str = "",
    percent: int | None = None,
) -> dict[str, Any]:
    """Persist one bounded progress event for the attempt authorized by capability."""
    task = get_task_for_capability(conn, capability)
    state = str(task.get("state") or "")
    if state not in {"claimed", "in_progress"}:
        raise ValueError(f"Task is not accepting progress in state {state}")
    normalized_phase = str(phase or "").strip().lower()
    if normalized_phase not in _PROGRESS_PHASES:
        raise ValueError(f"Unsupported progress phase: {normalized_phase}")
    normalized_message = str(message or "").strip()[:2000]
    normalized_percent = None if percent is None else max(0, min(99, int(percent)))
    _ensure_progress_table(conn)
    sequence = int(
        conn.execute(
            "SELECT COALESCE(MAX(sequence), 0) + 1 FROM agent_task_progress WHERE task_id = ?",
            (task["id"],),
        ).fetchone()[0]
    )
    conn.execute(
        """INSERT INTO agent_task_progress(task_id, sequence, phase, message, percent, created_at)
        VALUES (?, ?, ?, ?, ?, ?)""",
        (task["id"], sequence, normalized_phase, normalized_message, normalized_percent, utc_now()),
    )
    conn.commit()
    if state == "claimed":
        update_task(conn, str(task["id"]), state="in_progress")
    return {
        "status": "accepted",
        "task_capability": task_capability(conn, task),
        "state": "in_progress",
        "progress": {
            "sequence": sequence,
            "phase": normalized_phase,
            "message": normalized_message,
            "percent": normalized_percent,
        },
    }


def latest_agent_task_progress(conn: sqlite3.Connection, capability: str) -> dict[str, Any] | None:
    task = get_task_for_capability(conn, capability)
    _ensure_progress_table(conn)
    row = conn.execute(
        """SELECT sequence, phase, message, percent, created_at
        FROM agent_task_progress WHERE task_id = ? ORDER BY sequence DESC LIMIT 1""",
        (task["id"],),
    ).fetchone()
    return row_to_dict(row) if row else None


def _ensure_progress_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS agent_task_progress (
        task_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        phase TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        percent INTEGER,
        created_at TEXT NOT NULL,
        PRIMARY KEY(task_id, sequence),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )"""
    )
    conn.commit()
