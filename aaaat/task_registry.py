from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class TaskDefinition:
    task_type: str
    title: str
    action_label: str
    description: str
    instructions: str
    purpose: str
    response_format: dict[str, Any]
    priority: str = "normal"
    automatic: bool = False
    context_hint: str = ""
    fixed_apply_fields: tuple[str, ...] = ()
    artifact_template: str = ""
    artifact_mapping: tuple[tuple[str, str], ...] = ()
    sidebar_action: bool = True

    def snapshot(self, *, version: int = 1) -> dict[str, Any]:
        return {
            "task_type": self.task_type,
            "version": int(version),
            "title": self.title,
            "instructions": self.instructions,
            "purpose": self.purpose,
            "context_hint": self.context_hint,
            "response_format": self.response_format,
            "fixed_apply_fields": list(self.fixed_apply_fields),
            "artifact_template": self.artifact_template,
            "artifact_mapping": dict(self.artifact_mapping),
        }


_TASKS = (
    TaskDefinition(
        task_type="field_inference",
        title="Analyze candidature",
        action_label="Refresh offer analysis",
        description="Extract the complete candidature record and recruiter-call preparation from the saved offer.",
        instructions=(
            "Analyze the complete bounded job-offer source and return every supported candidature field that can be grounded in it. "
            "Cover company, role, source, URL, location, remote mode, salary, publication and application dates, description, offer snapshot, "
            "technical stack, meaningful keywords, strengths, risks, questions, recruiter-call signals, pitch, smart question, preparation guidance, "
            "next action, and a 0-100 valuation when evidence permits. Preserve non-empty user data unless replace_existing is explicitly true."
        ),
        purpose="candidature_field_inference",
        response_format={
            "type": "json_object",
            "required": ["fields"],
            "schema": {
                "fields": "object containing supported candidature fields",
                "replace_existing": "optional boolean, default false",
                "confidence_notes": "optional string",
            },
        },
        priority="high",
        automatic=True,
        context_hint="candidature:field_inference",
        fixed_apply_fields=("fields",),
    ),
    TaskDefinition(
        task_type="company_research",
        title="Research company context",
        action_label="Research company",
        description="Prepare company, market, engineering, culture, recruiter-call and risk context for this role.",
        instructions=(
            "Prepare concise company research for this specific role: business model, products, market, engineering context, culture signals, "
            "relevant recent facts when available, recruiter-call implications, useful questions, and material risks."
        ),
        purpose="market_research",
        response_format={
            "type": "json_object",
            "required": ["company_research"],
            "schema": {
                "company_research": "string",
                "sources_checked": "optional array of source labels or URLs",
            },
        },
        automatic=True,
        context_hint="candidature:company_research",
        fixed_apply_fields=("company_research",),
    ),
    TaskDefinition(
        task_type="career_plan_review",
        title="Evaluate career fit",
        action_label="Evaluate career fit",
        description="Compare this opportunity with the saved career direction, constraints, trade-offs and growth goals.",
        instructions=(
            "Evaluate this candidature against the bounded career plan and professional priorities. Explain strategic fit, gaps, trade-offs, "
            "growth potential, risks, recommended priority, and concrete next actions."
        ),
        purpose="career_plan_review",
        response_format={
            "type": "json_object",
            "required": ["review"],
            "schema": {
                "review": "string",
                "suggested_next_actions": "optional array of strings",
            },
        },
        automatic=True,
        context_hint="candidature:career_plan_review",
        fixed_apply_fields=("review",),
    ),
    TaskDefinition(
        task_type="keyword_definition",
        title="Define candidature keyword",
        action_label="Define missing keyword",
        description="Define one unknown keyword in clear job-search and recruiter-call language.",
        instructions="Define the task keyword for this candidature context in clear operational language.",
        purpose="keyword_definition",
        response_format={
            "type": "json_object",
            "required": ["definition"],
            "schema": {"definition": "string", "category": "optional string"},
        },
        context_hint="keyword:",
        fixed_apply_fields=("definition",),
        sidebar_action=False,
    ),
    TaskDefinition(
        task_type="draft_form_responses",
        title="Prepare application form answers",
        action_label="Prepare form answers",
        description="Draft answers for the saved application form when one is present.",
        instructions="Draft application form responses using only the supplied form prompt and bounded professional context. Do not invent facts.",
        purpose="form_answers",
        response_format={
            "type": "json_object",
            "required": ["form_answers"],
            "schema": {
                "form_answers": "string or object keyed by form question",
                "assumptions": "optional string",
            },
        },
        context_hint="blob:form_responses",
        fixed_apply_fields=("form_answers",),
    ),
    TaskDefinition(
        task_type="draft_cv",
        title="Prepare role-specific CV",
        action_label="Prepare CV",
        description="Prepare role-specific positioning and render a local CV draft when this application needs one.",
        instructions=(
            "Suggest CV positioning and role-specific adaptation content using only the bounded candidature and professional context. "
            "AAAAT owns local template rendering and artifact paths."
        ),
        purpose="cv_generation",
        response_format={
            "type": "json_object",
            "required": ["cv_positioning"],
            "schema": {
                "cv_positioning": "string",
                "adaptation_notes": "optional string",
            },
        },
        context_hint="artifact:cv",
        artifact_template="cv",
        artifact_mapping=(("cv_positioning", "artifact.cv.positioning"),),
    ),
    TaskDefinition(
        task_type="draft_cover_letter",
        title="Prepare cover letter",
        action_label="Prepare cover letter",
        description="Prepare and render a local cover-letter draft when this application needs one.",
        instructions=(
            "Draft a cover-letter body using only the bounded candidature and professional context. "
            "AAAAT owns local template rendering and artifact paths."
        ),
        purpose="cover_letter",
        response_format={
            "type": "json_object",
            "required": ["cover_letter_body"],
            "schema": {
                "cover_letter_body": "string",
                "assumptions": "optional string",
            },
        },
        context_hint="artifact:cover_letter",
        artifact_template="cover-letter",
        artifact_mapping=(("cover_letter_body", "artifact.cover_letter.body"),),
    ),
)

