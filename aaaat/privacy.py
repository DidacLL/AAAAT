from __future__ import annotations

import sqlite3
from typing import Any

from .db import row_to_dict, utc_now


EXPOSURES = {"raw", "redacted", "summarized", "placeholder", "denied"}
RESOLUTION_SCOPES = {"local", "agent"}
CANONICAL_NAMESPACES = {"profile", "application", "artifact", "candidature"}


def canonical_variable_key(key: str, default_namespace: str = "profile") -> str:
    cleaned = key.strip()
    if cleaned.startswith("{{") and cleaned.endswith("}}"):
        cleaned = cleaned[2:-2].strip()
    if not cleaned:
        raise ValueError("Variable key is required")
    if "." in cleaned and cleaned.split(".", 1)[0] in CANONICAL_NAMESPACES:
        return cleaned
    return f"{default_namespace}.{cleaned}"


def short_profile_key(key: str) -> str:
    return key.removeprefix("profile.")


def placeholder_for(key: str) -> str:
    return "{{ " + canonical_variable_key(key) + " }}"


def set_variable(
    conn: sqlite3.Connection,
    key: str,
    value: str = "",
    *,
    placeholder: str | None = None,
    is_sensitive: bool = True,
    exposure: str = "placeholder",
    summary: str = "",
) -> dict[str, Any]:
    canonical = canonical_variable_key(key)
    if exposure not in EXPOSURES:
        raise ValueError(f"Invalid variable exposure: {exposure}")
    now = utc_now()
    conn.execute(
        """INSERT INTO variables(
          key, placeholder, value, is_sensitive, exposure, summary, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          placeholder=excluded.placeholder,
          value=excluded.value,
          is_sensitive=excluded.is_sensitive,
          exposure=excluded.exposure,
          summary=excluded.summary,
          updated_at=excluded.updated_at""",
        (canonical, placeholder or placeholder_for(canonical), value, 1 if is_sensitive else 0, exposure, summary, now),
    )
    conn.commit()
    return get_variable(conn, canonical)


def get_variable(conn: sqlite3.Connection, key: str) -> dict[str, Any]:
    canonical = canonical_variable_key(key)
    row = conn.execute("SELECT * FROM variables WHERE key = ?", (canonical,)).fetchone()
    if row is None:
        raise KeyError(f"Variable not found: {canonical}")
    return row_to_dict(row)


def list_variables(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM variables ORDER BY key").fetchall()
    return [row_to_dict(row) for row in rows]


def resolve_variable_value(item: dict[str, Any], scope: str) -> str | None:
    if scope not in RESOLUTION_SCOPES:
        raise ValueError(f"Invalid variable resolution scope: {scope}")
    if scope == "local":
        return str(item.get("value") or "")
    exposure = item.get("exposure") or "placeholder"
    if exposure == "raw":
        return str(item.get("value") or "")
    if exposure == "redacted":
        return "[redacted]"
    if exposure == "summarized":
        return str(item.get("summary") or item.get("placeholder") or "")
    if exposure == "placeholder":
        return str(item.get("placeholder") or "")
    if exposure == "denied":
        return None
    raise ValueError(f"Invalid variable exposure: {exposure}")


def resolve_variables(conn: sqlite3.Connection, scope: str) -> dict[str, str]:
    resolved: dict[str, str] = {}
    for item in list_variables(conn):
        value = resolve_variable_value(item, scope)
        if value is None:
            continue
        key = item["key"]
        resolved[key] = value
        if key.startswith("profile."):
            resolved[short_profile_key(key)] = value
    return resolved


def required_profile_variables(conn: sqlite3.Connection, required: set[str]) -> list[str]:
    existing = resolve_variables(conn, "local")
    missing = []
    for key in sorted(required):
        canonical = canonical_variable_key(key)
        if not existing.get(canonical) and not existing.get(short_profile_key(canonical)):
            missing.append(canonical)
    return missing
