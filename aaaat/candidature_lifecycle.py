from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .candidatures import get_candidature
from .tasks import FIELD_INFERENCE_ALLOWED, create_task, list_tasks, update_task


@dataclass(frozen=True)
class LifecycleTaskSpec:
    key: str
    task_type: str
    title: str
    instructions: str
    context_hint: str
    priority: str = "normal"
    requires: tuple[str, ...] = ()


LIFECYCLE_TASKS: tuple[LifecycleTaskSpec, ...] = (
    LifecycleTaskSpec(
        "extract",
        "field_inference",
        "Extract candidature details",
        "Extract only grounded candidature fields from retained source material. Preserve user-entered values.",
        "candidature:extraction",
        "high",
    ),
    LifecycleTaskSpec(
        "evaluate",
        "field_inference",
        "Evaluate opportunity fit",
        "Return candidature_evaluation, strengths, risks_to_avoid and valuation grounded in the offer and bounded profile context.",
        "candidature:evaluation",
        "high",
        ("company", "role"),
    ),
    LifecycleTaskSpec(
        "strategy",
        "field_inference",
        "Prepare application strategy",
        "Return role_strategy, pitch, smart_question and call_signals grounded in the current candidature and bounded profile context.",
        "candidature:strategy",
        "high",
        ("candidature_evaluation",),
    ),
    LifecycleTaskSpec(
        "research",
        "company_research",
        "Research company context",
        "Prepare concise company and market context relevant to this role. Do not include personal identity unless required by the task.",
        "candidature:company_research",
        "normal",
        ("company", "role"),
    ),
    LifecycleTaskSpec(
        "recruiter",
        "field_inference",
        "Prepare recruiter conversation",
        "Return recruiter_material with concise recruiter-call notes, likely questions, positioning, logistics and risks.",
        "call:recruiter",
        "normal",
        ("candidature_evaluation", "role_strategy"),
    ),
    LifecycleTaskSpec(
        "interview",
        "field_inference",
        "Prepare interview material",
        "Return questions_to_ask, strengths, risks_to_avoid and smart_question for interview preparation. Do not change lifecycle fields.",
        "call:interview",
        "normal",
        ("candidature_evaluation", "role_strategy"),
    ),
    LifecycleTaskSpec(
        "forms",
        "draft_form_responses",
        "Prepare application form answers",
        "Draft bounded application-form answers from the retained form, current strategy and profile context.",
        "blob:form_responses",
        "normal",
        ("raw_application_form", "role_strategy"),
    ),
    LifecycleTaskSpec(
        "cv",
        "draft_cv",
        "Prepare tailored CV",
        "Prepare role-specific CV positioning and adaptation material. AAAAT renders final files locally.",
        "artifact:cv",
        "normal",
        ("candidature_evaluation", "role_strategy"),
    ),
    LifecycleTaskSpec(
        "cover_letter",
        "draft_cover_letter",
        "Prepare cover letter",
        "Draft a cover-letter body grounded in the candidature, strategy and bounded profile context. AAAAT renders final files locally.",
        "artifact:cover_letter",
        "normal",
        ("candidature_evaluation", "role_strategy"),
    ),
)

INTERACTIVE_TASKS: tuple[LifecycleTaskSpec, ...] = (
    LifecycleTaskSpec(
        "refresh",
        "field_inference",
        "Refresh candidature details",
        "Return only grounded fields that materially improve the candidature for the user's explicit desktop request. Do not return unrelated fields.",
        "candidature:refresh",
        "high",
    ),
    LifecycleTaskSpec(
        "keywords",
        "field_inference",
        "Review relevant terms",
        "Return only meaningful technical, product, domain and recruiting keywords grounded in the retained source and current candidature.",
        "candidature:keywords",
        "normal",
    ),
)

TASK_SPECS = {spec.key: spec for spec in (*LIFECYCLE_TASKS, *INTERACTIVE_TASKS)}
ACTION_TASK_KEYS = {
    "infer_fields": "refresh",
    "regenerate_strategy": "strategy",
    "update_company_research": "research",
    "regenerate_keywords": "keywords",
    "prepare_form_answers": "forms",
    "generate_cv": "cv",
    "generate_cover_letter": "cover_letter",
    "prepare_recruiter_call": "recruiter",
}


