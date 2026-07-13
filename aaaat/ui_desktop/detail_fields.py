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


FIELD_GROUPS = (
    "Identity",
    "Logistics",
    "Workflow",
    "Call preparation",
    "Offer and compensation",
    "Research and context",
    "Application material",
    "Provenance",
)

DETAIL_FIELD_SPECS = (
    DetailFieldSpec("Identity", "company", "Company", "company"),
    DetailFieldSpec("Identity", "role", "Role", "role"),
    DetailFieldSpec("Identity", "description", "Role description", "description", True),
    DetailFieldSpec("Identity", "keywords", "Keywords", "keywords", True),
    DetailFieldSpec("Identity", "tech_stack", "Technical stack", "tech_stack", True),
    DetailFieldSpec("Logistics", "location", "Location", "location"),
    DetailFieldSpec("Logistics", "remote_mode", "Remote mode", "remote_mode"),
    DetailFieldSpec("Logistics", "salary_expectation", "Salary / compensation", "salary_expectation"),
    DetailFieldSpec("Logistics", "publication_date", "Publication date", "publication_date"),
    DetailFieldSpec("Logistics", "application_date", "Application date", "application_date"),
    DetailFieldSpec("Logistics", "source", "Source", "source"),
    DetailFieldSpec("Logistics", "source_url", "Source URL", "source_url"),
    DetailFieldSpec("Workflow", "status", "Status", "status"),
    DetailFieldSpec("Workflow", "priority", "Priority", "priority"),
    DetailFieldSpec("Workflow", "next_action", "Next action", "next_action", True),
    DetailFieldSpec("Workflow", "valuation", "Valuation", "valuation"),
    DetailFieldSpec("Call preparation", "call_signals", "Call signals", "call_signals", True),
    DetailFieldSpec("Call preparation", "pitch", "Pitch", "pitch", True),
    DetailFieldSpec("Call preparation", "smart_question", "Primary question", "smart_question", True),
    DetailFieldSpec("Call preparation", "risks_to_avoid", "Risks to avoid", "risks_to_avoid", True),
    DetailFieldSpec("Call preparation", "questions_to_ask", "Questions to ask", "questions_to_ask", True),
    DetailFieldSpec("Call preparation", "prepare_first", "Prepare first", "prepare_first", True),
    DetailFieldSpec("Call preparation", "prepare_later", "Prepare later", "prepare_later", True),
    DetailFieldSpec("Call preparation", "strengths", "Strengths / fit", "strengths", True),
    DetailFieldSpec("Call preparation", "technical_reading", "Technical reading", "technical_reading", True),
    DetailFieldSpec("Offer and compensation", "offer_snapshot", "Offer summary", "offer_snapshot", True),
    DetailFieldSpec("Offer and compensation", "source_text", "Original offer text", "source_text", True),
    DetailFieldSpec("Research and context", "company_research", "Company research", "company_research", True),
    DetailFieldSpec("Application material", "raw_application_form", "Application form", "raw_application_form", True),
    DetailFieldSpec("Application material", "form_answers", "Form answers", "form_answers", True),
    DetailFieldSpec("Application material", "artifacts_items", "Artifacts"),
    DetailFieldSpec("Provenance", "ref", "Candidature reference"),
    DetailFieldSpec("Provenance", "created_at", "Created"),
    DetailFieldSpec("Provenance", "updated_at", "Updated"),
    DetailFieldSpec("Provenance", "source_length", "Source length"),
)

WRITABLE_DETAIL_STORAGE_KEYS = {spec.storage_key for spec in DETAIL_FIELD_SPECS if spec.storage_key}


def build_detail_record(projection: dict[str, Any], record: dict[str, Any] | None = None) -> dict[str, Any]:
    if record is not None:
        result = dict(record)
    else:
        detailed = projection.get("detailed") or {}
        smart = projection.get("smart") or {}
        result = dict(detailed.get("selected_row") or {})
        result.update(smart.get("selected_candidature_detail") or {})
        result["notes"] = str((smart.get("primary_note") or {}).get("body") or result.get("notes") or "")
        result["source_text"] = str((smart.get("source_text") or {}).get("body") or result.get("source_text") or "")
        result["company_research"] = str((smart.get("company_research") or {}).get("body") or result.get("company_research") or "")
        result["form_answers"] = str((smart.get("form_answers") or {}).get("body") or result.get("form_answers") or "")
        result["artifacts_items"] = _artifact_items((smart.get("artifact_summary") or {}).get("items") or [])
    details = result.get("details")
    if isinstance(details, dict):
        result.update(details)
    if "risk_to_avoid" in result and "risks_to_avoid" not in result:
        result["risks_to_avoid"] = result.get("risk_to_avoid")
    result["keywords"] = _string_value(result.get("keywords"))
    result["artifacts_items"] = result.get("artifacts_items") or _artifact_items(result.get("artifacts") or [])
    result["source_length"] = result.get("source_length") or len(str(result.get("source_text") or ""))
    return result


def grouped_detail_fields(projection: dict[str, Any], record: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    resolved = build_detail_record(projection, record)
    return [
        {
            "title": group,
            "fields": [
                {
                    "key": spec.key,
                    "label": spec.label,
                    "value": _string_value(resolved.get(spec.key)),
                    "editable": spec.editable,
                    "storage_key": spec.storage_key,
                    "multiline": spec.multiline,
                }
                for spec in DETAIL_FIELD_SPECS
                if spec.group == group
            ],
        }
        for group in FIELD_GROUPS
    ]


def collect_writable_changes(
    original_values: dict[str, str],
    current_values: dict[str, str],
    field_map: dict[str, str | None],
) -> dict[str, str]:
    return {
        storage_key: current
        for field_key, current in current_values.items()
        if (storage_key := field_map.get(field_key)) and current != original_values.get(field_key, "")
    }


def unrepresented_meaningful_fields(projection: dict[str, Any]) -> set[str]:
    rendered = {spec.key for spec in DETAIL_FIELD_SPECS}
    return set(build_detail_record(projection)) - rendered - {"details", "artifacts", "tasks", "todos", "notes_records", "text_blobs", "domain_type"}


def _artifact_items(items: list[Any]) -> str:
    rows = []
    for item in items:
        if isinstance(item, dict):
            rows.append(" · ".join(str(value) for value in (item.get("artifact_type"), item.get("label"), item.get("review_state")) if value))
        elif str(item).strip():
            rows.append(str(item))
    return "\n".join(rows)


def _string_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if str(item).strip())
    return str(value)
