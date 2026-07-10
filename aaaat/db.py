from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_PRIVATE_DIR = ".private"
SCHEMA_VERSION = "1"
APPLICATION_UPDATE_FIELDS = {
    "company",
    "role",
    "status",
    "priority",
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
}


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
        ensure_schema_version(conn)
        seed_defaults(conn)
        check_schema_version(conn)
    return target


def ensure_schema_version(conn: sqlite3.Connection) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO schema_meta(key, value) VALUES ('schema_version', ?)",
        (SCHEMA_VERSION,),
    )
    conn.commit()


def get_schema_version(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT value FROM schema_meta WHERE key = 'schema_version'").fetchone()
    if row is None:
        raise RuntimeError("Database schema metadata is missing schema_version")
    return str(row["value"])


def check_schema_version(conn: sqlite3.Connection) -> None:
    version = get_schema_version(conn)
    if version != SCHEMA_VERSION:
        raise RuntimeError(f"Unsupported AAAAT schema version {version}; expected {SCHEMA_VERSION}")


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
    from .privacy import migrate_profile_variables

    migrate_profile_variables(conn)


def default_cv_template() -> str:
    return r"""\documentclass[a4paper,10pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[english]{babel}
\usepackage[a4paper,top=1.25cm,bottom=1.25cm,left=1.35cm,right=1.35cm]{geometry}
\usepackage{xcolor}
\usepackage{tabularx}
\usepackage{enumitem}
\usepackage[colorlinks=true,urlcolor=blue]{hyperref}
\definecolor{ink}{HTML}{111827}
\definecolor{muted}{HTML}{4B5563}
\definecolor{line}{HTML}{D1D5DB}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.35em}
\setlist[itemize]{leftmargin=1.15em,itemsep=0.05em,topsep=0.05em}
\newcommand{\sectionrule}[1]{\vspace{0.5em}{\large\bfseries #1}\par{\color{line}\hrule}\vspace{0.35em}}
\begin{document}
\color{ink}
{\Huge\bfseries {{ profile.display_name }}}\par
{\small {{ profile.email }}}\par
\vspace{0.45em}
\sectionrule{Target role}
{{ application.role }} at {{ application.company }}
\sectionrule{Profile}
{{ profile.summary.default }}
\sectionrule{Application alignment}
\begin{tabularx}{\linewidth}{>{\bfseries\color{muted}}p{3.2cm} X}
Company & {{ application.company }}\\
Role & {{ application.role }}\\
Keywords & {{ application.keywords }}\\
Pitch & {{ application.pitch }}\\
Preparation & {{ application.prepare_first }}\\
\end{tabularx}
\sectionrule{Notes}
{{ application.notes }}
\end{document}
"""


def default_cover_letter_template() -> str:
    return r"""\documentclass[a4paper,10pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[english]{babel}
\usepackage[a4paper,top=1.35cm,bottom=1.35cm,left=1.55cm,right=1.55cm]{geometry}
\usepackage{xcolor}
\usepackage{tabularx}
\usepackage[colorlinks=true,urlcolor=blue]{hyperref}
\definecolor{ink}{HTML}{111827}
\definecolor{muted}{HTML}{4B5563}
\definecolor{line}{HTML}{D1D5DB}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.58em}
\newcommand{\lettersection}[1]{\vspace{0.55em}{\large\bfseries #1}\par{\color{line}\hrule}\vspace{0.35em}}
\begin{document}
\color{ink}
{\Huge\bfseries {{ profile.display_name }}}\par
{\small {{ profile.email }}}\par
\vspace{0.65em}
\begin{tabularx}{\linewidth}{>{\bfseries\color{muted}}p{2.75cm} X}
To & {{ application.company }}\\
Role & {{ application.role }}\\
Date & \today\\
\end{tabularx}
\lettersection{Cover letter}
Dear hiring team,

{{ artifact.cover_letter.body }}

Sincerely,\\
{{ profile.display_name }}
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


def update_application(conn: sqlite3.Connection, app_id: str, **fields: Any) -> dict[str, Any]:
    updates = {key: fields[key] for key in APPLICATION_UPDATE_FIELDS if key in fields}
    if updates:
        updates["updated_at"] = utc_now()
        assignments = ", ".join(f"{key} = :{key}" for key in updates)
        updates["id"] = app_id
        conn.execute(f"UPDATE applications SET {assignments} WHERE id = :id", updates)
    if "keywords" in fields:
        set_application_keywords(conn, app_id, fields["keywords"])
    conn.commit()
    return get_application(conn, app_id)


def delete_application(conn: sqlite3.Connection, app_id: str) -> bool:
    row = conn.execute("SELECT id FROM applications WHERE id = ?", (app_id,)).fetchone()
    if row is None:
        return False

    artifact_rows = conn.execute("SELECT id FROM generated_artifacts WHERE application_id = ?", (app_id,)).fetchall()
    artifact_ids = [str(row["id"]) for row in artifact_rows]
    if artifact_ids:
        placeholders = ", ".join("?" for _ in artifact_ids)
        conn.execute(f"UPDATE tasks SET artifact_id = NULL WHERE artifact_id IN ({placeholders})", artifact_ids)
        conn.execute(
            f"""UPDATE candidature_details
            SET cv_sent_artifact_id = CASE WHEN cv_sent_artifact_id IN ({placeholders}) THEN NULL ELSE cv_sent_artifact_id END,
                cover_letter_artifact_id = CASE WHEN cover_letter_artifact_id IN ({placeholders}) THEN NULL ELSE cover_letter_artifact_id END
            WHERE application_id = ?""",
            [*artifact_ids, *artifact_ids, app_id],
        )

    conn.execute("DELETE FROM candidature_details WHERE application_id = ?", (app_id,))
    conn.execute("DELETE FROM raw_intake WHERE application_id = ?", (app_id,))
    conn.execute("DELETE FROM application_keywords WHERE application_id = ?", (app_id,))
    conn.execute("DELETE FROM agent_suggestions WHERE application_id = ?", (app_id,))
    conn.execute("DELETE FROM generated_artifacts WHERE application_id = ?", (app_id,))
    conn.execute("DELETE FROM notes WHERE application_id = ?", (app_id,))
    conn.execute("DELETE FROM applications WHERE id = ?", (app_id,))
    conn.commit()
    return True


def set_application_keywords(conn: sqlite3.Connection, app_id: str, keywords: Any) -> None:
    if isinstance(keywords, str):
        terms = [term.strip() for term in keywords.split(",") if term.strip()]
    else:
        terms = [str(term).strip() for term in (keywords or []) if str(term).strip()]
    conn.execute("DELETE FROM application_keywords WHERE application_id = ?", (app_id,))
    for term in terms:
        conn.execute("INSERT OR IGNORE INTO glossary_terms(term, definition, category) VALUES (?, ?, ?)", (term, "", ""))
        conn.execute("INSERT OR IGNORE INTO application_keywords(application_id, term) VALUES (?, ?)", (app_id, term))


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


def create_raw_offer_intake(conn: sqlite3.Connection, content: str, created_by: str = "user") -> dict[str, Any]:
    app = create_application(
        conn,
        company="Pending extraction",
        role="Pending role",
        status="intake",
        priority="normal",
        next_action="Extract raw offer details",
    )
    intake = add_raw_intake(conn, app["id"], content, created_by)
    app["raw_intake"] = [intake]
    return app


def list_raw_intake(conn: sqlite3.Connection, application_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM raw_intake WHERE application_id = ? ORDER BY created_at DESC",
        (application_id,),
    ).fetchall()
    return [row_to_dict(row) for row in rows]


def list_glossary(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM glossary_terms ORDER BY term").fetchall()
    return [row_to_dict(row) for row in rows]


def upsert_glossary_term(conn: sqlite3.Connection, term: str, definition: str, category: str = "") -> dict[str, Any]:
    cleaned = term.strip()
    if not cleaned:
        raise ValueError("Glossary term is required")
    conn.execute(
        """INSERT INTO glossary_terms(term, definition, category) VALUES (?, ?, ?)
        ON CONFLICT(term) DO UPDATE SET definition=excluded.definition, category=excluded.category""",
        (cleaned, definition, category),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM glossary_terms WHERE term = ?", (cleaned,)).fetchone()
    return row_to_dict(row)


def set_profile_variable(conn: sqlite3.Connection, key: str, value: str) -> None:
    from .privacy import set_variable

    set_variable(conn, key, value, mirror_profile=True)


def profile_variables(conn: sqlite3.Connection) -> dict[str, str]:
    from .privacy import profile_variables_compat

    return profile_variables_compat(conn)


def required_profile_variables(conn: sqlite3.Connection) -> list[str]:
    required: set[str] = set()
    rows = conn.execute("SELECT required_variables FROM templates").fetchall()
    for row in rows:
        for key in json.loads(row["required_variables"]):
            if key.startswith("profile."):
                required.add(key)
    from .privacy import required_profile_variables as missing_profile_variables

    return missing_profile_variables(conn, required)


def get_template(conn: sqlite3.Connection, name: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM templates WHERE name = ?", (name,)).fetchone()
    if row is None:
        raise KeyError(f"Template not found: {name}")
    item = row_to_dict(row)
    item["required_variables"] = json.loads(item["required_variables"])
    return item
