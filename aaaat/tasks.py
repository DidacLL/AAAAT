from __future__ import annotations

import json
import sqlite3
from typing import Any

from .artifacts import update_artifact_state
from .db import application_keywords, get_application, new_id, row_to_dict, upsert_glossary_term, utc_now
from .text_blobs import create_text_blob, get_text_blob, update_text_blob


TASK_STATES = {"queued", "claimed", "in_progress", "blocked", "completed", "cancelled"}
OPEN_TASK_STATES = {"queued", "claimed", "in_progress", "blocked"}
INITIAL_OPTIONAL_TASKS = {
    "cv": ("draft_cv", "Draft CV adaptation", "Prepare a CV adaptation suggestion for review.", "artifact:cv"),
    "cover_letter": (
        "draft_cover_letter",
        "Draft cover letter",
        "Prepare a cover letter suggestion for review.",
        "artifact:cover_letter",
    ),
    "form_responses": (
        "draft_form_responses",
        "Draft form responses",
        "Prepare application form response suggestions for review.",
        "blob:form_responses",
    ),
}
FIELD_INFERENCE_FIELDS = {
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
    "description",
    "salary_expectation",
    "publication_date",
    "application_date",
    "raw_application_form",
    "strengths",
    "questions_to_ask",
    "tech_stack",
    "valuation",
    "keywords",
}


def create_task(
    conn: sqlite3.Connection,
    task_type: str,
    title: str,
    *,
    application_id: str | None = None,
    instructions: str = "",
    state: str = "queued",
    priority: str = "normal",
    context_hint: str = "",
    created_by: str = "system",
    agent_name: str = "",
    agent_runtime: str = "",
    notes: str = "",
    idempotent: bool = True,
) -> dict[str, Any]:
    if state not in TASK_STATES:
        raise ValueError(f"Invalid task state: {state}")
    if idempotent:
        existing = find_open_task(conn, application_id, task_type, context_hint)
        if existing:
            return existing
    now = utc_now()
    item = {
        "id": new_id("task"),
        "application_id": application_id,
        "task_type": task_type,
        "title": title,
        "instructions": instructions,
        "state": state,
        "priority": priority,
        "context_hint": context_hint,
        "created_by": created_by,
        "agent_name": agent_name,
        "agent_runtime": agent_runtime,
        "result_blob_id": None,
        "artifact_id": None,
        "created_at": now,
        "updated_at": now,
        "completed_at": "",
        "notes": notes,
    }
    conn.execute(
        """INSERT INTO tasks(
          id, application_id, task_type, title, instructions, state, priority,
          context_hint, created_by, agent_name, agent_runtime, result_blob_id,
          artifact_id, created_at, updated_at, completed_at, notes
        ) VALUES (
          :id, :application_id, :task_type, :title, :instructions, :state, :priority,
          :context_hint, :created_by, :agent_name, :agent_runtime, :result_blob_id,
          :artifact_id, :created_at, :updated_at, :completed_at, :notes
        )""",
        item,
    )
    conn.commit()
    return item


def find_open_task(
    conn: sqlite3.Connection,
    application_id: str | None,
    task_type: str,
    context_hint: str,
) -> dict[str, Any] | None:
    if application_id is None:
        row = conn.execute(
            """SELECT * FROM tasks
            WHERE application_id IS NULL AND task_type = ? AND context_hint = ?
              AND state IN ('queued', 'claimed', 'in_progress', 'blocked')
            ORDER BY created_at LIMIT 1""",
            (task_type, context_hint),
        ).fetchone()
    else:
        row = conn.execute(
            """SELECT * FROM tasks
            WHERE application_id = ? AND task_type = ? AND context_hint = ?
              AND state IN ('queued', 'claimed', 'in_progress', 'blocked')
            ORDER BY created_at LIMIT 1""",
            (application_id, task_type, context_hint),
        ).fetchone()
    return row_to_dict(row) if row else None


def list_tasks(
    conn: sqlite3.Connection,
    *,
    application_id: str | None = None,
    state: str | None = None,
) -> list[dict[str, Any]]:
    clauses = []
    params: list[str] = []
    if application_id is not None:
        clauses.append("application_id = ?")
        params.append(application_id)
    if state is not None:
        clauses.append("state = ?")
        params.append(state)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    rows = conn.execute(
        f"""SELECT * FROM tasks{where}
        ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, created_at""",
        params,
    ).fetchall()
    return [row_to_dict(row) for row in rows]


