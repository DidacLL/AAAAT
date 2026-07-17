from __future__ import annotations

import json
import re
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
STATES = {"active", "archived"}
CONTEXT_SCOPES = {"agent", "local"}
PURPOSE_FLAGS = {
    "cv_generation": "use_for_cv",
    "cover_letter": "use_for_cover_letter",
    "candidature_fit": "use_for_agent_context",
    "market_research": "use_for_market_research",
    "recruiter_call": "use_for_agent_context",
    "form_answers": "use_for_agent_context",
    "career_plan_review": "use_for_agent_context",
}
BOOL_FIELDS = {
    "use_for_cv",
    "use_for_cover_letter",
    "use_for_agent_context",
    "use_for_market_research",
    "use_for_desktop",
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
        "use_for_desktop": bool_int(fields.get("use_for_desktop", True)),
        "source": fields.get("source", "user"),
        "state": fields.get("state", "active"),
        "created_at": now,
        "updated_at": now,
        "notes": fields.get("notes", ""),
    }
    validate_fact(item)
    conn.execute(
        """INSERT INTO profile_facts(
          id, fact_type, title, body, tags, visibility, exposure, use_for_cv,
          use_for_cover_letter, use_for_agent_context, use_for_market_research,
          use_for_desktop, source, state, created_at, updated_at, notes
        ) VALUES (
          :id, :fact_type, :title, :body, :tags, :visibility, :exposure, :use_for_cv,
          :use_for_cover_letter, :use_for_agent_context, :use_for_market_research,
          :use_for_desktop, :source, :state, :created_at, :updated_at, :notes
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
        clauses.append("state != 'archived'")
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
        "use_for_desktop",
        "source",
        "state",
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
    return update_profile_fact(conn, fact_id, state="archived")


def profile_context(conn: sqlite3.Connection, purpose: str, scope: str = "agent") -> dict[str, Any]:
    if purpose not in PURPOSE_FLAGS:
        raise ValueError(f"Unsupported profile context purpose: {purpose}")
    if scope not in CONTEXT_SCOPES:
        raise ValueError(f"Unsupported profile context scope: {scope}")
    flag = PURPOSE_FLAGS[purpose]
    include_internal_id = scope == "local"
    rows = list_profile_facts(conn)
    facts = []
    for item in rows:
        if not item.get(flag):
            continue
        if purpose == "market_research" and item.get("visibility") == "sensitive":
            continue
        resolved = resolve_fact_body(item, purpose, scope)
        if resolved is None:
            facts.append(public_fact_metadata(item, denied=True, include_id=include_internal_id))
            continue
        fact = public_fact_metadata(item, include_id=include_internal_id)
        fact["body"] = resolved
        facts.append(fact)
    return {"purpose": purpose, "scope": scope, "facts": facts}


def resolve_fact_body(item: dict[str, Any], purpose: str, scope: str) -> str | None:
    if scope == "local":
        return str(item.get("body") or "")
    if scope != "agent":
        raise ValueError(f"Unsupported profile context scope: {scope}")
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
        return "{{ profile_fact." + profile_fact_reference(item) + " }}"
    if exposure == "redacted":
        return "[redacted]"
    if exposure == "denied":
        return None
    raise ValueError(f"Invalid profile fact exposure: {exposure}")


def public_fact_metadata(item: dict[str, Any], denied: bool = False, include_id: bool = True) -> dict[str, Any]:
    metadata = {
        "fact_ref": profile_fact_reference(item),
        "fact_type": item["fact_type"],
        "title": item["title"],
        "tags": item.get("tags", []),
        "visibility": item["visibility"],
        "exposure": "denied" if denied else item["exposure"],
        "source": item["source"],
        "state": item["state"],
        "usage": {
            "cv": bool(item.get("use_for_cv")),
            "cover_letter": bool(item.get("use_for_cover_letter")),
            "agent_context": bool(item.get("use_for_agent_context")),
            "market_research": bool(item.get("use_for_market_research")),
            "desktop": bool(item.get("use_for_desktop")),
        },
    }
    if include_id:
        metadata["id"] = item["id"]
    return metadata


def profile_fact_reference(item: dict[str, Any]) -> str:
    fact_type = slug(str(item.get("fact_type") or "fact")) or "fact"
    title = slug(str(item.get("title") or fact_type)) or fact_type
    return f"{fact_type}.{title}"


def slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    return cleaned.strip("_")


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
    if item["state"] not in STATES:
        raise ValueError(f"Invalid profile fact state: {item['state']}")


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
