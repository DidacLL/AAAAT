from __future__ import annotations

import sqlite3
from typing import Any

from .agent_access import (
    build_agent_work_item,
    get_task_for_capability,
    task_capability,
)
from .db import row_to_dict, utc_now
from .tasks import get_task

_PROGRESS_PHASES = {
    "accepted",
    "planning",
    "working",
    "waiting",
    "blocked",
    "finalizing",
}
_CLAIM_STATES = {"claimed", "in_progress"}


def _ordered_ready_task_sql(*, candidature_only: bool = False) -> str:
    where = "WHERE state = 'queued'"
    if candidature_only:
        where += " AND application_id = ?"
    return f"""SELECT * FROM tasks
    {where}
    ORDER BY
      CASE WHEN created_by = 'desktop_action' THEN 0 ELSE 1 END,
      CASE WHEN created_by = 'desktop_action' THEN created_at END DESC,
      CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
      created_at,
      id"""


def _begin_write(conn: sqlite3.Connection, name: str) -> bool:
    """Begin an owned write transaction or isolate work in a savepoint."""
    if conn.in_transaction:
        conn.execute(f"SAVEPOINT {name}")
        return False
    conn.execute("BEGIN IMMEDIATE")
    return True


def _commit_write(conn: sqlite3.Connection, name: str, owns: bool) -> None:
    if owns:
        conn.commit()
    else:
        conn.execute(f"RELEASE SAVEPOINT {name}")


def _rollback_write(conn: sqlite3.Connection, name: str, owns: bool) -> None:
    if owns:
        conn.rollback()
    else:
        conn.execute(f"ROLLBACK TO SAVEPOINT {name}")
        conn.execute(f"RELEASE SAVEPOINT {name}")


def claim_agent_work(
    conn: sqlite3.Connection,
    task_id: str,
    *,
    target_state: str = "claimed",
    notes: str = "",
) -> dict[str, Any]:
    """Atomically claim one known queued task.

    The compare-and-set is safe both as a standalone operation and inside a
    larger caller-owned transaction.
    """
    if target_state not in _CLAIM_STATES:
        raise ValueError(f"Unsupported claim state: {target_state}")
    transaction = "claim_agent_work"
    owns = _begin_write(conn, transaction)
    try:
        changed = conn.execute(
            """UPDATE tasks
            SET state = ?, notes = ?, updated_at = ?
            WHERE id = ? AND state = 'queued'""",
            (
                target_state,
                str(notes or "")[:4000],
                utc_now(),
                str(task_id),
            ),
        ).rowcount
        if changed != 1:
            row = conn.execute(
                "SELECT state FROM tasks WHERE id = ?",
                (str(task_id),),
            ).fetchone()
            current = str(row["state"]) if row is not None else "missing"
            raise ValueError(
                f"Task is not ready to claim from state {current}"
            )
        _commit_write(conn, transaction, owns)
    except Exception:
        _rollback_write(conn, transaction, owns)
        raise
    return get_task(conn, str(task_id))


def claim_next_agent_work(conn: sqlite3.Connection) -> dict[str, Any] | None:
    """Atomically select and claim the next ready task, then build bounded work."""
    transaction = "claim_next_agent_work"
    owns = _begin_write(conn, transaction)
    try:
        row = conn.execute(
            _ordered_ready_task_sql() + "\nLIMIT 1"
        ).fetchone()
        if row is None:
            _rollback_write(conn, transaction, owns)
            return None
        task = row_to_dict(row)
        changed = conn.execute(
            """UPDATE tasks
            SET state = 'claimed', notes = '', updated_at = ?
            WHERE id = ? AND state = 'queued'""",
            (utc_now(), task["id"]),
        ).rowcount
        if changed != 1:
            _rollback_write(conn, transaction, owns)
            return None
        _commit_write(conn, transaction, owns)
    except Exception:
        _rollback_write(conn, transaction, owns)
        raise
    return build_agent_work_item(conn, get_task(conn, str(task["id"])))


