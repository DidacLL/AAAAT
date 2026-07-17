from __future__ import annotations

import json
import secrets
import sqlite3
from typing import Any

from .assisted_profile import apply_profile_completion_result, profile_completion_context
from .candidatures import get_candidature_details
from .career_plans import career_plan_context
from .db import application_keywords, get_application, list_raw_intake, utc_now
from .privacy import resolve_variables
from .profile_facts import profile_context
from .tasks import FIELD_INFERENCE_ALLOWED, complete_task, get_task, keyword_from_context, list_tasks

ENVELOPE_FIELDS = {"task_type", "title", "state", "priority", "context_hint", "created_at", "updated_at"}
SAFE_CONTEXT_PREFIXES = ("field:", "keyword:", "candidature:", "artifact:", "blob:", "call:", "profile:")
TASK_CAPABILITY_PREFIX = "taskcap_"
FORBIDDEN_AGENT_CONTEXT_KEYS = {
    "application_id",
    "candidature_id",
    "artifact_id",
    "profile_fact_id",
    "note_id",
    "todo_id",
    "blob_id",
    "file_path",
    "storage_path",
}
AGENT_CONTROL_KEYS = {"replace_existing", "replace"}

_EXTRACTION_FIELDS = {
    "company",
    "role",
    "source_url",
    "location",
    "remote_mode",
    "salary_expectation",
    "publication_date",
    "application_date",
    "description",
    "offer_snapshot",
    "tech_stack",
    "keywords",
}
_EVALUATION_FIELDS = {"candidature_evaluation", "strengths", "risks_to_avoid", "valuation"}
_STRATEGY_FIELDS = {"role_strategy", "pitch", "smart_question", "call_signals"}
_RECRUITER_FIELDS = {"recruiter_material"}
_INTERVIEW_FIELDS = {"questions_to_ask", "strengths", "risks_to_avoid", "smart_question"}
_KEYWORD_FIELDS = {"keywords"}

_FIELD_TASKS: dict[str, dict[str, Any]] = {
    "candidature:extraction": {
        "purpose": "candidature_extraction",
        "fields": _EXTRACTION_FIELDS,
        "profile_purpose": "",
    },
    "candidature:evaluation": {
        "purpose": "candidature_fit_evaluation",
        "fields": _EVALUATION_FIELDS,
        "profile_purpose": "candidature_fit",
    },
    "candidature:strategy": {
        "purpose": "application_strategy",
        "fields": _STRATEGY_FIELDS,
        "profile_purpose": "candidature_fit",
    },
    "call:recruiter": {
        "purpose": "recruiter_call_preparation",
        "fields": _RECRUITER_FIELDS,
        "profile_purpose": "recruiter_call",
    },
    "call:interview": {
        "purpose": "interview_preparation",
        "fields": _INTERVIEW_FIELDS,
        "profile_purpose": "recruiter_call",
    },
    "candidature:keywords": {
        "purpose": "candidature_keyword_extraction",
        "fields": _KEYWORD_FIELDS,
        "profile_purpose": "",
    },
    "candidature:review": {
        "purpose": "candidature_user_requested_review",
        "fields": set(FIELD_INFERENCE_ALLOWED),
        "profile_purpose": "candidature_fit",
    },
    "candidature:field_inference": {
        "purpose": "candidature_field_inference",
        "fields": set(FIELD_INFERENCE_ALLOWED),
        "profile_purpose": "candidature_fit",
    },
}

TASK_PURPOSES = {
    "profile_completion": "professional_profile_completion",
    "field_inference": "candidature_field_inference",
    "company_research": "market_research",
    "keyword_definition": "keyword_definition",
    "draft_form_responses": "form_answers",
    "draft_cv": "cv_generation",
    "draft_cover_letter": "cover_letter",
    "recruiter_call_material": "recruiter_call_preparation",
    "career_plan_review": "career_plan_review",
}
DEFAULT_TASK_INSTRUCTIONS = {
    "profile_completion": "Collect eligible missing professional-profile fields through normal conversation. Existing non-empty desktop values remain authoritative.",
    "field_inference": "Complete only the lifecycle fields declared by this work item using its bounded candidature and profile context.",
    "company_research": "Prepare concise company research relevant to the candidature and role.",
    "keyword_definition": "Define the keyword for this job-search context when its canonical definition is empty.",
    "draft_form_responses": "Draft application form responses using the supplied form, application strategy and bounded profile context.",
    "draft_cv": "Suggest CV positioning and role-specific adaptation notes using the supplied fit and strategy. AAAAT renders final files locally.",
    "draft_cover_letter": "Draft a cover-letter body using the supplied fit, strategy and bounded profile context. AAAAT renders final files locally.",
    "recruiter_call_material": "Prepare concise recruiter-call material from the supplied candidature, fit, strategy and bounded profile context.",
    "career_plan_review": "Review the bounded career plan context and propose concrete improvements.",
}


