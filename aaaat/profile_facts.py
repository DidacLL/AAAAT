from __future__ import annotations

import json
import sqlite3
from typing import Any

from .db import new_id, row_to_dict, utc_now


FACT_TYPES = {
    "target_role",
    "skill",
    "experience",
    "project",
    "education",
    "certification",
    "language",
    "achievement",
    "preference",
    "constraint",
    "salary_expectation",
    "cv_summary",
    "role_positioning_note",
}
VISIBILITIES = {"public", "professional", "private", "sensitive"}
EXPOSURES = {"raw", "anonymized", "summarized", "placeholder", "redacted", "denied"}
REVIEW_STATES = {"active", "archived"}
PURPOSE_FLAGS = {
    "cv_generation": "use_for_cv",
    "cover_letter": "use_for_cover_letter",
    "candidature_fit": "use_for_agent_context",
    "market_research": "use_for_market_research",
    "recruiter_call": "use_for_agent_context",
    "form_answers": "use_for_agent_context",
}
LOCAL_SCOPES = {"local_render", "local_dashboard", "dashboard", "read_only_dashboard"}
BOOL_FIELDS = {
    "use_for_cv",
    "use_for_cover_letter",
    "use_for_agent_context",
    "use_for_market_research",
    "use_for_dashboard",
}


def create_profile_fact(conn: sqlite3.Connection, **fields: Any) -> dict[str, Any]:
    now = utc_now()
    item = {
        "id": fields.get("id") or new_id("fact"),
        "fact_type": fields.get("fact_type") or fields.get("type") or "experience",
        "title": fields.get("title", ""),
        "body": fields.get("body", ""),
        "tags": encode_tags(fields.get("tags", [])),
        "visibility": fields.get("visibility", "private"),
        "exposure": fields.get("exposure", "summarized"),
        "use_for_cv": bool_int(fields.get("use_for_cv", False)),
        "use_for_cover_letter": bool_int(fields.get("use_for_cover_letter", False)),
        "use_for_agent_context": bool_int(fields.get("use_for_agent_context", False)),
        "use_for_market_research": bool_int(fields.get("use_for_market_research", False)),
        "use_for_dashboard": bool_int(fields.get("use_for_dashboard", True)),
        "source": fields.get("source", "user"),
        "review_state": fields.get("review_state", "active"),
        "created_at": now,
        "updated_at": now,
        "notes": fields.get("notes", ""),
    }
    validate_fact(item)
    conn.execute(
        """INSERT INTO profile_facts(
          id, fact_type, title, body, tags, visibility, exposure, use_for_cv,
          use_for_cover_letter, use_for_agent_context, use_for_market_research,
          use_for_dashboard, source, review_state, created_at, updated_at, notes
        ) VALUES (
          :id, :fact_type, :title, :body, :tags, :visibility, :exposure, :use_for_cv,
          :use_for_cover_letter, :use_for_agent_context, :use_for_market_research,
          :use_for_dashboard, :source, :review_state, :created_at, :updated_at, :notes
        )""",
        item,
    )
    conn.commit()
    return decode_fact(item)


