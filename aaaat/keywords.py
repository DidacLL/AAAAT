from __future__ import annotations

import sqlite3
from typing import Any

from .db import new_id, row_to_dict, upsert_glossary_term, utc_now


def list_keywords(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM glossary_terms ORDER BY term").fetchall()
    items = [row_to_dict(row) for row in rows]
    for item in items:
        item["aliases"] = keyword_aliases(conn, item["term"])
        item["notes"] = keyword_notes(conn, item["term"])
    return items


def add_keyword_alias(conn: sqlite3.Connection, keyword: str, alias: str) -> dict[str, Any]:
    cleaned_keyword = keyword.strip()
    cleaned_alias = alias.strip()
    if not cleaned_keyword or not cleaned_alias:
        raise ValueError("Keyword and alias are required")
    created_at = utc_now()
    conn.execute("INSERT OR IGNORE INTO glossary_terms(term, definition, category) VALUES (?, '', '')", (cleaned_keyword,))
    conn.execute(
        "INSERT OR IGNORE INTO keyword_aliases(keyword, alias, created_at) VALUES (?, ?, ?)",
        (cleaned_keyword, cleaned_alias, created_at),
    )
    conn.commit()
    return {"keyword": cleaned_keyword, "alias": cleaned_alias, "created_at": created_at}


def keyword_aliases(conn: sqlite3.Connection, keyword: str) -> list[str]:
    rows = conn.execute(
        "SELECT alias FROM keyword_aliases WHERE keyword = ? ORDER BY alias",
        (keyword,),
    ).fetchall()
    return [row["alias"] for row in rows]


def create_keyword_note(
    conn: sqlite3.Connection,
    keyword: str,
    body: str,
    *,
    created_by: str = "user",
) -> dict[str, Any]:
    cleaned_keyword = keyword.strip()
    if not cleaned_keyword:
        raise ValueError("Keyword is required")
    conn.execute("INSERT OR IGNORE INTO glossary_terms(term, definition, category) VALUES (?, '', '')", (cleaned_keyword,))
    now = utc_now()
    item = {
        "id": new_id("keyword_note"),
        "keyword": cleaned_keyword,
        "body": body,
        "created_by": created_by or "user",
        "created_at": now,
        "updated_at": now,
    }
    conn.execute(
        """INSERT INTO keyword_notes(id, keyword, body, created_by, created_at, updated_at)
        VALUES (:id, :keyword, :body, :created_by, :created_at, :updated_at)""",
        item,
    )
    conn.commit()
    return item


def keyword_notes(conn: sqlite3.Connection, keyword: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM keyword_notes WHERE keyword = ? ORDER BY updated_at DESC",
        (keyword,),
    ).fetchall()
    return [row_to_dict(row) for row in rows]


def upsert_keyword(
    conn: sqlite3.Connection,
    term: str,
    definition: str,
    category: str = "",
) -> dict[str, Any]:
    item = upsert_glossary_term(conn, term, definition, category)
    item["aliases"] = keyword_aliases(conn, item["term"])
    item["notes"] = keyword_notes(conn, item["term"])
    return item
