from __future__ import annotations

import sqlite3
from typing import Any

from .db import new_id, row_to_dict, utc_now

ARTIFACT_STATES = {"draft", "submitted", "archived"}
ARTIFACT_LIFECYCLE_EVENTS = {"create", "replace", "attach", "send", "state"}


def log_artifact_event(
    conn: sqlite3.Connection,
    artifact_id: str,
    event_type: str,
    *,
    actor: str = "system",
    notes: str = "",
) -> dict[str, Any]:
    if event_type not in ARTIFACT_LIFECYCLE_EVENTS:
        raise ValueError(f"Invalid artifact lifecycle event: {event_type}")
    item = {
        "id": new_id("artifact_event"),
        "artifact_id": artifact_id,
        "event_type": event_type,
        "created_at": utc_now(),
        "actor": actor or "system",
        "notes": notes or "",
    }
    conn.execute(
        """INSERT INTO artifact_events(id, artifact_id, event_type, created_at, actor, notes)
        VALUES (:id, :artifact_id, :event_type, :created_at, :actor, :notes)""",
        item,
    )
    return item


def save_artifact(
    conn: sqlite3.Connection,
    application_id: str | None,
    artifact_type: str,
    path: str,
    label: str,
    source_context: str = "",
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
    state: str = "draft",
    notes: str = "",
    lifecycle_event: str = "create",
) -> dict[str, Any]:
    if state not in ARTIFACT_STATES:
        raise ValueError(f"Invalid artifact state: {state}")
    if lifecycle_event not in ARTIFACT_LIFECYCLE_EVENTS:
        raise ValueError(f"Invalid artifact lifecycle event: {lifecycle_event}")
    item = {
        "id": new_id("artifact"),
        "application_id": application_id,
        "artifact_type": artifact_type,
        "path": path,
        "label": label,
        "created_at": utc_now(),
        "source_context": source_context,
        "agent_name": agent_name,
        "agent_runtime": agent_runtime,
        "model_provider": model_provider,
        "state": state,
        "notes": notes,
    }
    conn.execute(
        """INSERT INTO generated_artifacts(
          id, application_id, artifact_type, path, label, created_at, source_context,
          agent_name, agent_runtime, model_provider, state, notes
        ) VALUES (
          :id, :application_id, :artifact_type, :path, :label, :created_at, :source_context,
          :agent_name, :agent_runtime, :model_provider, :state, :notes
        )""",
        item,
    )
    log_artifact_event(conn, item["id"], lifecycle_event, actor=agent_name or agent_runtime or "user", notes=notes)
    conn.commit()
    return item


def get_artifact(conn: sqlite3.Connection, artifact_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM generated_artifacts WHERE id = ?", (artifact_id,)).fetchone()
    if row is None:
        raise KeyError(f"Artifact not found: {artifact_id}")
    return row_to_dict(row)


def list_artifact_events(conn: sqlite3.Connection, artifact_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM artifact_events WHERE artifact_id = ? ORDER BY created_at, rowid",
        (artifact_id,),
    ).fetchall()
    return [row_to_dict(row) for row in rows]


def find_current_draft_artifact(
    conn: sqlite3.Connection,
    application_id: str | None,
    artifact_type: str,
    source_context: str,
) -> dict[str, Any] | None:
    if application_id is None:
        row = conn.execute(
            """SELECT * FROM generated_artifacts
            WHERE application_id IS NULL AND artifact_type = ? AND source_context = ?
              AND state = 'draft'
            ORDER BY created_at DESC, rowid DESC LIMIT 1""",
            (artifact_type, source_context),
        ).fetchone()
    else:
        row = conn.execute(
            """SELECT * FROM generated_artifacts
            WHERE application_id = ? AND artifact_type = ? AND source_context = ?
              AND state = 'draft'
            ORDER BY created_at DESC, rowid DESC LIMIT 1""",
            (application_id, artifact_type, source_context),
        ).fetchone()
    return row_to_dict(row) if row else None


def save_or_update_draft_artifact(
    conn: sqlite3.Connection,
    application_id: str | None,
    artifact_type: str,
    path: str,
    label: str,
    *,
    source_context: str,
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
    notes: str = "",
    save_version: bool = False,
) -> dict[str, Any]:
    if save_version:
        return save_artifact(
            conn,
            application_id,
            artifact_type,
            path,
            label,
            source_context=source_context,
            agent_name=agent_name,
            agent_runtime=agent_runtime,
            model_provider=model_provider,
            state="draft",
            notes=notes,
            lifecycle_event="create",
        )
    existing = find_current_draft_artifact(conn, application_id, artifact_type, source_context)
    if existing is None:
        return save_artifact(
            conn,
            application_id,
            artifact_type,
            path,
            label,
            source_context=source_context,
            agent_name=agent_name,
            agent_runtime=agent_runtime,
            model_provider=model_provider,
            state="draft",
            notes=notes,
            lifecycle_event="create",
        )
    conn.execute(
        """UPDATE generated_artifacts SET
          path = ?, label = ?, agent_name = ?, agent_runtime = ?,
          model_provider = ?, notes = ?
        WHERE id = ?""",
        (path, label, agent_name, agent_runtime, model_provider, notes, existing["id"]),
    )
    log_artifact_event(conn, existing["id"], "replace", actor=agent_name or agent_runtime or "user", notes=notes)
    conn.commit()
    return get_artifact(conn, existing["id"])


def list_artifacts(conn: sqlite3.Connection, application_id: str | None = None) -> list[dict[str, Any]]:
    if application_id:
        rows = conn.execute(
            """SELECT * FROM generated_artifacts WHERE application_id = ?
            ORDER BY CASE state
              WHEN 'submitted' THEN 0
              WHEN 'draft' THEN 1
              WHEN 'archived' THEN 2
              ELSE 2
            END,
            CASE WHEN state = 'archived' THEN created_at END ASC,
            CASE WHEN state != 'archived' THEN created_at END DESC,
            rowid ASC""",
            (application_id,),
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT * FROM generated_artifacts
            ORDER BY CASE state
              WHEN 'submitted' THEN 0
              WHEN 'draft' THEN 1
              WHEN 'archived' THEN 2
              ELSE 2
            END,
            CASE WHEN state = 'archived' THEN created_at END ASC,
            CASE WHEN state != 'archived' THEN created_at END DESC,
            rowid ASC"""
        ).fetchall()
    return [row_to_dict(row) for row in rows]


def update_artifact_state(
    conn: sqlite3.Connection,
    artifact_id: str,
    state: str,
    notes: str | None = None,
) -> dict[str, Any]:
    if state not in ARTIFACT_STATES:
        raise ValueError(f"Invalid artifact state: {state}")
    if notes is None:
        conn.execute("UPDATE generated_artifacts SET state = ? WHERE id = ?", (state, artifact_id))
    else:
        conn.execute("UPDATE generated_artifacts SET state = ?, notes = ? WHERE id = ?", (state, notes, artifact_id))
    log_artifact_event(conn, artifact_id, "send" if state == "submitted" else "state", actor="user", notes=notes or f"State changed to {state}.")
    conn.commit()
    return get_artifact(conn, artifact_id)