def list_profile_facts(
    conn: sqlite3.Connection,
    fact_type: str | None = None,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    clauses = []
    params: list[str] = []
    if fact_type:
        clauses.append("fact_type = ?")
        params.append(fact_type)
    if not include_archived:
        clauses.append("review_state != 'archived'")
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    rows = conn.execute(
        f"""SELECT * FROM profile_facts{where}
        ORDER BY fact_type, title, updated_at DESC""",
        params,
    ).fetchall()
    return [decode_fact(row_to_dict(row)) for row in rows]


def get_profile_fact(conn: sqlite3.Connection, fact_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM profile_facts WHERE id = ?", (fact_id,)).fetchone()
    if row is None:
        raise KeyError(f"Profile fact not found: {fact_id}")
    return decode_fact(row_to_dict(row))


def update_profile_fact(conn: sqlite3.Connection, fact_id: str, **fields: Any) -> dict[str, Any]:
    allowed = {
        "fact_type",
        "title",
        "body",
        "tags",
        "visibility",
        "exposure",
        "use_for_cv",
        "use_for_cover_letter",
        "use_for_agent_context",
        "use_for_market_research",
        "use_for_dashboard",
        "source",
        "review_state",
        "notes",
    }
    updates = {key: fields[key] for key in allowed if key in fields}
    if "type" in fields:
        updates["fact_type"] = fields["type"]
    for key in BOOL_FIELDS & updates.keys():
        updates[key] = bool_int(updates[key])
    if "tags" in updates:
        updates["tags"] = encode_tags(updates["tags"])
    if updates:
        current = get_profile_fact(conn, fact_id)
        candidate = {**current, **updates}
        candidate["tags"] = encode_tags(candidate.get("tags", []))
        validate_fact(candidate)
        updates["updated_at"] = utc_now()
        updates["id"] = fact_id
        assignments = ", ".join(f"{key} = :{key}" for key in updates if key != "id")
        conn.execute(f"UPDATE profile_facts SET {assignments} WHERE id = :id", updates)
        conn.commit()
    return get_profile_fact(conn, fact_id)


def archive_profile_fact(conn: sqlite3.Connection, fact_id: str) -> dict[str, Any]:
    return update_profile_fact(conn, fact_id, review_state="archived")


def profile_context(conn: sqlite3.Connection, purpose: str, scope: str = "agent") -> dict[str, Any]:
    if purpose not in PURPOSE_FLAGS:
        raise ValueError(f"Unsupported profile context purpose: {purpose}")
    flag = PURPOSE_FLAGS[purpose]
    rows = list_profile_facts(conn)
    facts = []
    for item in rows:
        if not item.get(flag):
            continue
        if purpose == "market_research" and item.get("visibility") == "sensitive":
            continue
        resolved = resolve_fact_body(item, purpose, scope)
        if resolved is None:
            facts.append(public_fact_metadata(item, denied=True))
            continue
        fact = public_fact_metadata(item)
        fact["body"] = resolved
        facts.append(fact)
    return {"purpose": purpose, "scope": scope, "facts": facts}


def resolve_fact_body(item: dict[str, Any], purpose: str, scope: str) -> str | None:
    if scope in LOCAL_SCOPES:
        return str(item.get("body") or "")
    if scope == "static_demo":
        return None
    exposure = item.get("exposure", "summarized")
    if purpose == "market_research" and exposure == "raw":
        exposure = "anonymized"
    if exposure == "raw":
        return str(item.get("body") or "")
    if exposure == "anonymized":
        return anonymized_body(item)
    if exposure == "summarized":
        return summarized_body(item)
    if exposure == "placeholder":
        return "{{ profile_fact." + str(item.get("id", "")) + " }}"
    if exposure == "redacted":
        return "[redacted]"
    if exposure == "denied":
        return None
    raise ValueError(f"Invalid profile fact exposure: {exposure}")


def public_fact_metadata(item: dict[str, Any], denied: bool = False) -> dict[str, Any]:
    return {
        "id": item["id"],
        "fact_type": item["fact_type"],
        "title": item["title"],
        "tags": item.get("tags", []),
        "visibility": item["visibility"],
        "exposure": "denied" if denied else item["exposure"],
        "source": item["source"],
        "review_state": item["review_state"],
        "usage": {
            "cv": bool(item.get("use_for_cv")),
            "cover_letter": bool(item.get("use_for_cover_letter")),
            "agent_context": bool(item.get("use_for_agent_context")),
            "market_research": bool(item.get("use_for_market_research")),
            "dashboard": bool(item.get("use_for_dashboard")),
        },
    }


def summarized_body(item: dict[str, Any]) -> str:
    fact_type = str(item.get("fact_type") or "profile fact").replace("_", " ")
    title = str(item.get("title") or fact_type).strip()
    tags = ", ".join(item.get("tags") or [])
    suffix = f" Tags: {tags}." if tags else ""
    return f"{fact_type}: {title}.{suffix}"


def anonymized_body(item: dict[str, Any]) -> str:
    title = str(item.get("title") or item.get("fact_type") or "profile fact").strip()
    tags = ", ".join(item.get("tags") or [])
    suffix = f" Tags: {tags}." if tags else ""
    return f"{item.get('fact_type', 'profile fact')}: {title}.{suffix}"


def validate_fact(item: dict[str, Any]) -> None:
    if item["fact_type"] not in FACT_TYPES:
        raise ValueError(f"Invalid profile fact type: {item['fact_type']}")
    if item["visibility"] not in VISIBILITIES:
        raise ValueError(f"Invalid profile fact visibility: {item['visibility']}")
    if item["exposure"] not in EXPOSURES:
        raise ValueError(f"Invalid profile fact exposure: {item['exposure']}")
    if item["review_state"] not in REVIEW_STATES:
        raise ValueError(f"Invalid profile fact review state: {item['review_state']}")


def encode_tags(value: Any) -> str:
    if isinstance(value, str):
        if value.strip().startswith("["):
            parsed = json.loads(value)
            return json.dumps([str(tag).strip() for tag in parsed if str(tag).strip()])
        return json.dumps([tag.strip() for tag in value.split(",") if tag.strip()])
    return json.dumps([str(tag).strip() for tag in (value or []) if str(tag).strip()])


def decode_fact(item: dict[str, Any]) -> dict[str, Any]:
    decoded = dict(item)
    decoded["tags"] = json.loads(decoded.get("tags") or "[]")
    for key in BOOL_FIELDS:
        decoded[key] = bool(decoded.get(key))
    return decoded


def bool_int(value: Any) -> int:
    if isinstance(value, str):
        return 1 if value.lower() in {"1", "true", "yes", "on"} else 0
    return 1 if value else 0
