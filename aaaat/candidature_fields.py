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
    "Identity",
    "Logistics",
    "Workflow",
    "Notes and call prep",
    "Research and context",
    "Artifacts and generated material",
    "Offer and compensation",
    "Raw/source",
)


CANDIDATURE_FIELD_SPECS = (
    CandidatureFieldSpec("Identity", "ref", "Candidature ref", read_only_reason="Internal identifier", value_kind="summary"),
    CandidatureFieldSpec("Identity", "company", "Company", editable=True, storage_key="company"),
    CandidatureFieldSpec("Identity", "role", "Role", editable=True, storage_key="role"),
    CandidatureFieldSpec("Identity", "keywords", "Keywords", editable=True, storage_key="keywords", multiline=True, value_kind="tags"),
    CandidatureFieldSpec("Logistics", "location", "Location", editable=True, storage_key="location"),
    CandidatureFieldSpec("Logistics", "remote_mode", "Remote", editable=True, storage_key="remote_mode"),
    CandidatureFieldSpec("Logistics", "source", "Source label", editable=True, storage_key="source"),
    CandidatureFieldSpec("Logistics", "source_url", "Source URL", editable=True, storage_key="source_url", value_kind="url"),
    CandidatureFieldSpec("Workflow", "status", "Status", editable=True, storage_key="status", value_kind="choice", choices=ALLOWED_STATUSES),
    CandidatureFieldSpec("Workflow", "priority", "Priority", editable=True, storage_key="priority"),
    CandidatureFieldSpec("Workflow", "next_action", "Next action", editable=True, storage_key="next_action", multiline=True),
    CandidatureFieldSpec("Workflow", "deadline", "Next date", read_only_reason="Projected date field has no safe local write target yet", value_kind="date"),
    CandidatureFieldSpec("Workflow", "last_contact", "Last activity", read_only_reason="Projected activity timestamp/context", value_kind="timestamp"),
    CandidatureFieldSpec("Workflow", "task_queue", "Task queue", read_only_reason="Derived task summary", value_kind="summary"),
    CandidatureFieldSpec("Notes and call prep", "notes", "Notes", editable=True, storage_key="notes", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Notes and call prep", "call_signals", "Call signals", editable=True, storage_key="call_signals", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Notes and call prep", "pitch", "Pitch", editable=True, storage_key="pitch", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Notes and call prep", "smart_question", "Smart question", editable=True, storage_key="smart_question", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Notes and call prep", "risk_to_avoid", "Risk to avoid", editable=True, storage_key="risks_to_avoid", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Notes and call prep", "prepare_first", "Prepare first", editable=True, storage_key="prepare_first", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Notes and call prep", "prepare_later", "Prepare later", editable=True, storage_key="prepare_later", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Research and context", "company_research", "Company research", editable=True, storage_key="company_research", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Research and context", "form_answers", "Form answers", editable=True, storage_key="form_answers", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Artifacts and generated material", "artifacts_state", "Artifacts state", read_only_reason="Generated artifact metadata", value_kind="summary"),
    CandidatureFieldSpec("Artifacts and generated material", "artifacts_count", "Artifacts count", read_only_reason="Derived artifact count", value_kind="summary"),
    CandidatureFieldSpec("Artifacts and generated material", "artifacts_items", "Artifacts", read_only_reason="Generated artifact metadata", value_kind="multiline"),
    CandidatureFieldSpec("Offer and compensation", "offer_snapshot", "Offer snapshot", editable=True, storage_key="offer_snapshot", multiline=True, value_kind="multiline"),
    CandidatureFieldSpec("Raw/source", "source_excerpt", "Source excerpt", read_only_reason="Projected source evidence excerpt", value_kind="multiline"),
    CandidatureFieldSpec("Raw/source", "source_text", "Raw/source text", read_only_reason="Immutable source evidence", value_kind="multiline"),
    CandidatureFieldSpec("Raw/source", "source_length", "Source length", read_only_reason="Derived source length", value_kind="summary"),
    CandidatureFieldSpec("Raw/source", "source_has_raw", "Has raw intake", read_only_reason="Source provenance", value_kind="boolean"),
    CandidatureFieldSpec("Raw/source", "created_at", "Created", read_only_reason="Timestamp", value_kind="timestamp"),
    CandidatureFieldSpec("Raw/source", "updated_at", "Updated", read_only_reason="Timestamp", value_kind="timestamp"),
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
