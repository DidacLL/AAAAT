from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class DetailFieldSpec:
    group: str
    key: str
    label: str
    storage_key: str | None = None
    multiline: bool = False

    @property
    def editable(self) -> bool:
        return self.storage_key is not None


FIELD_GROUPS = [
    "Identity",
    "Logistics",
    "Workflow",
    "Notes and call prep",
    "Research and context",
    "Offer and compensation",
    "Artifacts",
    "Source and history",
]

DETAIL_FIELD_SPECS = [
    DetailFieldSpec("Identity", "company", "Company", "company"),
    DetailFieldSpec("Identity", "role", "Role", "role"),
    DetailFieldSpec("Identity", "keywords", "Keywords", "keywords", True),
    DetailFieldSpec("Identity", "description", "Description", "description", True),
    DetailFieldSpec("Logistics", "location", "Location", "location"),
    DetailFieldSpec("Logistics", "remote_mode", "Remote", "remote_mode"),
    DetailFieldSpec("Logistics", "source", "Source", "source"),
    DetailFieldSpec("Logistics", "source_url", "Source URL", "source_url"),
    DetailFieldSpec("Logistics", "salary_expectation", "Salary", "salary_expectation"),
    DetailFieldSpec("Logistics", "publication_date", "Published", "publication_date"),
    DetailFieldSpec("Logistics", "application_date", "Applied", "application_date"),
    DetailFieldSpec("Workflow", "status", "Status", "status"),
    DetailFieldSpec("Workflow", "priority", "Priority", "priority"),
    DetailFieldSpec("Workflow", "next_action", "Next action", "next_action", True),
    DetailFieldSpec("Workflow", "valuation", "Valuation", "valuation"),
    DetailFieldSpec("Notes and call prep", "notes", "Notes", "notes", True),
    DetailFieldSpec("Notes and call prep", "call_signals", "Recognition signals", "call_signals", True),
    DetailFieldSpec("Notes and call prep", "pitch", "Pitch", "pitch", True),
    DetailFieldSpec("Notes and call prep", "smart_question", "Smart question", "smart_question", True),
    DetailFieldSpec("Notes and call prep", "risk_to_avoid", "Risks to avoid", "risks_to_avoid", True),
    DetailFieldSpec("Notes and call prep", "questions_to_ask", "Questions to ask", "questions_to_ask", True),
    DetailFieldSpec("Notes and call prep", "strengths", "Strengths", "strengths", True),
    DetailFieldSpec("Notes and call prep", "prepare_first", "Prepare first", "prepare_first", True),
    DetailFieldSpec("Notes and call prep", "prepare_later", "Prepare later", "prepare_later", True),
    DetailFieldSpec("Research and context", "technical_reading", "Technical reading", "technical_reading", True),
    DetailFieldSpec("Research and context", "tech_stack", "Technical stack", "tech_stack", True),
    DetailFieldSpec("Research and context", "company_research", "Company research", "company_research", True),
    DetailFieldSpec("Research and context", "form_answers", "Form answers", "form_answers", True),
    DetailFieldSpec("Research and context", "raw_application_form", "Application form", "raw_application_form", True),
    DetailFieldSpec("Offer and compensation", "offer_snapshot", "Offer summary", "offer_snapshot", True),
    DetailFieldSpec("Artifacts", "artifacts_state", "Artifact status"),
    DetailFieldSpec("Artifacts", "artifacts_items", "Registered artifacts", multiline=True),
    DetailFieldSpec("Source and history", "source_text", "Original offer text", "source_text", True),
    DetailFieldSpec("Source and history", "created_at", "Created"),
    DetailFieldSpec("Source and history", "updated_at", "Updated"),
    DetailFieldSpec("Source and history", "ref", "Internal reference"),
]

MEANINGFUL_PROJECTED_FIELD_KEYS = {spec.key for spec in DETAIL_FIELD_SPECS}
WRITABLE_DETAIL_STORAGE_KEYS = {spec.storage_key for spec in DETAIL_FIELD_SPECS if spec.storage_key}


def build_detail_record(projection: dict[str, Any]) -> dict[str, Any]:
    detailed = projection.get("detailed") or {}
    smart = projection.get("smart") or {}
    row = detailed.get("selected_row") or {}
    selected = smart.get("selected_candidature_detail") or {}
    primary_note = smart.get("primary_note") or {}
    source_text = smart.get("source_text") or {}
    artifact_summary = smart.get("artifact_summary") or {}
    company_research = smart.get("company_research") or {}
    form_answers = smart.get("form_answers") or {}

    record: dict[str, Any] = {}
    record.update(row)
    record.update(selected)
    details = selected.get("details") or {}
    if isinstance(details, dict):
        record.update(details)
    record["ref"] = selected.get("ref") or row.get("ref")
    record["keywords"] = _keywords(selected.get("keywords") or row.get("keywords"))
    record["notes"] = primary_note.get("body") or row.get("notes_excerpt") or ""
    record["company_research"] = company_research.get("body") or record.get("company_research") or ""
    record["form_answers"] = form_answers.get("body") or record.get("form_answers") or ""
    record["source_text"] = source_text.get("body") or selected.get("source_text") or ""
    record["artifacts_state"] = artifact_summary.get("state") or row.get("artifacts_state") or ""
    record["artifacts_items"] = _artifact_items(artifact_summary.get("items") or [])
    return record


def grouped_detail_fields(projection: dict[str, Any]) -> list[dict[str, Any]]:
    record = build_detail_record(projection)
    groups: list[dict[str, Any]] = []
    for group_name in FIELD_GROUPS:
        fields = []
        for spec in DETAIL_FIELD_SPECS:
            if spec.group != group_name:
                continue
            fields.append(
                {
                    "key": spec.key,
                    "label": spec.label,
                    "value": _string_value(record.get(spec.key)),
                    "editable": spec.editable,
                    "storage_key": spec.storage_key,
                    "multiline": spec.multiline,
                }
            )
        groups.append({"title": group_name, "fields": fields})
    return groups


def collect_writable_changes(
    original_values: dict[str, str],
    current_values: dict[str, str],
    field_map: dict[str, str | None],
) -> dict[str, str]:
    changes: dict[str, str] = {}
    for field_key, current in current_values.items():
        storage_key = field_map.get(field_key)
        if storage_key and current != original_values.get(field_key, ""):
            changes[storage_key] = current
    return changes


def unrepresented_meaningful_fields(projection: dict[str, Any]) -> set[str]:
    record_keys = set(build_detail_record(projection)) & MEANINGFUL_PROJECTED_FIELD_KEYS
    rendered_keys = {field["key"] for group in grouped_detail_fields(projection) for field in group["fields"]}
    return record_keys - rendered_keys


def _keywords(value: Any) -> str:
    if isinstance(value, str):
        return value
    return ", ".join(str(item) for item in (value or []) if str(item).strip())


def _artifact_items(items: list[Any]) -> str:
    labels = []
    for item in items:
        if isinstance(item, dict):
            labels.append(" · ".join(str(part) for part in (item.get("artifact_type"), item.get("label")) if part))
        else:
            labels.append(str(item))
    return "\n".join(label for label in labels if label)


def _string_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, list):
        return _keywords(value)
    return str(value)