def get_task(conn: sqlite3.Connection, task_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        raise KeyError(f"Task not found: {task_id}")
    return row_to_dict(row)


def update_task(conn: sqlite3.Connection, task_id: str, **fields: Any) -> dict[str, Any]:
    allowed = {
        "application_id",
        "task_type",
        "title",
        "instructions",
        "state",
        "priority",
        "context_hint",
        "created_by",
        "agent_name",
        "agent_runtime",
        "result_blob_id",
        "artifact_id",
        "completed_at",
        "notes",
    }
    updates = {key: fields[key] for key in allowed if key in fields}
    if "state" in updates and updates["state"] not in TASK_STATES:
        raise ValueError(f"Invalid task state: {updates['state']}")
    if updates:
        updates["updated_at"] = utc_now()
        updates["id"] = task_id
        assignments = ", ".join(f"{key} = :{key}" for key in updates if key != "id")
        conn.execute(f"UPDATE tasks SET {assignments} WHERE id = :id", updates)
        conn.commit()
    return get_task(conn, task_id)


def complete_task(
    conn: sqlite3.Connection,
    task_id: str,
    *,
    result_body: str = "",
    result_title: str = "",
    artifact_id: str | None = None,
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
) -> dict[str, Any]:
    task = get_task(conn, task_id)
    result_blob_id = task.get("result_blob_id")
    if result_body:
        blob = create_text_blob(
            conn,
            "task_result",
            result_body,
            application_id=task.get("application_id"),
            title=result_title or task.get("title", ""),
            source_context=f"task:{task_id}",
            review_state="suggested",
            created_by="agent" if agent_name or agent_runtime else "user",
            agent_name=agent_name,
            agent_runtime=agent_runtime,
            model_provider=model_provider,
        )
        result_blob_id = blob["id"]
    return update_task(
        conn,
        task_id,
        state="completed",
        result_blob_id=result_blob_id,
        artifact_id=artifact_id or task.get("artifact_id"),
        completed_at=utc_now(),
        agent_name=agent_name or task.get("agent_name", ""),
        agent_runtime=agent_runtime or task.get("agent_runtime", ""),
    )


def apply_task_result(conn: sqlite3.Connection, task_id: str) -> dict[str, Any]:
    task = get_task(conn, task_id)
    result_blob_id = task.get("result_blob_id")
    artifact_id = task.get("artifact_id")
    if not result_blob_id and not artifact_id:
        raise ValueError("Task has no result blob to apply")
    result_body = ""
    if result_blob_id:
        result_body = str(get_text_blob(conn, result_blob_id).get("body") or "")
    task_type = task.get("task_type", "")
    application_id = task.get("application_id")
    applied = False
    notes: list[str] = []

    if application_id and task_type == "field_inference":
        applied, notes = apply_field_inference(conn, application_id, result_body)
    elif application_id and task_type == "company_research":
        applied, notes = apply_single_field_result(
            conn,
            application_id,
            "company_research",
            result_body,
            default_title="Company research result",
        )
    elif task_type == "keyword_definition":
        term = keyword_from_context(task.get("context_hint", ""))
        if not term:
            raise ValueError("Keyword definition task requires context_hint=keyword:{term}")
        applied, notes = apply_keyword_definition(conn, term, result_body)
    elif application_id and task_type == "draft_form_responses":
        applied, notes = apply_single_field_result(
            conn,
            application_id,
            "form_answers",
            result_body,
            default_title="Form response draft",
        )
    elif artifact_id and task_type in {"draft_cv", "draft_cover_letter"}:
        update_artifact_state(conn, artifact_id, "reviewed", "Applied from completed task result.")
        applied = True
        notes = [f"Reviewed artifact {artifact_id}; not marked submitted."]

    if result_blob_id:
        update_text_blob(conn, result_blob_id, review_state="applied" if applied else "reviewed")
    if notes:
        existing_notes = str(task.get("notes") or "").strip()
        suffix = "Apply notes: " + "; ".join(notes)
        update_task(conn, task_id, notes=(existing_notes + "\n" + suffix).strip())
    return get_task(conn, task_id)


def parse_task_result(result_body: str) -> tuple[Any, bool]:
    try:
        parsed = json.loads(result_body)
    except json.JSONDecodeError:
        return result_body, False
    if isinstance(parsed, dict):
        replace = bool(parsed.get("replace_existing") or parsed.get("replace"))
        if "fields" in parsed and isinstance(parsed["fields"], dict):
            return parsed["fields"], replace
        if "result" in parsed:
            return parsed["result"], replace
        return parsed, replace
    return parsed, False


def result_text(parsed: Any, fallback: str, *keys: str) -> str:
    if isinstance(parsed, dict):
        for key in keys:
            if key in parsed:
                return str(parsed.get(key) or "")
    return str(parsed if isinstance(parsed, str) else fallback)


def is_empty_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, list):
        return len(value) == 0
    return not str(value).strip()


