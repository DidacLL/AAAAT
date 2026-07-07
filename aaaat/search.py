from __future__ import annotations

import sqlite3
from typing import Any

from .db import application_keywords, list_applications, list_raw_intake, row_to_dict
from .notes import list_notes
from .text_blobs import list_text_blobs
from .todos import list_todos


class SearchUnavailable(RuntimeError):
    pass


def ensure_fts(conn: sqlite3.Connection) -> None:
    try:
        conn.execute(
            """CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
              entity_type,
              entity_id,
              application_id UNINDEXED,
              title,
              body,
              keywords
            )"""
        )
        conn.commit()
    except sqlite3.OperationalError as exc:
        message = str(exc).lower()
        if "fts5" in message or "no such module" in message:
            raise SearchUnavailable("SQLite FTS5 is required") from exc
        raise


def fts_available(conn: sqlite3.Connection) -> bool:
    try:
        ensure_fts(conn)
    except SearchUnavailable:
        return False
    return True


def rebuild_index(conn: sqlite3.Connection) -> None:
    ensure_fts(conn)
    conn.execute("DELETE FROM search_fts")
    for app in list_applications(conn):
        app_id = app["id"]
        keywords = ", ".join(application_keywords(conn, app_id))
        title = f"{app.get('company', '')} {app.get('role', '')}".strip()
        body = "\n".join(
            str(app.get(field) or "")
            for field in (
                "source",
                "source_url",
                "location",
                "remote_mode",
                "next_action",
                "notes",
                "call_signals",
                "technical_reading",
                "pitch",
                "smart_question",
                "risks_to_avoid",
                "prepare_first",
                "prepare_later",
                "offer_snapshot",
                "company_research",
                "form_answers",
            )
        )
        add_index_row(conn, "candidature", app_id, app_id, title, body, keywords)
        for item in list_raw_intake(conn, app_id):
            add_index_row(conn, "raw_intake", item["id"], app_id, "Raw intake", item["content"], keywords)
    for note in list_notes(conn):
        add_index_row(conn, "note", note["id"], note.get("application_id"), note["note_type"], note["body"], "")
    for blob in list_text_blobs(conn):
        add_index_row(conn, "text_blob", blob["id"], blob.get("application_id"), blob["title"], blob["body"], blob["blob_type"])
    for todo in list_todos(conn):
        add_index_row(conn, "todo", todo["id"], todo.get("application_id"), todo["title"], todo["body"], todo["state"])
    for keyword in conn.execute("SELECT term, definition, category FROM glossary_terms").fetchall():
        aliases = conn.execute("SELECT alias FROM keyword_aliases WHERE keyword = ?", (keyword["term"],)).fetchall()
        notes = conn.execute("SELECT body FROM keyword_notes WHERE keyword = ?", (keyword["term"],)).fetchall()
        body = "\n".join([keyword["definition"], *(row["body"] for row in notes)])
        add_index_row(
            conn,
            "keyword",
            keyword["term"],
            None,
            keyword["term"],
            body,
            ", ".join([keyword["category"], *(row["alias"] for row in aliases)]),
        )
    conn.commit()


def add_index_row(
    conn: sqlite3.Connection,
    entity_type: str,
    entity_id: str,
    application_id: str | None,
    title: str,
    body: str,
    keywords: str,
) -> None:
    conn.execute(
        """INSERT INTO search_fts(entity_type, entity_id, application_id, title, body, keywords)
        VALUES (?, ?, ?, ?, ?, ?)""",
        (entity_type, entity_id, application_id, title, body, keywords),
    )


def search(conn: sqlite3.Connection, query: str, *, limit: int = 20) -> dict[str, Any]:
    ensure_fts(conn)
    cleaned = query.strip()
    if not cleaned:
        return {"available": True, "results": []}
    rows = conn.execute(
        """SELECT entity_type, entity_id, application_id, title, snippet(search_fts, 4, '[', ']', '...', 8) AS snippet
        FROM search_fts
        WHERE search_fts MATCH ?
        ORDER BY rank
        LIMIT ?""",
        (cleaned, limit),
    ).fetchall()
    return {"available": True, "results": [row_to_dict(row) for row in rows]}


def search_status(conn: sqlite3.Connection) -> dict[str, Any]:
    try:
        ensure_fts(conn)
    except SearchUnavailable as exc:
        return {"available": False, "error": str(exc)}
    return {"available": True, "error": ""}
