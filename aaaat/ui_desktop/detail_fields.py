from __future__ import annotations

from typing import Any

from aaaat.candidature_fields import (
    CANDIDATURE_FIELD_GROUPS,
    CANDIDATURE_FIELD_SPECS,
    MEANINGFUL_PROJECTED_FIELD_KEYS,
    WRITABLE_CANDIDATURE_STORAGE_KEYS,
    CandidatureFieldSpec as DetailFieldSpec,
)


FIELD_GROUPS = list(CANDIDATURE_FIELD_GROUPS)
DETAIL_FIELD_SPECS = list(CANDIDATURE_FIELD_SPECS)
WRITABLE_DETAIL_STORAGE_KEYS = set(WRITABLE_CANDIDATURE_STORAGE_KEYS)


def build_detail_record(projection: dict[str, Any]) -> dict[str, Any]:
    detailed = projection.get("detailed") or {}
    smart = projection.get("smart") or {}
    row = detailed.get("selected_row") or {}
    selected = smart.get("selected_candidature_detail") or {}
    primary_note = smart.get("primary_note") or {}
    source_text = smart.get("source_text") or {}
    artifact_summary = detailed.get("artifact_summary") or {}
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
                "value_kind": spec.value_kind,
                "choices": spec.choices,
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
        return ", ".join(str(item) for item in value)
    return str(value)
