from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class DetailFieldSpec:
    group: str
    key: str
    label: str
    editable: bool = False
    storage_key: str | None = None
    multiline: bool = False
    read_only_reason: str = ""


FIELD_GROUPS = [
    "Identity",
    "Logistics",
    "Workflow",
    "Notes and call prep",
    "Research and context",
    "Artifacts and generated material",
    "Offer and compensation",
    "Raw/source",
]

DETAIL_FIELD_SPECS = [
    DetailFieldSpec("Identity", "ref", "Candidature ref", read_only_reason="Internal identifier"),
    DetailFieldSpec("Identity", "company", "Company", editable=True, storage_key="company"),
    DetailFieldSpec("Identity", "role", "Role", editable=True, storage_key="role"),
    DetailFieldSpec("Identity", "keywords", "Keywords", editable=True, storage_key="keywords", multiline=True),
    DetailFieldSpec("Logistics", "location", "Location", editable=True, storage_key="location"),
    DetailFieldSpec("Logistics", "remote_mode", "Remote", editable=True, storage_key="remote_mode"),
    DetailFieldSpec("Logistics", "source", "Source label", editable=True, storage_key="source"),
    DetailFieldSpec("Logistics", "source_url", "Source URL", editable=True, storage_key="source_url"),
    DetailFieldSpec("Workflow", "status", "Status", editable=True, storage_key="status"),
    DetailFieldSpec("Workflow", "priority", "Priority", editable=True, storage_key="priority"),
    DetailFieldSpec("Workflow", "next_action", "Next action", editable=True, storage_key="next_action", multiline=True),
    DetailFieldSpec("Workflow", "deadline", "Next date", read_only_reason="Projected date field has no safe local write target yet"),
    DetailFieldSpec("Workflow", "last_contact", "Last activity", read_only_reason="Projected activity timestamp/context"),
    DetailFieldSpec("Workflow", "task_queue", "Task queue", read_only_reason="Derived review queue summary"),
    DetailFieldSpec("Notes and call prep", "notes", "Notes", editable=True, storage_key="notes", multiline=True),
    DetailFieldSpec("Notes and call prep", "call_signals", "Call signals", editable=True, storage_key="call_signals", multiline=True),
    DetailFieldSpec("Notes and call prep", "pitch", "Pitch", editable=True, storage_key="pitch", multiline=True),
    DetailFieldSpec("Notes and call prep", "smart_question", "Smart question", editable=True, storage_key="smart_question", multiline=True),
    DetailFieldSpec("Notes and call prep", "risk_to_avoid", "Risk to avoid", editable=True, storage_key="risks_to_avoid", multiline=True),
    DetailFieldSpec("Notes and call prep", "prepare_first", "Prepare first", editable=True, storage_key="prepare_first", multiline=True),
    DetailFieldSpec("Notes and call prep", "prepare_later", "Prepare later", editable=True, storage_key="prepare_later", multiline=True),
    DetailFieldSpec("Research and context", "company_research", "Company research", editable=True, storage_key="company_research", multiline=True),
    DetailFieldSpec("Research and context", "form_answers", "Form answers", editable=True, storage_key="form_answers", multiline=True),
    DetailFieldSpec("Artifacts and generated material", "artifacts_state", "Artifacts state", read_only_reason="Generated artifact metadata"),
    DetailFieldSpec("Artifacts and generated material", "artifacts_count", "Artifacts count", read_only_reason="Derived artifact count"),
    DetailFieldSpec("Artifacts and generated material", "artifacts_items", "Artifacts", read_only_reason="Generated artifact metadata"),
    DetailFieldSpec("Offer and compensation", "offer_snapshot", "Offer snapshot", editable=True, storage_key="offer_snapshot", multiline=True),
    DetailFieldSpec("Raw/source", "source_excerpt", "Source excerpt", read_only_reason="Projected source evidence excerpt"),
    DetailFieldSpec("Raw/source", "source_text", "Raw/source text", read_only_reason="Immutable source evidence"),
    DetailFieldSpec("Raw/source", "source_length", "Source length", read_only_reason="Derived source length"),
    DetailFieldSpec("Raw/source", "source_has_raw", "Has raw intake", read_only_reason="Source provenance"),
    DetailFieldSpec("Raw/source", "created_at", "Created", read_only_reason="Timestamp"),
    DetailFieldSpec("Raw/source", "updated_at", "Updated", read_only_reason="Timestamp"),
]

MEANINGFUL_PROJECTED_FIELD_KEYS = {spec.key for spec in DETAIL_FIELD_SPECS}
WRITABLE_DETAIL_STORAGE_KEYS = {spec.storage_key for spec in DETAIL_FIELD_SPECS if spec.editable and spec.storage_key}


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
    task_queue = detailed.get("task_queue_summary") or {}

    record: dict[str, Any] = {}
    record.update(row)
    record.update(selected)
    record["ref"] = selected.get("ref") or row.get("ref")
    record["keywords"] = _keywords(selected.get("keywords") or row.get("keywords"))
    record["notes"] = primary_note.get("body") or row.get("notes_excerpt") or ""
    record["company_research"] = company_research.get("body") or ""
    record["form_answers"] = form_answers.get("body") or ""
    record["source_text"] = source_text.get("body") or selected.get("source_text") or ""
    record["source_excerpt"] = source_text.get("excerpt") or selected.get("source_excerpt") or row.get("source_excerpt") or ""
    record["source_length"] = source_text.get("length") if source_text.get("length") is not None else selected.get("source_length") or ""
    record["source_has_raw"] = source_text.get("has_raw") if source_text.get("has_raw") is not None else ""
    record["artifacts_count"] = artifact_summary.get("count", 0)
    record["artifacts_state"] = artifact_summary.get("state") or row.get("artifacts_state") or ""
    record["artifacts_items"] = _artifact_items(artifact_summary.get("items") or [])
    record["task_queue"] = _task_queue(task_queue)
    return record


def grouped_detail_fields(projection: dict[str, Any]) -> list[dict[str, Any]]:
    record = build_detail_record(projection)
    groups: list[dict[str, Any]] = []
    for group_name in FIELD_GROUPS:
        fields = []
        for spec in DETAIL_FIELD_SPECS:
            if spec.group != group_name:
                continue
            fields.append({
                "key": spec.key,
                "label": spec.label,
                "value": _string_value(record.get(spec.key)),
                "editable": spec.editable,
                "storage_key": spec.storage_key,
                "multiline": spec.multiline,
                "read_only_reason": spec.read_only_reason,
            })
        groups.append({"title": group_name, "fields": fields})
    return groups


def collect_writable_changes(original_values: dict[str, str], current_values: dict[str, str], field_map: dict[str, str | None]) -> dict[str, str]:
    changes: dict[str, str] = {}
    for field_key, current in current_values.items():
        storage_key = field_map.get(field_key)
        if not storage_key:
            continue
        if current != original_values.get(field_key, ""):
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


def _task_queue(summary: dict[str, Any]) -> str:
    groups = summary.get("groups") or {}
    parts = [f"{key}: {value}" for key, value in groups.items()]
    if parts:
        return f"{summary.get('count', 0)} items · " + ", ".join(parts)
    return f"{summary.get('count', 0)} items"


def _string_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, list):
        return _keywords(value)
    return str(value)
