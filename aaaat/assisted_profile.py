from __future__ import annotations

import sqlite3
from typing import Any

from .db import set_profile_variable

DENIED_PROFILE_KEYS = {"profile.internal_id", "profile.storage_path"}


def submit_profile_updates(
    conn: sqlite3.Connection,
    variables: dict[str, Any],
    *,
    agent_name: str = "",
    agent_runtime: str = "",
) -> dict[str, Any]:
    """Apply a bounded assisted-profile result without exposing record IDs."""
    if not isinstance(variables, dict) or len(variables) > 64:
        raise ValueError("Profile updates must be an object with at most 64 values")
    updated: list[str] = []
    for raw_key, value in variables.items():
        key = str(raw_key).strip()
        if not key.startswith("profile.") or key in DENIED_PROFILE_KEYS:
            raise ValueError(f"Profile variable is not permitted: {key}")
        if not isinstance(value, str) or len(value) > 20000:
            raise ValueError(f"Profile variable must be bounded text: {key}")
        set_profile_variable(conn, key, value.strip())
        updated.append(key)
    return {
        "status": "accepted",
        "action": "update_profile",
        "updated": sorted(updated),
        "provenance": {"agent_name": agent_name, "agent_runtime": agent_runtime},
        "next": ["open_desktop"],
    }
