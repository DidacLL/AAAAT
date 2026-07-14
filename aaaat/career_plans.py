from __future__ import annotations

import json
import re
import sqlite3
from typing import Any

from .db import new_id, row_to_dict, utc_now


REVIEW_STATES = {"active", "archived"}
CONTEXT_PURPOSES = {
    "cover_letter",
    "cv_generation",
    "candidature_fit",
    "market_research",
    "recruiter_call",
    "form_answers",
    "career_plan_review",
}
CONTEXT_SCOPES = {"agent", "local"}
LIST_FIELDS = {"objectives", "constraints", "target_markets", "target_roles"}
CAREER_PLAN_COLUMNS = {
    "target_markets": "TEXT NOT NULL DEFAULT '[]'",
    "target_roles": "TEXT NOT NULL DEFAULT '[]'",
    "source": "TEXT NOT NULL DEFAULT 'user'",
    "review_state": "TEXT NOT NULL DEFAULT 'active'",
}


def ensure_career_plan_columns(conn: sqlite3.Connection) -> None:
    existing = {str(row["name"]) for row in conn.execute("PRAGMA table_info(career_plans)").fetchall()}
    for name, ddl in CAREER_PLAN_COLUMNS.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE career_plans ADD COLUMN {name} {ddl}")
    conn.commit()


def create_career_plan(conn: sqlite3.Connection, **fields: Any) -> dict[str, Any]:
    ensure_career_plan_columns(conn)
    now = utc_now()
    item = {
        "id": fields.get("id") or new_id("career_plan"),
        "body": fields.get("body", ""),
        "objectives": encode_list(fields.get("objectives", [])),
        "constraints": encode_list(fields.get("constraints", [])),
        "target_markets": encode_list(fields.get("target_markets", [])),
        "target_roles": encode_list(fields.get("target_roles", [])),
        "source": fields.get("source", "user"),
        "review_state": fields.get("review_state", "active"),
        "created_at": now,
        "updated_at": now,
    }
    validate_career_plan(item)
    conn.execute(
        """INSERT INTO career_plans(
          id, body, objectives, constraints, target_markets, target_roles,
          source, review_state, created_at, updated_at
        ) VALUES (
          :id, :body, :objectives, :constraints, :target_markets, :target_roles,
          :source, :review_state, :created_at, :updated_at
        )""",
        item,
    )
    conn.commit()
    return decode_career_plan(item)


def list_career_plans(conn: sqlite3.Connection, include_archived: bool = False) -> list[dict[str, Any]]:
    ensure_career_plan_columns(conn)
    where = "" if include_archived else " WHERE review_state != 'archived'"
    rows = conn.execute(
        f"SELECT * FROM career_plans{where} ORDER BY updated_at DESC, created_at DESC"
    ).fetchall()
    return [decode_career_plan(row_to_dict(row)) for row in rows]


def get_career_plan(conn: sqlite3.Connection, plan_id: str) -> dict[str, Any]:
    ensure_career_plan_columns(conn)
    row = conn.execute("SELECT * FROM career_plans WHERE id = ?", (plan_id,)).fetchone()
    if row is None:
        raise KeyError(f"Career plan not found: {plan_id}")
    return decode_career_plan(row_to_dict(row))


def update_career_plan(conn: sqlite3.Connection, plan_id: str, **fields: Any) -> dict[str, Any]:
    ensure_career_plan_columns(conn)
    allowed = {"body", "objectives", "constraints", "target_markets", "target_roles", "source", "review_state"}
    updates = {key: fields[key] for key in allowed if key in fields}
    for key in LIST_FIELDS & updates.keys():
        updates[key] = encode_list(updates[key])
    if updates:
        current = get_career_plan(conn, plan_id)
        candidate = {**current, **updates}
        for key in LIST_FIELDS:
            candidate[key] = encode_list(candidate.get(key, []))
        validate_career_plan(candidate)
        updates["updated_at"] = utc_now()
        updates["id"] = plan_id
        assignments = ", ".join(f"{key} = :{key}" for key in updates if key != "id")
        conn.execute(f"UPDATE career_plans SET {assignments} WHERE id = :id", updates)
        conn.commit()
    return get_career_plan(conn, plan_id)


def archive_career_plan(conn: sqlite3.Connection, plan_id: str) -> dict[str, Any]:
    return update_career_plan(conn, plan_id, review_state="archived")


def career_plan_context(conn: sqlite3.Connection, purpose: str, scope: str = "agent") -> dict[str, Any]:
    if purpose not in CONTEXT_PURPOSES:
        raise ValueError(f"Unsupported career plan context purpose: {purpose}")
    if scope not in CONTEXT_SCOPES:
        raise ValueError(f"Unsupported career plan context scope: {scope}")
    include_internal_id = scope == "local"
    plans = [public_career_plan(item, include_id=include_internal_id) for item in list_career_plans(conn)]
    return {"purpose": purpose, "scope": scope, "career_plans": plans}


def public_career_plan(item: dict[str, Any], include_id: bool = False) -> dict[str, Any]:
    plan = {
        "plan_ref": career_plan_reference(item),
        "body": item.get("body", ""),
        "objectives": item.get("objectives", []),
        "constraints": item.get("constraints", []),
        "target_markets": item.get("target_markets", []),
        "target_roles": item.get("target_roles", []),
        "source": item.get("source", ""),
        "review_state": item.get("review_state", ""),
    }
    if include_id:
        plan["id"] = item["id"]
    return plan


def career_plan_reference(item: dict[str, Any]) -> str:
    roles = item.get("target_roles") or []
    markets = item.get("target_markets") or []
    seed = " ".join(str(value) for value in [*(roles[:1] if isinstance(roles, list) else []), *(markets[:1] if isinstance(markets, list) else [])])
    if not seed:
        seed = str(item.get("source") or "career plan")
    return slug(seed) or "career_plan"


def validate_career_plan(item: dict[str, Any]) -> None:
    if item["review_state"] not in REVIEW_STATES:
        raise ValueError(f"Invalid career plan review state: {item['review_state']}")


def encode_list(value: Any) -> str:
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("["):
            parsed = json.loads(stripped)
            return json.dumps([str(item).strip() for item in parsed if str(item).strip()])
        return json.dumps([item.strip() for item in value.split(",") if item.strip()])
    return json.dumps([str(item).strip() for item in (value or []) if str(item).strip()])


def decode_career_plan(item: dict[str, Any]) -> dict[str, Any]:
    decoded = dict(item)
    for key in LIST_FIELDS:
        decoded[key] = json.loads(decoded.get(key) or "[]")
    return decoded


def slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    return cleaned.strip("_")