TASK_DEFINITIONS: Mapping[str, TaskDefinition] = {item.task_type: item for item in _TASKS}
EDITABLE_DEFINITION_FIELDS = {"title", "instructions", "response_format", "artifact_template", "artifact_mapping"}


def task_definition(task_type: str) -> TaskDefinition:
    try:
        return TASK_DEFINITIONS[task_type]
    except KeyError as exc:
        raise ValueError(f"Unsupported preparation task: {task_type}") from exc


def task_snapshot(task_type: str, override: Mapping[str, Any] | None = None) -> dict[str, Any]:
    base = task_definition(task_type).snapshot()
    if not override:
        return base
    unknown = set(override) - EDITABLE_DEFINITION_FIELDS - {"version"}
    if unknown:
        raise ValueError(f"Unsupported task definition fields: {sorted(unknown)}")
    candidate = {**base, **dict(override), "task_type": task_type}
    candidate["version"] = int(override.get("version", base["version"]))
    validate_task_snapshot(candidate)
    return candidate


def validate_task_snapshot(snapshot: Mapping[str, Any]) -> None:
    definition = task_definition(str(snapshot.get("task_type") or ""))
    if not str(snapshot.get("title") or "").strip():
        raise ValueError("Task title is required")
    if not str(snapshot.get("instructions") or "").strip():
        raise ValueError("Task instructions are required")
    response = snapshot.get("response_format")
    if not isinstance(response, Mapping) or response.get("type") != "json_object":
        raise ValueError("response_format must describe one JSON object")
    required = response.get("required")
    schema = response.get("schema")
    if not isinstance(required, list) or not all(isinstance(item, str) and item for item in required):
        raise ValueError("response_format.required must be a list of field names")
    if not isinstance(schema, Mapping):
        raise ValueError("response_format.schema must be an object")
    if set(required) - set(schema):
        raise ValueError("Every required response field must be described in response_format.schema")
    if set(definition.fixed_apply_fields) - set(required):
        raise ValueError("Task definition omits fields required by deterministic application")
    mapping = snapshot.get("artifact_mapping") or {}
    if not isinstance(mapping, Mapping):
        raise ValueError("artifact_mapping must be an object")
    if set(mapping) - set(schema):
        raise ValueError("artifact_mapping references unknown response fields")
    if str(snapshot.get("artifact_template") or "") and not mapping:
        raise ValueError("An artifact template requires a result-to-template mapping")


def automatic_task_types() -> tuple[str, ...]:
    return tuple(item.task_type for item in _TASKS if item.automatic)


def sidebar_task_definitions() -> tuple[TaskDefinition, ...]:
    return tuple(item for item in _TASKS if item.sidebar_action)
