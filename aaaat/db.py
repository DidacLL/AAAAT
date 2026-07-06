from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_PRIVATE_DIR = ".private"


class AAAATConnection(sqlite3.Connection):
    def __exit__(self, exc_type, exc, traceback) -> bool:
        super().__exit__(exc_type, exc, traceback)
        self.close()
        return False


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def storage_dir(path: str | Path = DEFAULT_PRIVATE_DIR) -> Path:
    return Path(path)


def db_path(path: str | Path = DEFAULT_PRIVATE_DIR) -> Path:
    base = storage_dir(path)
    return base if base.suffix == ".db" else base / "aaaat.sqlite3"


def connect(path: str | Path = DEFAULT_PRIVATE_DIR) -> sqlite3.Connection:
    target = db_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(target, factory=AAAATConnection)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path: str | Path = DEFAULT_PRIVATE_DIR) -> Path:
    target = db_path(path)
    with connect(path) as conn:
        conn.executescript(Path(__file__).with_name("schema.sql").read_text(encoding="utf-8"))
        seed_defaults(conn)
    return target


def seed_defaults(conn: sqlite3.Connection) -> None:
    now = utc_now()
    terms = [
        ("ATS", "Applicant tracking system used to collect and filter applications.", "recruiting"),
        ("Hiring manager", "Person responsible for the role and final team fit.", "recruiting"),
        ("Screening call", "Early recruiter conversation focused on fit, logistics, and next steps.", "call"),
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO glossary_terms(term, definition, category) VALUES (?, ?, ?)",
        terms,
    )
    conn.executemany(
        "INSERT OR IGNORE INTO templates(name, body, required_variables, updated_at) VALUES (?, ?, ?, ?)",
        [
            ("cv", default_cv_template(), json.dumps(["profile.display_name", "profile.email", "profile.summary.default"]), now),
            (
                "cover-letter",
                default_cover_letter_template(),
                json.dumps(["profile.display_name", "application.company", "application.role", "artifact.cover_letter.body"]),
                now,
            ),
        ],
    )


def default_cv_template() -> str:
    return r"""\documentclass{article}
\begin{document}
\section*{ {{ profile.display_name }} }
Email: {{ profile.email }}

\section*{Summary}
{{ profile.summary.default }}
\end{document}
"""


def default_cover_letter_template() -> str:
    return r"""\documentclass{letter}
\begin{document}
\begin{letter}{ {{ application.company }} }
\opening{Dear hiring team,}
I am applying for the {{ application.role }} role.

{{ artifact.cover_letter.body }}

\closing{Sincerely,\\{{ profile.display_name }}}
\end{letter}
\end{document}
"""


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def create_application(conn: sqlite3.Connection, **fields: Any) -> dict[str, Any]:
    now = utc_now()
    app_id = fields.pop("id", None) or new_id("app")
    data = {
        "id": app_id,
        "company": fields.get("company") or "Untitled Company",
        "role": fields.get("role") or "Untitled Role",
        "status": fields.get("status") or "draft",
        "priority": fields.get("priority") or "normal",
        "source": fields.get("source") or "",
        "source_url": fields.get("source_url") or "",
        "location": fields.get("location") or "",
        "remote_mode": fields.get("remote_mode") or "",
        "next_action": fields.get("next_action") or "",
        "notes": fields.get("notes") or "",
        "call_signals": fields.get("call_signals") or "",
        "technical_reading": fields.get("technical_reading") or "",
        "pitch": fields.get("pitch") or "",
        "smart_question": fields.get("smart_question") or "",
        "risks_to_avoid": fields.get("risks_to_avoid") or "",
        "prepare_first": fields.get("prepare_first") or "",
        "prepare_later": fields.get("prepare_later") or "",
        "offer_snapshot": fields.get("offer_snapshot") or "",
        "company_research": fields.get("company_research") or "",
        "form_answers": fields.get("form_answers") or "",
        "created_at": now,
        "updated_at": now,
    }
    columns = ", ".join(data)
    placeholders = ", ".join([":" + key for key in data])
    conn.execute(f"INSERT INTO applications({columns}) VALUES ({placeholders})", data)
    for term in fields.get("keywords") or []:
        conn.execute("INSERT OR IGNORE INTO glossary_terms(term, definition, category) VALUES (?, ?, ?)", (term, "", ""))
        conn.execute("INSERT OR IGNORE INTO application_keywords(application_id, term) VALUES (?, ?)", (app_id, term))
    conn.commit()
    return get_application(conn, app_id)


def list_applications(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM applications ORDER BY updated_at DESC").fetchall()
    apps = [row_to_dict(row) for row in rows]
    for app in apps:
        app["keywords"] = application_keywords(conn, app["id"])
    return apps


def get_application(conn: sqlite3.Connection, app_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM applications WHERE id = ?", (app_id,)).fetchone()
    if row is None:
        raise KeyError(f"Application not found: {app_id}")
    app = row_to_dict(row)
    app["keywords"] = application_keywords(conn, app_id)
    return app


def application_keywords(conn: sqlite3.Connection, app_id: str) -> list[str]:
    rows = conn.execute(
        "SELECT term FROM application_keywords WHERE application_id = ? ORDER BY term",
        (app_id,),
    ).fetchall()
    return [row["term"] for row in rows]


def add_raw_intake(conn: sqlite3.Connection, application_id: str, content: str, created_by: str = "user") -> dict[str, Any]:
    item = {
        "id": new_id("intake"),
        "application_id": application_id,
        "content": content,
        "created_at": utc_now(),
        "created_by": created_by,
    }
    conn.execute(
        "INSERT INTO raw_intake(id, application_id, content, created_at, created_by) VALUES (:id, :application_id, :content, :created_at, :created_by)",
        item,
    )
    conn.commit()
    return item


def list_raw_intake(conn: sqlite3.Connection, application_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM raw_intake WHERE application_id = ? ORDER BY created_at DESC",
        (application_id,),
    ).fetchall()
    return [row_to_dict(row) for row in rows]


def list_glossary(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM glossary_terms ORDER BY term").fetchall()
    return [row_to_dict(row) for row in rows]


def set_profile_variable(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO profile_variables(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        (key, value, utc_now()),
    )
    conn.commit()


def profile_variables(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT key, value FROM profile_variables ORDER BY key").fetchall()
    return {row["key"]: row["value"] for row in rows}


def get_template(conn: sqlite3.Connection, name: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM templates WHERE name = ?", (name,)).fetchone()
    if row is None:
        raise KeyError(f"Template not found: {name}")
    data = row_to_dict(row)
    data["required_variables"] = json.loads(data["required_variables"])
    return data