def apply_field_inference(conn: sqlite3.Connection, application_id: str, result_body: str) -> tuple[bool, list[str]]:
    from .candidatures import update_candidature

    parsed, replace = parse_task_result(result_body)
    fields = parsed
    if not isinstance(fields, dict):
        return False, ["Plain text field inference result kept as reviewable text blob."]
    current = get_candidature_for_apply(conn, application_id)
    updates: dict[str, Any] = {}
    skipped: list[str] = []
    for key, value in fields.items():
        if key not in FIELD_INFERENCE_FIELDS:
            continue
        existing = current.get(key)
        if replace or is_empty_value(existing):
            updates[key] = value
        else:
            skipped.append(key)
    if updates:
        update_candidature(conn, application_id, **updates)
    notes = []
    if updates:
        notes.append("Filled empty fields: " + ", ".join(sorted(updates)))
    if skipped:
        notes.append("Skipped non-empty fields: " + ", ".join(sorted(skipped)))
    if not updates and not skipped:
        notes.append("No supported field inference fields found.")
    return bool(updates), notes


def get_candidature_for_apply(conn: sqlite3.Connection, application_id: str) -> dict[str, Any]:
    from .candidatures import get_candidature

    loaded = get_candidature(conn, application_id, include_related=False)
    current = dict(loaded)
    current.update(loaded.get("details", {}))
    return current


def apply_single_field_result(
    conn: sqlite3.Connection,
    application_id: str,
    field_name: str,
    result_body: str,
    *,
    default_title: str,
) -> tuple[bool, list[str]]:
    from .candidatures import update_candidature

    parsed, replace = parse_task_result(result_body)
    value = result_text(parsed, result_body, field_name, "body", "text", "content", "answer")
    current = get_candidature_for_apply(conn, application_id)
    if replace or is_empty_value(current.get(field_name)):
        update_candidature(conn, application_id, **{field_name: value})
        return True, [f"Filled {field_name}."]
    create_text_blob(
        conn,
        field_name,
        value,
        application_id=application_id,
        title=default_title,
        source_context=f"conflict:{field_name}",
        review_state="suggested",
        created_by="agent",
        notes=f"Kept as suggestion because {field_name} already had content.",
    )
    return False, [f"Skipped non-empty {field_name}; saved suggestion text blob."]


def apply_keyword_definition(conn: sqlite3.Connection, term: str, result_body: str) -> tuple[bool, list[str]]:
    parsed, replace = parse_task_result(result_body)
    definition = result_text(parsed, result_body, "definition", "body", "text", "content")
    row = conn.execute("SELECT definition, category FROM glossary_terms WHERE term = ?", (term,)).fetchone()
    current = row_to_dict(row) if row else {}
    if replace or is_empty_value(current.get("definition")):
        category = str(current.get("category") or "")
        if isinstance(parsed, dict) and parsed.get("category"):
            category = str(parsed["category"])
        upsert_glossary_term(conn, term, definition, category)
        return True, [f"Saved keyword definition for {term}."]
    return False, [f"Skipped existing keyword definition for {term}."]


def keyword_from_context(context_hint: str) -> str:
    prefix = "keyword:"
    return context_hint[len(prefix) :].strip() if context_hint.startswith(prefix) else ""


def ensure_initial_tasks(
    conn: sqlite3.Connection,
    application_id: str,
    *,
    include_field_inference: bool = True,
    include_company_research: bool = True,
    include_keyword_detection: bool = True,
    include_cv: bool = False,
    include_cover_letter: bool = False,
    include_form_responses: bool = False,
) -> list[dict[str, Any]]:
    app = get_application(conn, application_id)
    created: list[dict[str, Any]] = []
    if include_field_inference:
        created.append(
            create_task(
                conn,
                "field_inference",
                "Infer candidature fields",
                application_id=application_id,
                instructions="Extract structured candidature fields from raw offer and form intake.",
                priority="high",
                context_hint="candidature:field_inference",
            )
        )
    if include_company_research and not str(app.get("company_research") or "").strip():
        created.append(
            create_task(
                conn,
                "company_research",
                "Research company context",
                application_id=application_id,
                instructions="Prepare company research as a suggestion for human review.",
                priority="normal",
                context_hint="candidature:company_research",
            )
        )
    glossary = {
        row["term"]: row["definition"]
        for row in conn.execute("SELECT term, definition FROM glossary_terms").fetchall()
    }
    if include_keyword_detection:
        for keyword in application_keywords(conn, application_id):
            if not str(glossary.get(keyword) or "").strip():
                created.append(
                    create_task(
                        conn,
                        "keyword_definition",
                        f"Define keyword: {keyword}",
                        application_id=application_id,
                        instructions=f"Define {keyword} for this candidature context.",
                        priority="medium",
                        context_hint=f"keyword:{keyword}",
                    )
                )
    optional = {
        "cv": include_cv,
        "cover_letter": include_cover_letter,
        "form_responses": include_form_responses,
    }
    for key, enabled in optional.items():
        if not enabled:
            continue
        task_type, title, instructions, context_hint = INITIAL_OPTIONAL_TASKS[key]
        created.append(
            create_task(
                conn,
                task_type,
                title,
                application_id=application_id,
                instructions=instructions,
                priority="normal",
                context_hint=context_hint,
            )
        )
    return created