def _ensure_capability_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS agent_task_capabilities (
        capability TEXT PRIMARY KEY,
        task_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )"""
    )
    conn.commit()


def safe_context_hint(value: str | None) -> str:
    hint = str(value or "").strip()
    if len(hint) > 160:
        return ""
    return hint if hint.startswith(SAFE_CONTEXT_PREFIXES) else ""


def allowed_actions(task: dict[str, Any]) -> list[str]:
    state = str(task.get("state") or "")
    if state == "queued":
        return ["submit_result"]
    if state in {"claimed", "in_progress"}:
        return ["report_progress", "submit_result"]
    return []


def task_capability(conn: sqlite3.Connection, task: dict[str, Any]) -> str:
    _ensure_capability_table(conn)
    task_id = str(task.get("id") or "")
    row = conn.execute("SELECT capability FROM agent_task_capabilities WHERE task_id = ?", (task_id,)).fetchone()
    if row:
        return str(row["capability"])
    capability = TASK_CAPABILITY_PREFIX + secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO agent_task_capabilities(capability, task_id, created_at) VALUES (?, ?, ?)",
        (capability, task_id, utc_now()),
    )
    conn.commit()
    return capability


def task_id_for_capability(conn: sqlite3.Connection, capability: str) -> str:
    cleaned = str(capability or "").strip()
    if not cleaned.startswith(TASK_CAPABILITY_PREFIX):
        raise KeyError("Task capability not found")
    _ensure_capability_table(conn)
    row = conn.execute("SELECT task_id FROM agent_task_capabilities WHERE capability = ?", (cleaned,)).fetchone()
    if row is None:
        raise KeyError("Task capability not found")
    return str(row["task_id"])


def get_task_for_capability(conn: sqlite3.Connection, capability: str) -> dict[str, Any]:
    return get_task(conn, task_id_for_capability(conn, capability))


def _field_task_config(task: dict[str, Any]) -> dict[str, Any]:
    hint = safe_context_hint(task.get("context_hint"))
    return _FIELD_TASKS.get(
        hint,
        {
            "purpose": "candidature_field_inference",
            "fields": set(FIELD_INFERENCE_ALLOWED),
            "profile_purpose": "candidature_fit",
        },
    )


def task_purpose(task: dict[str, Any]) -> str:
    task_type = str(task.get("task_type") or "task")
    if task_type == "field_inference":
        return str(_field_task_config(task)["purpose"])
    return TASK_PURPOSES.get(task_type, task_type)


def task_instructions(task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    process = [
        "Use only the supplied input_context as AAAAT's local data source for this work item.",
        "Return one JSON object matching response_format.",
        "Return content only; AAAAT binds, validates and applies it to the correct local records.",
        "Do not add identifiers, paths, replacement controls or unrelated fields.",
    ]
    if task_type == "field_inference":
        process.append("Return only fields listed in input_context.allowed_fields.")
    return {
        "default": DEFAULT_TASK_INSTRUCTIONS.get(task_type, "Complete the bounded AAAAT task using only the supplied context."),
        "task_specific": str(task.get("instructions") or ""),
        "process": process,
    }


def output_contract(task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    return {
        "kind": "task_result",
        "for_task_type": task_type,
        "entity_ids_allowed": False,
        "deterministic_apply_by_aaaat": True,
        "human_review_optional": True,
        "apply_model": "AAAAT validates and applies the bounded result. User-owned values are replaced only for an explicit desktop refresh action; otherwise conflicts remain history.",
        "writes": _writes_description(task),
    }


def _writes_description(task: dict[str, Any]) -> str:
    task_type = str(task.get("task_type") or "task")
    if task_type == "field_inference":
        allowed = ", ".join(sorted(_field_task_config(task)["fields"]))
        return "Only these candidature fields under fields: " + allowed
    return {
        "profile_completion": "Eligible missing profile variables under variables. Existing values are retained.",
        "company_research": "Company research text for the selected candidature.",
        "keyword_definition": "Definition and optional category for a keyword whose canonical definition is empty.",
        "draft_form_responses": "Application form answers for the selected candidature.",
        "draft_cv": "CV positioning/adaptation content for local rendering.",
        "draft_cover_letter": "Cover-letter body for local rendering.",
        "recruiter_call_material": "Recruiter-call material for the selected candidature.",
        "career_plan_review": "Career-plan review.",
    }.get(task_type, "General bounded task result.")


def response_format(task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    if task_type == "field_inference":
        return {
            "type": "json_object",
            "required": ["fields"],
            "additional_properties": False,
            "schema": {
                "fields": {
                    "type": "object",
                    "allowed_fields": sorted(_field_task_config(task)["fields"]),
                }
            },
        }
    formats: dict[str, dict[str, Any]] = {
        "profile_completion": {
            "type": "json_object",
            "required": ["variables"],
            "additional_properties": False,
            "schema": {"variables": {"type": "object"}},
        },
        "company_research": {
            "type": "json_object",
            "required": ["company_research"],
            "additional_properties": False,
            "schema": {"company_research": {"type": "string"}, "sources_checked": {"type": "array", "optional": True}},
        },
        "keyword_definition": {
            "type": "json_object",
            "required": ["definition"],
            "additional_properties": False,
            "schema": {"definition": {"type": "string"}, "category": {"type": "string", "optional": True}},
        },
        "draft_form_responses": {
            "type": "json_object",
            "required": ["form_answers"],
            "additional_properties": False,
            "schema": {"form_answers": {"type": ["string", "object"]}, "assumptions": {"type": "string", "optional": True}},
        },
        "draft_cv": {
            "type": "json_object",
            "required": ["cv_positioning"],
            "additional_properties": False,
            "schema": {"cv_positioning": {"type": "string"}, "adaptation_notes": {"type": "string", "optional": True}},
        },
        "draft_cover_letter": {
            "type": "json_object",
            "required": ["cover_letter_body"],
            "additional_properties": False,
            "schema": {"cover_letter_body": {"type": "string"}, "assumptions": {"type": "string", "optional": True}},
        },
        "recruiter_call_material": {
            "type": "json_object",
            "required": ["recruiter_material"],
            "additional_properties": False,
            "schema": {"recruiter_material": {"type": "string"}},
        },
        "career_plan_review": {
            "type": "json_object",
            "required": ["review"],
            "additional_properties": False,
            "schema": {"review": {"type": "string"}},
        },
    }
    return formats.get(
        task_type,
        {
            "type": "json_object",
            "required": ["result"],
            "additional_properties": False,
            "schema": {"result": {"type": ["string", "object"]}},
        },
    )


def task_privacy_notes() -> list[str]:
    return [
        "purpose-scoped work item",
        "broad candidature collections are not exposed",
        "task_capability is a random attempt-scoped callback capability, not a database or entity ID",
        "AAAAT owns validating and applying results to local records",
    ]


def task_envelope(conn: sqlite3.Connection, task: dict[str, Any]) -> dict[str, Any]:
    envelope = {key: task.get(key, "") for key in ENVELOPE_FIELDS if key != "context_hint"}
    envelope["task_capability"] = task_capability(conn, task)
    envelope["purpose"] = task_purpose(task)
    envelope["context_hint"] = safe_context_hint(task.get("context_hint"))
    envelope["allowed_actions"] = allowed_actions(task)
    return envelope


def build_agent_work_item(conn: sqlite3.Connection, task: dict[str, Any]) -> dict[str, Any]:
    envelope = task_envelope(conn, task)
    result = {
        "task": envelope,
        "purpose": task_purpose(task),
        "instructions": task_instructions(task),
        "input_context": scrub_forbidden_agent_context(_task_context(conn, task)),
        "output_contract": output_contract(task),
        "response_format": response_format(task),
        "privacy": {"scope": "task", "notes": task_privacy_notes()},
        "allowed_actions": envelope["allowed_actions"],
    }
    return scrub_forbidden_agent_context(result)


def next_agent_work_item(conn: sqlite3.Connection) -> dict[str, Any] | None:
    tasks = list_tasks(conn, state="queued")
    interactive = [task for task in tasks if str(task.get("created_by") or "") == "desktop_action"]
    selected = interactive[-1] if interactive else (tasks[0] if tasks else None)
    return build_agent_work_item(conn, selected) if selected else None


def task_result_ack(conn: sqlite3.Connection, task: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "accepted",
        "task": {"task_capability": task_capability(conn, task), "state": task.get("state", "")},
        "next": ["continue_or_open_desktop"],
    }


def _task_context(conn: sqlite3.Connection, task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "")
    if task_type == "profile_completion":
        return profile_completion_context(conn)
    if task_type == "keyword_definition" and not task.get("application_id"):
        return {"keyword": keyword_from_context(task.get("context_hint", ""))}

    application_id = task.get("application_id")
    if application_id:
        app = get_application(conn, application_id)
        details = get_candidature_details(conn, application_id)
        current = {**app, **details}
        source = "\n\n".join(str(item.get("content") or "") for item in list_raw_intake(conn, application_id))

        if task_type == "field_inference":
            config = _field_task_config(task)
            allowed_fields = sorted(str(field) for field in config["fields"])
            context: dict[str, Any] = {
                "source_material": source,
                "allowed_fields": allowed_fields,
                "current_fields": {field: current.get(field, "") for field in allowed_fields},
                "missing_fields": [field for field in allowed_fields if not str(current.get(field) or "").strip()],
                "protected_fields": [field for field in allowed_fields if str(current.get(field) or "").strip()],
                "candidature_context": {
                    "company": app.get("company", ""),
                    "role": app.get("role", ""),
                    "keywords": application_keywords(conn, application_id),
                    "candidature_evaluation": details.get("candidature_evaluation", ""),
                    "role_strategy": details.get("role_strategy", ""),
                },
            }
            profile_purpose = str(config.get("profile_purpose") or "")
            if profile_purpose:
                context["profile_context"] = _agent_profile_context(conn, profile_purpose)
            return context

        if task_type == "company_research":
            return {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "url": app.get("source_url", ""),
                "source_material": source,
            }
        if task_type == "keyword_definition":
            return {
                "keyword": keyword_from_context(task.get("context_hint", "")),
                "company": app.get("company", ""),
                "role_hint": app.get("role", ""),
                "source_material": source,
            }
        if task_type == "draft_form_responses":
            return {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "raw_application_form": details.get("raw_application_form", ""),
                "candidature_evaluation": details.get("candidature_evaluation", ""),
                "role_strategy": details.get("role_strategy", ""),
                "profile_context": _agent_profile_context(conn, "form_answers"),
            }
        if task_type == "draft_cv":
            return {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "keywords": application_keywords(conn, application_id),
                "candidature_evaluation": details.get("candidature_evaluation", ""),
                "role_strategy": details.get("role_strategy", ""),
                "strengths": details.get("strengths", ""),
                "profile_context": _agent_profile_context(conn, "cv_generation"),
            }
        if task_type == "draft_cover_letter":
            return {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "keywords": application_keywords(conn, application_id),
                "candidature_evaluation": details.get("candidature_evaluation", ""),
                "role_strategy": details.get("role_strategy", ""),
                "strengths": details.get("strengths", ""),
                "profile_context": _agent_profile_context(conn, "cover_letter"),
            }
        if task_type == "recruiter_call_material":
            return {
                "company": app.get("company", ""),
                "role": app.get("role", ""),
                "candidature_evaluation": details.get("candidature_evaluation", ""),
                "role_strategy": details.get("role_strategy", ""),
                "profile_context": _agent_profile_context(conn, "recruiter_call"),
            }

    if task_type == "career_plan_review":
        return {"career_plan": career_plan_context(conn, purpose="career_plan_review", scope="agent")}
    return {"task_notes": task.get("notes", "")}


def _agent_profile_context(conn: sqlite3.Connection, purpose: str) -> dict[str, Any]:
    variables = {
        key: value
        for key, value in resolve_variables(conn, "agent").items()
        if str(key).startswith("profile.")
    }
    return {
        "variables": variables,
        "facts": profile_context(conn, purpose, scope="agent").get("facts", []),
    }


def scrub_forbidden_agent_context(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: scrub_forbidden_agent_context(item) for key, item in value.items() if key not in FORBIDDEN_AGENT_CONTEXT_KEYS}
    if isinstance(value, list):
        return [scrub_forbidden_agent_context(item) for item in value]
    return value


def submit_agent_task_result(
    conn: sqlite3.Connection,
    task_capability_value: str,
    result_body: str,
    *,
    result_title: str = "",
    agent_name: str = "",
    agent_runtime: str = "",
    model_provider: str = "",
) -> dict[str, Any]:
    task = get_task_for_capability(conn, task_capability_value)
    if "submit_result" not in allowed_actions(task):
        raise ValueError(f"Task is not accepting results in state {task.get('state')}")
    safe_result_body = _without_agent_control_keys(result_body)
    _validate_result_shape(task, safe_result_body)
    completed = complete_task(
        conn,
        task["id"],
        result_body=safe_result_body,
        result_title=result_title,
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        model_provider=model_provider,
    )
    if str(task.get("task_type") or "") == "profile_completion":
        completed["profile_update"] = apply_profile_completion_result(
            conn,
            safe_result_body,
            agent_name=agent_name,
            agent_runtime=agent_runtime,
        )
    return completed


def _without_agent_control_keys(result_body: str) -> str:
    try:
        value = json.loads(result_body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Result must be valid JSON: {exc.msg}") from exc
    if not isinstance(value, dict):
        raise ValueError("Result must be one JSON object")
    return json.dumps(_strip_agent_control_keys(value), ensure_ascii=False)


def _strip_agent_control_keys(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): _strip_agent_control_keys(item)
            for key, item in value.items()
            if str(key) not in AGENT_CONTROL_KEYS
        }
    if isinstance(value, list):
        return [_strip_agent_control_keys(item) for item in value]
    return value


def _validate_result_shape(task: dict[str, Any], result_body: str) -> None:
    try:
        value = json.loads(result_body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Result must be valid JSON: {exc.msg}") from exc
    if not isinstance(value, dict):
        raise ValueError("Result must be one JSON object")

    contract = response_format(task)
    required = [str(key) for key in contract.get("required") or []]
    missing = [key for key in required if key not in value]
    if missing:
        raise ValueError(f"Result does not match this task's required fields: {', '.join(missing)}")

    schema = dict(contract.get("schema") or {})
    unknown = sorted(set(value) - set(schema))
    if unknown and not bool(contract.get("additional_properties")):
        raise ValueError("Result contains unsupported fields: " + ", ".join(unknown))

    task_type = str(task.get("task_type") or "")
    if task_type == "field_inference":
        fields = value.get("fields")
        if not isinstance(fields, dict) or not fields:
            raise ValueError("Field result requires a non-empty fields object")
        allowed = set(_field_task_config(task)["fields"])
        unsupported = sorted(set(fields) - allowed)
        if unsupported:
            raise ValueError("Field result contains unsupported candidature fields: " + ", ".join(unsupported))
        for key, item in fields.items():
            if key == "keywords":
                if not isinstance(item, list) or any(not isinstance(term, str) for term in item):
                    raise ValueError("keywords must be an array of text values")
            elif not isinstance(item, (str, int, float, bool)):
                raise ValueError(f"Candidature field must be a bounded scalar value: {key}")
        return

    for key, definition in schema.items():
        if key not in value:
            continue
        expected = definition.get("type") if isinstance(definition, dict) else None
        if not _matches_type(value[key], expected):
            raise ValueError(f"Result field has the wrong type: {key}")
        if isinstance(value[key], str) and len(value[key]) > 200000:
            raise ValueError(f"Result field is too large: {key}")


def _matches_type(value: Any, expected: Any) -> bool:
    if expected is None:
        return True
    expected_types = expected if isinstance(expected, list) else [expected]
    for item in expected_types:
        if item == "string" and isinstance(value, str):
            return True
        if item == "object" and isinstance(value, dict):
            return True
        if item == "array" and isinstance(value, list):
            return True
        if item == "number" and isinstance(value, (int, float)) and not isinstance(value, bool):
            return True
        if item == "boolean" and isinstance(value, bool):
            return True
    return False
