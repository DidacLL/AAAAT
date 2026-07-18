from __future__ import annotations

import json
import sqlite3
from typing import Any

from .assisted_profile import apply_profile_completion_result
from .tasks import update_task
from .text_blobs import get_text_blob

_LEGACY_FAILURE_MARKER = "Result kept as history:"
_RECOVERY_MARKER = "Legacy profile result recovered automatically."


def recover_legacy_profile_completion(conn: sqlite3.Connection) -> dict[str, Any]:
    """Repair profile work consumed by the pre-validation-order V1 bridge bug."""
    rows = conn.execute(
        """SELECT id, result_blob_id, notes, agent_name, agent_runtime
        FROM tasks
        WHERE task_type = 'profile_completion'
          AND state = 'completed'
          AND notes LIKE ?
          AND notes NOT LIKE ?
        ORDER BY completed_at, updated_at, id""",
        (f"%{_LEGACY_FAILURE_MARKER}%", f"%{_RECOVERY_MARKER}%"),
    ).fetchall()
    if not rows:
        return {"status": "none", "recovered": 0}

    recovered = 0
    failed = 0
    for row in rows:
        task_id = str(row["id"])
        notes = str(row["notes"] or "")
        try:
            blob_id = str(row["result_blob_id"] or "")
            if not blob_id:
                raise ValueError("legacy profile result has no stored body")
            body = str(get_text_blob(conn, blob_id).get("body") or "")
            payload = json.loads(body)
            if not isinstance(payload, dict):
                raise ValueError("legacy profile result is not an object")
            variables = payload.get("variables", payload.get("fields"))
            if not isinstance(variables, dict):
                raise ValueError("legacy profile result has no variables object")

            normalized: dict[str, str] = {}
            for raw_key, value in variables.items():
                if value is None:
                    continue
                key = str(raw_key).strip()
                if isinstance(value, str):
                    normalized[key] = value
                elif isinstance(value, list) and all(isinstance(item, str) for item in value):
                    normalized[key] = "; ".join(item.strip() for item in value if item.strip())
                else:
                    normalized[key] = json.dumps(value, ensure_ascii=False, sort_keys=True)

            acknowledgement = apply_profile_completion_result(
                conn,
                json.dumps({"variables": normalized}, ensure_ascii=False),
                agent_name=str(row["agent_name"] or ""),
                agent_runtime=str(row["agent_runtime"] or ""),
            )
            updated = len(acknowledgement.get("updated") or [])
            retained = len(acknowledgement.get("retained") or [])
            suffix = f"{_RECOVERY_MARKER} Updated {updated}; retained {retained}."
            update_task(conn, task_id, notes=(notes + "\n" + suffix).strip())
            recovered += 1
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            suffix = f"Automatic legacy recovery could not apply this result: {exc}"
            update_task(conn, task_id, state="failed", notes=(notes + "\n" + suffix).strip())
            failed += 1

    return {
        "status": "recovered" if recovered else "failed",
        "recovered": recovered,
        "failed": failed,
    }