def claim_candidature_work(
    conn: sqlite3.Connection,
    candidature_ref: str,
    *,
    notes: str = "",
) -> list[dict[str, Any]]:
    """Atomically claim all currently queued work for one candidature."""
    transaction = "claim_candidature_work"
    owns = _begin_write(conn, transaction)
    try:
        rows = conn.execute(
            _ordered_ready_task_sql(candidature_only=True),
            (str(candidature_ref),),
        ).fetchall()
        task_ids = [str(row["id"]) for row in rows]
        now = utc_now()
        for task_id in task_ids:
            changed = conn.execute(
                """UPDATE tasks
                SET state = 'claimed', notes = ?, updated_at = ?
                WHERE id = ? AND state = 'queued'""",
                (str(notes or "")[:4000], now, task_id),
            ).rowcount
            if changed != 1:
                raise RuntimeError(
                    "Queued work changed while portable acquisition held the "
                    "write lock"
                )
        _commit_write(conn, transaction, owns)
    except Exception:
        _rollback_write(conn, transaction, owns)
        raise
    return [get_task(conn, task_id) for task_id in task_ids]


def release_claimed_work(
    conn: sqlite3.Connection,
    task_ids: list[str],
    *,
    notes: str,
) -> None:
    """Return only still-claimed tasks to the queue after dispatch failure."""
    if not task_ids:
        return
    transaction = "release_claimed_work"
    owns = _begin_write(conn, transaction)
    try:
        now = utc_now()
        conn.executemany(
            """UPDATE tasks
            SET state = 'queued', notes = ?, updated_at = ?
            WHERE id = ? AND state = 'claimed'""",
            [
                (str(notes or "")[:4000], now, str(task_id))
                for task_id in task_ids
            ],
        )
        _commit_write(conn, transaction, owns)
    except Exception:
        _rollback_write(conn, transaction, owns)
        raise


def report_agent_task_progress(
    conn: sqlite3.Connection,
    capability: str,
    *,
    phase: str,
    message: str = "",
    percent: int | None = None,
) -> dict[str, Any]:
    """Persist one ordered progress event under the task write lock."""
    normalized_phase = str(phase or "").strip().lower()
    if normalized_phase not in _PROGRESS_PHASES:
        raise ValueError(
            f"Unsupported progress phase: {normalized_phase}"
        )
    normalized_message = str(message or "").strip()[:2000]
    normalized_percent = (
        None if percent is None else max(0, min(99, int(percent)))
    )

    transaction = "report_agent_task_progress"
    owns = _begin_write(conn, transaction)
    try:
        task = get_task_for_capability(conn, capability)
        state = str(task.get("state") or "")
        if state not in _CLAIM_STATES:
            raise ValueError(
                f"Task is not accepting progress in state {state}"
            )
        sequence = int(
            conn.execute(
                """SELECT COALESCE(MAX(sequence), 0) + 1
                FROM agent_task_progress WHERE task_id = ?""",
                (task["id"],),
            ).fetchone()[0]
        )
        conn.execute(
            """INSERT INTO agent_task_progress(
                task_id, sequence, phase, message, percent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)""",
            (
                task["id"],
                sequence,
                normalized_phase,
                normalized_message,
                normalized_percent,
                utc_now(),
            ),
        )
        if state == "claimed":
            conn.execute(
                """UPDATE tasks SET state = 'in_progress', updated_at = ?
                WHERE id = ? AND state = 'claimed'""",
                (utc_now(), task["id"]),
            )
        _commit_write(conn, transaction, owns)
    except Exception:
        _rollback_write(conn, transaction, owns)
        raise

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


def latest_agent_task_progress(
    conn: sqlite3.Connection,
    capability: str,
) -> dict[str, Any] | None:
    task = get_task_for_capability(conn, capability)
    row = conn.execute(
        """SELECT sequence, phase, message, percent, created_at
        FROM agent_task_progress
        WHERE task_id = ?
        ORDER BY sequence DESC
        LIMIT 1""",
        (task["id"],),
    ).fetchone()
    return row_to_dict(row) if row else None
