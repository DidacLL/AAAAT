from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True)
class TaskDefinition:
    task_type: str
    title: str
    action_label: str
    description: str
    instructions: str
    priority: str = "normal"
    automatic: bool = False
    context_hint: str = ""


_TASKS = (
    TaskDefinition(
        "field_inference",
        "Analyse job offer",
        "Analyse offer",
        "Extract every supported candidature field present in the offer and prepare operational call/interview material.",
        "Extract all supported candidature fields from the supplied offer. Preserve explicit user values. Include company, role, description, source, URL, location, remote mode, salary, publication/application dates, technical stack, keywords, strengths, risks, questions, call signals, pitch, preparation, next action, offer summary and valuation when supported by the source.",
        priority="high",
        automatic=True,
        context_hint="candidature:field_inference",
    ),
    TaskDefinition(
        "company_research",
        "Research company and role",
        "Research company",
        "Prepare company, product, market, engineering, culture, recruiter-call and role-risk context.",
        "Research the company and role using only the bounded context and sources available to the configured runner. Return concise, candidature-specific research useful for deciding, applying and interviewing.",
        automatic=True,
        context_hint="candidature:company_research",
    ),
    TaskDefinition(
        "career_plan_review",
        "Evaluate career-path fit",
        "Evaluate career fit",
        "Evaluate strategic fit, trade-offs, gaps, growth potential and priority against the user's career path.",
        "Evaluate this candidature against the bounded career-plan and professional context. Return fit, gaps, trade-offs, growth potential, risks, priority and concrete next actions.",
        automatic=True,
        context_hint="candidature:career_plan_review",
    ),
    TaskDefinition(
        "draft_form_responses",
        "Prepare application answers",
        "Prepare form answers",
        "Prepare answers only when an application form or explicit questions are present.",
        "Draft application-form responses from the bounded candidature and professional context. Do not invent facts.",
        context_hint="blob:form_responses",
    ),
    TaskDefinition(
        "draft_cv",
        "Prepare tailored CV",
        "Prepare CV",
        "Optional candidature-specific CV adaptation.",
        "Prepare CV positioning and adaptation content using only bounded candidature and professional context.",
        context_hint="artifact:cv",
    ),
    TaskDefinition(
        "draft_cover_letter",
        "Prepare cover letter",
        "Prepare cover letter",
        "Optional cover-letter content when required for this candidature.",
        "Draft a cover-letter body using only bounded candidature and professional context.",
        context_hint="artifact:cover_letter",
    ),
    TaskDefinition(
        "keyword_definition",
        "Define missing keyword",
        "Define keyword",
        "Define an extracted keyword that is not yet present in the global glossary.",
        "Define the keyword in clear operational language for this job-search context.",
        context_hint="keyword:",
    ),
)

TASK_DEFINITIONS: Mapping[str, TaskDefinition] = {item.task_type: item for item in _TASKS}


def task_definition(task_type: str) -> TaskDefinition:
    try:
        return TASK_DEFINITIONS[task_type]
    except KeyError as exc:
        raise ValueError(f"Unsupported preparation task: {task_type}") from exc


def automatic_task_types() -> tuple[str, ...]:
    return tuple(item.task_type for item in _TASKS if item.automatic)


def sidebar_task_definitions() -> tuple[TaskDefinition, ...]:
    return tuple(item for item in _TASKS if item.task_type != "keyword_definition")
