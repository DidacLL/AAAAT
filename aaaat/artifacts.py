from __future__ import annotations

import sqlite3
from typing import Any

from .db import new_id, row_to_dict, utc_now

ARTIFACT_REVIEW_STATES = {"draft", "reviewed", "submitted", "archived"}


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
    review_state: str = "draft",
    notes: str = "",
) -> dict[str, Any]:
    if review_state not in ARTIFACT_REVIEW_STATES:
        raise ValueError(f"Invalid artifact review state: {review_state}")
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
        "review_state": review_state,
        "notes": notes,
    }
    conn.execute(
        """INSERT INTO generated_artifacts(
          id, application_id, artifact_type, path, label, created_at, source_context,
          agent_name, agent_runtime, model_provider, review_state, notes
        ) VALUES (
          :id, :application_id, :artifact_type, :path, :label, :created_at, :source_context,
          :agent_name, :agent_runtime, :model_provider, :review_state, :notes
        )""",
        item,
    )
    conn.commit()
    return item


def list_artifacts(conn: sqlite3.Connection, application_id: str | None = None) -> list[dict[str, Any]]:
    if application_id:
        rows = conn.execute(
            """SELECT * FROM generated_artifacts WHERE application_id = ?
            ORDER BY CASE review_state
              WHEN 'submitted' THEN 0
              WHEN 'reviewed' THEN 1
              WHEN 'draft' THEN 2
              WHEN 'archived' THEN 3
              ELSE 2
            END,
            CASE WHEN review_state = 'archived' THEN created_at END ASC,
            CASE WHEN review_state != 'archived' THEN created_at END DESC,
            rowid ASC""",
            (application_id,),
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT * FROM generated_artifacts
            ORDER BY CASE review_state
              WHEN 'submitted' THEN 0
              WHEN 'reviewed' THEN 1
              WHEN 'draft' THEN 2
              WHEN 'archived' THEN 3
              ELSE 2
            END,
            CASE WHEN review_state = 'archived' THEN created_at END ASC,
            CASE WHEN review_state != 'archived' THEN created_at END DESC,
            rowid ASC"""
        ).fetchall()
    return [row_to_dict(row) for row in rows]


def update_artifact_state(
    conn: sqlite3.Connection,
    artifact_id: str,
    review_state: str,
    notes: str | None = None,
) -> dict[str, Any]:
    if review_state not in ARTIFACT_REVIEW_STATES:
        raise ValueError(f"Invalid artifact review state: {review_state}")
    if notes is None:
        conn.execute("UPDATE generated_artifacts SET review_state = ? WHERE id = ?", (review_state, artifact_id))
    else:
        conn.execute("UPDATE generated_artifacts SET review_state = ?, notes = ? WHERE id = ?", (review_state, notes, artifact_id))
    conn.commit()
    row = conn.execute("SELECT * FROM generated_artifacts WHERE id = ?", (artifact_id,)).fetchone()
    if row is None:
        raise KeyError(f"Artifact not found: {artifact_id}")
    return row_to_dict(row)
