from __future__ import annotations

import sqlite3
from typing import Any

from .agent_access import build_agent_work_item
from .db import row_to_dict, utc_now
from .tasks import get_task


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


def _drop_task_capability(conn: sqlite3.Connection, task_id: str) -> None:
    conn.execute("DELETE FROM agent_task_capabilities WHERE task_id = ?", (str(task_id),))


def claim_agent_work(
    conn: sqlite3.Connection,
    task_id: str,
    *,
    notes: str = "",
) -> dict[str, Any]:
    """Atomically claim one known queued task and start a fresh callback scope."""

    transaction = "claim_agent_work"
    owns = _begin_write(conn, transaction)
    try:
        _drop_task_capability(conn, task_id)
        changed = conn.execute(
            """UPDATE tasks
            SET state = 'claimed', notes = ?, updated_at = ?
            WHERE id = ? AND state = 'queued'""",
            (str(notes or "")[:4000], utc_now(), str(task_id)),
        ).rowcount
        if changed != 1:
            row = conn.execute("SELECT state FROM tasks WHERE id = ?", (str(task_id),)).fetchone()
            current = str(row["state"]) if row is not None else "missing"
            raise ValueError(f"Task is not ready to claim from state {current}")
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
        row = conn.execute(_ordered_ready_task_sql() + "\nLIMIT 1").fetchone()
        if row is None:
            _rollback_write(conn, transaction, owns)
            return None
        task = row_to_dict(row)
        _drop_task_capability(conn, str(task["id"]))
        changed = conn.execute(
            """UPDATE tasks SET state = 'claimed', notes = '', updated_at = ?
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
            _drop_task_capability(conn, task_id)
            changed = conn.execute(
                """UPDATE tasks SET state = 'claimed', notes = ?, updated_at = ?
                WHERE id = ? AND state = 'queued'""",
                (str(notes or "")[:4000], now, task_id),
            ).rowcount
            if changed != 1:
                raise RuntimeError("Queued work changed while portable acquisition held the write lock")
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
    """Return still-claimed tasks to the queue and invalidate their callbacks."""

    if not task_ids:
        return
    transaction = "release_claimed_work"
    owns = _begin_write(conn, transaction)
    try:
        now = utc_now()
        for task_id in task_ids:
            _drop_task_capability(conn, task_id)
            conn.execute(
                """UPDATE tasks SET state = 'queued', notes = ?, updated_at = ?
                WHERE id = ? AND state = 'claimed'""",
                (str(notes or "")[:4000], now, str(task_id)),
            )
        _commit_write(conn, transaction, owns)
    except Exception:
        _rollback_write(conn, transaction, owns)
        raise
