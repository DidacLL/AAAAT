from __future__ import annotations

from dataclasses import dataclass


ACTIVE_STATUS = "active"
CLOSED_STATUS = "closed"
ALLOWED_STATUSES = (ACTIVE_STATUS, CLOSED_STATUS)

_TERMINAL_LEGACY_STATUSES = {
    "closed",
    "rejected",
    "withdrawn",
    "archived",
    "hired",
    "accepted",
    "offer accepted",
}


@dataclass(frozen=True)
class CandidatureFieldSpec:
    group: str
    key: str
    label: str
    editable: bool = False
    storage_key: str | None = None
    multiline: bool = False
    read_only_reason: str = ""
    value_kind: str = "text"
    choices: tuple[str, ...] = ()


CANDIDATURE_FIELD_GROUPS = (
    "Overview",
    "Fit and preparation",
    "Recruiter call",
    "Keywords",
    "Material",
    "Source",
)


CANDIDATURE_FIELD_SPECS = (
    CandidatureFieldSpec("Overview", "company", "Company", editable=True, storage_key="company"),
    CandidatureFieldSpec("Overview", "role", "Role", editable=True, storage_key="role"),
    CandidatureFieldSpec("Overview", "status", "State", editable=True, storage_key="status", value_kind="choice", choices=ALLOWED_STATUSES),
    CandidatureFieldSpec("Overview", "priority", "Priority", editable=True, storage_key="priority"),
    CandidatureFieldSpec("Overview", "source", "Source", editable=True, storage_key="source"),
    CandidatureFieldSpec("Overview", "source_url", "Source URL", editable=True, storage_key="source_url", value_kind="url"),
    CandidatureFieldSpec("Overview", "location", "Location", editable=True, storage_key="location"),
    CandidatureFieldSpec("Overview", "remote_mode", "Remote arrangement", editable=True, storage_key="remote_mode"),
    CandidatureFieldSpec("Overview", "salary_expectation", "Compensation", editable=True, storage_key="salary_expectation"),
    CandidatureFieldSpec("Overview", "publication_date", "Publication date", editable=True, storage_key="publication_date", value_kind="date"),
    CandidatureFieldSpec("Overview", "application_date", "Application date", editable=True, storage_key="application_date", value_kind="date"),
    CandidatureFieldSpec("Overview", "notes", "Notes", editable=True, storage_key="notes", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Overview", "description", "Job description", editable=True, storage_key="description", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Overview", "offer_snapshot", "Short offer summary", editable=True, storage_key="offer_snapshot", multiline=True, value_kind="multiline"),

    CandidatureFieldSpec("Fit and preparation", "candidature_evaluation", "Fit assessment", editable=True, storage_key="candidature_evaluation", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Fit and preparation", "role_strategy", "Application strategy", editable=True, storage_key="role_strategy", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Fit and preparation", "strengths", "Relevant strengths", editable=True, storage_key="strengths", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Fit and preparation", "risks_to_avoid", "Risks / material to avoid", editable=True, storage_key="risks_to_avoid", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Fit and preparation", "questions_to_ask", "Useful questions", editable=True, storage_key="questions_to_ask", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Fit and preparation", "tech_stack", "Technical stack", editable=True, storage_key="tech_stack", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Fit and preparation", "valuation", "Fit score /100", editable=True, storage_key="valuation", value_kind="summary"),
    CandidatureFieldSpec("Fit and preparation", "company_research", "Company research", editable=True, storage_key="company_research", multiline=True, value_kind="multiline"),

    CandidatureFieldSpec("Recruiter call", "call_signals", "Recognition signals", editable=True, storage_key="call_signals", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Recruiter call", "pitch", "Pitch", editable=True, storage_key="pitch", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Recruiter call", "smart_question", "Question to ask", editable=True, storage_key="smart_question", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Recruiter call", "recruiter_material", "Interview / recruiter notes", editable=True, storage_key="recruiter_material", multiline=True, value_kind="multiline"),

    CandidatureFieldSpec("Keywords", "keywords", "Keywords", editable=True, storage_key="keywords", multiline=True, value_kind="tags"),

    CandidatureFieldSpec("Material", "form_answers", "Application-form answers", editable=True, storage_key="form_answers", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Material", "cv_material", "CV material", editable=True, storage_key="cv_material", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Material", "cover_letter_material", "Cover-letter material", editable=True, storage_key="cover_letter_material", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Material", "material_sent_notes", "Material already sent", editable=True, storage_key="material_sent_notes", multiline=True, value_kind="multiline"),

    CandidatureFieldSpec("Source", "source_text", "Raw job offer / source material", editable=True, storage_key="source_text", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Source", "raw_application_form", "Original application form", editable=True, storage_key="raw_application_form", multiline=True, value_kind="multiline"),
)


MEANINGFUL_PROJECTED_FIELD_KEYS = frozenset(spec.key for spec in CANDIDATURE_FIELD_SPECS)
WRITABLE_CANDIDATURE_STORAGE_KEYS = frozenset(
    spec.storage_key for spec in CANDIDATURE_FIELD_SPECS if spec.editable and spec.storage_key
)


def normalize_candidature_status(value: object) -> str:
    text = str(value or "").strip().lower().replace("_", "-")
    return CLOSED_STATUS if text in _TERMINAL_LEGACY_STATUSES else ACTIVE_STATUS


def validate_candidature_field_policy() -> None:
    seen_keys: set[str] = set()
    seen_storage_keys: set[str] = set()
    valid_kinds = {"text", "multiline", "tags", "url", "choice", "date", "timestamp", "boolean", "summary"}
    for spec in CANDIDATURE_FIELD_SPECS:
        if spec.group not in CANDIDATURE_FIELD_GROUPS:
            raise ValueError(f"Unknown candidature field group: {spec.group}")
        if spec.key in seen_keys:
            raise ValueError(f"Duplicate candidature field key: {spec.key}")
        seen_keys.add(spec.key)
        if spec.value_kind not in valid_kinds:
            raise ValueError(f"Unsupported candidature value kind: {spec.value_kind}")
        if spec.editable:
            if not spec.storage_key:
                raise ValueError(f"Editable field {spec.key} requires a storage key")
            if spec.storage_key in seen_storage_keys:
                raise ValueError(f"Duplicate writable storage key: {spec.storage_key}")
            seen_storage_keys.add(spec.storage_key)
        elif not spec.read_only_reason:
            raise ValueError(f"Read-only field {spec.key} requires a reason")
