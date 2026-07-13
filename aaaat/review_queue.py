from __future__ import annotations

from datetime import datetime
from typing import Any


REVIEW_FIELDS = {
    "pitch": "Draft a short recruiter-call pitch.",
    "risks_to_avoid": "Identify risky claims or topics to avoid.",
    "smart_question": "Suggest one useful question for the recruiter or hiring team.",
    "company_research": "Summarize the company context worth knowing.",
}

RAW_OFFER_FIELDS = {
    "company": "Extract the company name from raw offer text.",
    "role": "Extract the role title from raw offer text.",
    "location": "Extract location and remote arrangement if present.",
    "source_url": "Extract a job-posting URL if one is present.",
    "keywords": "Extract stack, tools, and relevant keywords.",
    "offer_snapshot": "Summarize the role, scope, constraints, and call-relevant facts.",
}


def review_queue(payload: dict[str, Any], application_id: str | None = None) -> list[dict[str, Any]]:
    glossary = {item.get("term"): item for item in payload.get("glossary", [])}
    items: list[dict[str, Any]] = []
    for app in payload.get("applications", []):
        if application_id and app.get("id") != application_id:
            continue
        if _is_raw_offer_placeholder(app):
            for field, action in RAW_OFFER_FIELDS.items():
                items.append(queue_item(app, "raw_offer_extraction", field, f"Raw offer intake needs {field}.", action, priority_for_field(field)))
        for field, action in REVIEW_FIELDS.items():
            if not str(app.get(field) or "").strip():
                items.append(queue_item(app, "missing_field", field, f"Missing {field}.", action, priority_for_field(field)))
        for keyword in app.get("keywords", []):
            definition = glossary.get(keyword, {}).get("definition", "")
            if not str(definition or "").strip():
                items.append(
                    queue_item(
                        app,
                        "missing_keyword_definition",
                        f"keyword:{keyword}",
                        f"Missing glossary definition for {keyword}.",
                        f"Define {keyword} for this application context.",
                        "medium",
                    )
                )
    return items


def _is_raw_offer_placeholder(app: dict[str, Any]) -> bool:
    company = str(app.get("company") or "").strip().lower()
    role = str(app.get("role") or "").strip().lower()
    return company == "pending extraction" or role == "pending role"


def queue_item(app: dict[str, Any], category: str, field: str, reason: str, action: str, priority: str) -> dict[str, Any]:
    return {
        "application_id": app.get("id", ""),
        "company": app.get("company", ""),
        "role": app.get("role", ""),
        "category": category,
        "field": field,
        "reason": reason,
        "recommended_action": action,
        "priority": priority,
    }


def priority_for_field(field: str) -> str:
    return "high" if field in {"company", "role", "pitch", "smart_question", "offer_snapshot"} else "medium"


def missing_review_count(app: dict[str, Any], glossary: dict[str, dict[str, Any]] | None = None) -> int:
    count = sum(1 for field in REVIEW_FIELDS if not str(app.get(field) or "").strip())
    glossary = glossary or {}
    count += sum(1 for keyword in app.get("keywords", []) if not str(glossary.get(keyword, {}).get("definition", "") or "").strip())
    return count


def sorted_applications(applications: list[dict[str, Any]], glossary: list[dict[str, Any]]) -> list[dict[str, Any]]:
    glossary_map = {item.get("term"): item for item in glossary}

    def sort_key(app: dict[str, Any]) -> tuple[int, int, str, str]:
        is_closed = 1 if str(app.get("status") or "active").lower() == "closed" else 0
        missing = missing_review_count(app, glossary_map)
        timestamp = app.get("updated_at") or app.get("created_at") or ""
        return (is_closed, missing, reverse_timestamp(timestamp), app.get("company", ""))

    return sorted(applications, key=sort_key)


def reverse_timestamp(timestamp: str) -> str:
    if not timestamp:
        return "9999"
    try:
        parsed = datetime.fromisoformat(timestamp)
    except ValueError:
        return timestamp
    return f"{9999999999 - int(parsed.timestamp()):010d}"