def lifecycle_task_spec(key: str) -> LifecycleTaskSpec:
    try:
        return TASK_SPECS[key]
    except KeyError as exc:
        raise ValueError(f"Unsupported candidature lifecycle task: {key}") from exc


def lifecycle_action_spec(action_id: str) -> LifecycleTaskSpec:
    key = ACTION_TASK_KEYS.get(str(action_id or ""))
    if not key:
        raise ValueError(f"Unsupported candidature action: {action_id}")
    return lifecycle_task_spec(key)


def queue_field_task(conn: sqlite3.Connection, candidature_ref: str, field_name: str) -> dict[str, Any]:
    field = str(field_name or "").strip()
    if field not in FIELD_INFERENCE_ALLOWED:
        raise ValueError(f"Unsupported assisted candidature field: {field}")
    current = _current_values(conn, candidature_ref)
    refreshing = bool(str(current.get(field) or "").strip())
    return create_task(
        conn,
        "field_inference",
        ("Refresh " if refreshing else "Prepare ") + field.replace("_", " "),
        application_id=candidature_ref,
        instructions=f"Return only {field}, grounded in the supplied bounded context.",
        state="queued",
        priority="high" if field in {"candidature_evaluation", "role_strategy"} else "normal",
        context_hint=f"field:{field}",
        created_by="desktop_action",
        notes="Explicit desktop refresh." if refreshing else "Explicit desktop field request.",
        idempotent=False,
    )


def queue_lifecycle_task(
    conn: sqlite3.Connection,
    candidature_ref: str,
    key: str,
    *,
    created_by: str = "desktop_action",
    force_blocked: bool = False,
    idempotent: bool = False,
) -> dict[str, Any]:
    spec = lifecycle_task_spec(key)
    current = _current_values(conn, candidature_ref)
    missing = _missing_requirements(spec, current)
    blocked = force_blocked or bool(missing)
    reason = "Missing prerequisites: " + ", ".join(missing) if missing else ""
    if force_blocked and not reason:
        reason = "Waiting for the fit evaluation and application strategy to be ready."
    return create_task(
        conn,
        spec.task_type,
        spec.title,
        application_id=candidature_ref,
        instructions=spec.instructions,
        state="blocked" if blocked else "queued",
        priority=spec.priority,
        context_hint=spec.context_hint,
        created_by=created_by,
        notes=reason,
        idempotent=idempotent,
    )


def queue_lifecycle_action(
    conn: sqlite3.Connection,
    candidature_ref: str,
    action_id: str,
    *,
    force_blocked: bool = False,
) -> dict[str, Any]:
    spec = lifecycle_action_spec(action_id)
    return queue_lifecycle_task(
        conn,
        candidature_ref,
        spec.key,
        created_by="desktop_action",
        force_blocked=force_blocked,
        idempotent=False,
    )



def release_ready_lifecycle_tasks(conn: sqlite3.Connection, candidature_ref: str) -> list[dict[str, Any]]:
    """Queue blocked lifecycle tasks whose required inputs are now present."""
    current = _current_values(conn, candidature_ref)
    spec_by_binding = {(spec.task_type, spec.context_hint): spec for spec in (*LIFECYCLE_TASKS, *INTERACTIVE_TASKS)}
    released: list[dict[str, Any]] = []
    for task in list_tasks(conn, application_id=candidature_ref):
        if str(task.get("state") or "") != "blocked":
            continue
        spec = spec_by_binding.get((str(task.get("task_type") or ""), str(task.get("context_hint") or "")))
        if spec is None or _missing_requirements(spec, current):
            continue
        released.append(update_task(conn, str(task["id"]), state="queued", notes="Prerequisites satisfied; ready to run."))
    return released


def _current_values(conn: sqlite3.Connection, candidature_ref: str) -> dict[str, Any]:
    candidature = get_candidature(conn, candidature_ref, include_related=False)
    current = dict(candidature)
    current.update(candidature.get("details") or {})
    return current


def _missing_requirements(spec: LifecycleTaskSpec, current: dict[str, Any]) -> list[str]:
    return [field for field in spec.requires if not str(current.get(field) or "").strip()]
