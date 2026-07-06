from __future__ import annotations

import sqlite3
from typing import Any

from .db import new_id, row_to_dict, utc_now


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
            "SELECT * FROM generated_artifacts WHERE application_id = ? ORDER BY review_state = 'reviewed' DESC, created_at DESC",
            (application_id,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM generated_artifacts ORDER BY created_at DESC").fetchall()
    return [row_to_dict(row) for row in rows]
