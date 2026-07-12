from __future__ import annotations

import json
import sqlite3
from typing import Any, Mapping

from .db import get_template, row_to_dict, utc_now

EDITABLE_FIELDS = {"title", "instructions", "response_format", "artifact_template", "artifact_mapping"}
ARTIFACT_TASK_TYPES = {"draft_cover_letter", "draft_cv"}
FIXED_APPLY_FIELDS = {
    "field_inference": {"fields"},
    "company_research": {"company_research"},
    "keyword_definition": {"definition"},
    "draft_form_responses": {"form_answers"},
    "career_plan_review": {"review"},
}


class TaskDefinitionError(ValueError):
    pass


def ensure_task_definition_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS task_definitions (
          task_type TEXT PRIMARY KEY,
          version INTEGER NOT NULL,
          title TEXT NOT NULL,
          instructions TEXT NOT NULL,
          response_format TEXT NOT NULL,
          artifact_template TEXT NOT NULL DEFAULT '',
          artifact_mapping TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS task_definition_snapshots (
          task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
          task_type TEXT NOT NULL,
          version INTEGER NOT NULL,
          definition_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()


def default_definition(task_type: str) -> dict[str, Any]:
    from .agent_access import DEFAULT_TASK_INSTRUCTIONS, response_format

    definition = {
        "task_type": task_type,
        "version": 1,
        "title": task_type.replace("_", " ").title(),
        "instructions": DEFAULT_TASK_INSTRUCTIONS.get(
            task_type,
            "Complete the bounded AAAAT task using only the supplied task context.",
        ),
        "response_format": response_format({"task_type": task_type}),
        "artifact_template": "",
        "artifact_mapping": {},
        "is_custom": False,
    }
    if task_type == "field_inference":
        definition.update(
            {
                "title": "Analyze candidature",
                "instructions": (
                    "Analyze the complete bounded job-offer source and fill every supported candidature field that can be grounded in it. "
                    "Cover company, role, source, URL, location, remote mode, salary, publication date, description, offer snapshot, "
                    "technical stack, meaningful keywords, strengths, risks to avoid, questions to ask, recruiter-call recognition signals, "
                    "pitch, smart question, prepare-first and prepare-later guidance, next action, and a 0-100 valuation when evidence permits. "
                    "Preserve non-empty user data unless replace_existing is explicitly requested."
                ),
            }
        )
    elif task_type == "company_research":
        definition.update(
            {
                "title": "Research company context",
                "instructions": (
                    "Prepare concise company research for this specific role: business model, products, market, engineering context, "
                    "culture signals, relevant recent facts when available, recruiter-call implications, useful questions, and material risks."
                ),
            }
        )
    elif task_type == "career_plan_review":
        definition.update(
            {
                "title": "Evaluate career fit",
                "instructions": (
                    "Evaluate this candidature against the bounded career plan and professional priorities. Explain strategic fit, gaps, "
                    "trade-offs, growth potential, risks, recommended priority, and concrete next actions."
                ),
            }
        )
    elif task_type == "keyword_definition":
        definition.update({"title": "Define candidature keyword"})
    elif task_type == "draft_form_responses":
        definition.update({"title": "Prepare application form answers"})
    elif task_type == "draft_cover_letter":
        definition.update(
            {
                "title": "Prepare cover letter",
                "artifact_template": "cover-letter",
                "artifact_mapping": {"cover_letter_body": "artifact.cover_letter.body"},
            }
        )
    elif task_type == "draft_cv":
        definition.update(
            {
                "title": "Prepare role-specific CV",
                "artifact_template": "cv",
                "artifact_mapping": {"cv_positioning": "artifact.cv.positioning"},
            }
        )
    return definition


def get_task_definition(conn: sqlite3.Connection, task_type: str) -> dict[str, Any]:
    ensure_task_definition_schema(conn)
    row = conn.execute("SELECT * FROM task_definitions WHERE task_type = ?", (task_type,)).fetchone()
    if row is None:
        return default_definition(task_type)
    value = row_to_dict(row)
    return {
        "task_type": task_type,
        "version": int(value["version"]),
        "title": str(value["title"]),
        "instructions": str(value["instructions"]),
        "response_format": json.loads(value["response_format"]),
        "artifact_template": str(value["artifact_template"] or ""),
        "artifact_mapping": json.loads(value["artifact_mapping"] or "{}"),
        "is_custom": True,
    }


def list_task_definitions(conn: sqlite3.Connection, task_types: list[str]) -> list[dict[str, Any]]:
    return [get_task_definition(conn, task_type) for task_type in task_types]


def save_task_definition(conn: sqlite3.Connection, task_type: str, values: Mapping[str, Any]) -> dict[str, Any]:
    unknown = set(values) - EDITABLE_FIELDS
    if unknown:
        raise TaskDefinitionError(f"Unsupported task definition fields: {sorted(unknown)}")
    current = get_task_definition(conn, task_type)
    candidate = {**current, **dict(values), "task_type": task_type, "is_custom": True}
    _validate_definition(candidate)
    version = int(current["version"]) + 1
    conn.execute(
        """INSERT INTO task_definitions(
          task_type, version, title, instructions, response_format,
          artifact_template, artifact_mapping, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task_type) DO UPDATE SET
          version = excluded.version,
          title = excluded.title,
          instructions = excluded.instructions,
          response_format = excluded.response_format,
          artifact_template = excluded.artifact_template,
          artifact_mapping = excluded.artifact_mapping,
          updated_at = excluded.updated_at""",
        (
            task_type,
            version,
            candidate["title"],
            candidate["instructions"],
            json.dumps(candidate["response_format"], sort_keys=True),
            candidate["artifact_template"],
            json.dumps(candidate["artifact_mapping"], sort_keys=True),
            utc_now(),
        ),
    )
    conn.commit()
    return get_task_definition(conn, task_type)


def reset_task_definition(conn: sqlite3.Connection, task_type: str) -> dict[str, Any]:
    ensure_task_definition_schema(conn)
    conn.execute("DELETE FROM task_definitions WHERE task_type = ?", (task_type,))
    conn.commit()
    return default_definition(task_type)


def snapshot_task_definition(conn: sqlite3.Connection, task: Mapping[str, Any]) -> dict[str, Any]:
    ensure_task_definition_schema(conn)
    task_id = str(task.get("id") or "")
    if not task_id:
        raise TaskDefinitionError("Task snapshot requires a stored task")
    row = conn.execute(
        "SELECT definition_json FROM task_definition_snapshots WHERE task_id = ?",
        (task_id,),
    ).fetchone()
    if row is not None:
        return json.loads(row["definition_json"])
    definition = get_task_definition(conn, str(task.get("task_type") or "task"))
    snapshot = {key: value for key, value in definition.items() if key != "is_custom"}
    conn.execute(
        """INSERT INTO task_definition_snapshots(
          task_id, task_type, version, definition_json, created_at
        ) VALUES (?, ?, ?, ?, ?)""",
        (task_id, snapshot["task_type"], snapshot["version"], json.dumps(snapshot, sort_keys=True), utc_now()),
    )
    conn.commit()
    return snapshot


def task_definition_snapshot(conn: sqlite3.Connection, task: Mapping[str, Any]) -> dict[str, Any]:
    return snapshot_task_definition(conn, task)


def get_editable_template(conn: sqlite3.Connection, template_name: str) -> dict[str, Any]:
    template = get_template(conn, template_name)
    return {
        "name": template["name"],
        "body": template["body"],
        "required_variables": template["required_variables"],
    }


def save_editable_template(
    conn: sqlite3.Connection,
    template_name: str,
    body: str,
    required_variables: list[str],
) -> dict[str, Any]:
    if not template_name:
        raise TaskDefinitionError("Template name is required")
    if not body.strip():
        raise TaskDefinitionError("Template body cannot be empty")
    required = [str(item).strip() for item in required_variables if str(item).strip()]
    cursor = conn.execute(
        "UPDATE templates SET body = ?, required_variables = ?, updated_at = ? WHERE name = ?",
        (body, json.dumps(required), utc_now(), template_name),
    )
    if cursor.rowcount == 0:
        raise TaskDefinitionError(f"Template not found: {template_name}")
    conn.commit()
    return get_editable_template(conn, template_name)


def _validate_definition(definition: Mapping[str, Any]) -> None:
    if not str(definition.get("title") or "").strip():
        raise TaskDefinitionError("Task title is required")
    if not str(definition.get("instructions") or "").strip():
        raise TaskDefinitionError("Task instructions are required")
    response = definition.get("response_format")
    if not isinstance(response, Mapping) or response.get("type") != "json_object":
        raise TaskDefinitionError("Response format must describe one JSON object")
    required = response.get("required")
    schema = response.get("schema")
    if not isinstance(required, list) or not all(isinstance(item, str) and item for item in required):
        raise TaskDefinitionError("Response format required must be a list of field names")
    if not isinstance(schema, Mapping):
        raise TaskDefinitionError("Response format schema must be an object")
    missing_schema = set(required) - schema.keys()
    if missing_schema:
        raise TaskDefinitionError(f"Required fields missing from schema: {sorted(missing_schema)}")

    task_type = str(definition.get("task_type") or "")
    fixed_fields = FIXED_APPLY_FIELDS.get(task_type, set())
    missing_fixed = fixed_fields - set(required)
    if missing_fixed:
        raise TaskDefinitionError(
            f"Deterministic apply for {task_type} requires fields: {sorted(missing_fixed)}"
        )

    mapping = definition.get("artifact_mapping") or {}
    if not isinstance(mapping, Mapping) or not all(isinstance(key, str) and isinstance(value, str) for key, value in mapping.items()):
        raise TaskDefinitionError("Artifact mapping must map result fields to template variables")
    template = str(definition.get("artifact_template") or "")
    if template and task_type not in ARTIFACT_TASK_TYPES:
        raise TaskDefinitionError("Only artifact tasks may select a document template")
    if task_type in ARTIFACT_TASK_TYPES and template and not mapping:
        raise TaskDefinitionError("Artifact tasks with a template require a result mapping")
    missing_result_fields = set(mapping) - schema.keys()
    if missing_result_fields:
        raise TaskDefinitionError(f"Artifact mapping references unknown result fields: {sorted(missing_result_fields)}")
