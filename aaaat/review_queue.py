from __future__ import annotations

import re
from datetime import datetime
from typing import Any


REVIEW_FIELDS = {
    "pitch": "Draft a short recruiter-call pitch.",
    "risks_to_avoid": "Identify risky claims or topics to avoid.",
    "smart_question": "Suggest one useful question for the recruiter or hiring team.",
    "prepare_first": "List the first preparation item before a call.",
    "company_research": "Summarize the company context worth knowing.",
}

RAW_OFFER_FIELDS = {
    "company": "Extract the company name from raw offer text.",
    "role": "Extract the role title from raw offer text.",
    "source": "Identify the source or job board if present.",
    "location": "Extract location or remote mode if present.",
    "keywords": "Extract stack, tools, and relevant keywords.",
    "timing_hints": "Extract deadline, interview, follow-up, or offer timing hints.",
    "recommendations": "Draft initial recommendations for next action and preparation.",
}

STATUS_PRIORITY = {
    "interview": 0,
    "screening": 1,
    "applied": 2,
    "draft": 3,
    "archived": 9,
}

DATE_RE = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")


def review_queue(payload: dict[str, Any], application_id: str | None = None) -> list[dict[str, Any]]:
    glossary = {item.get("term"): item for item in payload.get("glossary", [])}
    items: list[dict[str, Any]] = []
    for app in payload.get("applications", []):
        if application_id and app.get("id") != application_id:
            continue
        if str(app.get("status") or "").lower() == "intake":
            for field, action in RAW_OFFER_FIELDS.items():
                items.append(queue_item(app, "raw_offer_extraction", field, f"Raw offer intake needs {field}.", action, "high"))
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
    return "high" if field in {"pitch", "smart_question", "prepare_first"} else "medium"


def missing_review_count(app: dict[str, Any], glossary: dict[str, dict[str, Any]] | None = None) -> int:
    count = sum(1 for field in REVIEW_FIELDS if not str(app.get(field) or "").strip())
    glossary = glossary or {}
    count += sum(1 for keyword in app.get("keywords", []) if not str(glossary.get(keyword, {}).get("definition", "") or "").strip())
    return count


def next_action_date(app: dict[str, Any]) -> str:
    match = DATE_RE.search(str(app.get("next_action") or ""))
    return match.group(1) if match else ""


def sorted_applications(applications: list[dict[str, Any]], glossary: list[dict[str, Any]]) -> list[dict[str, Any]]:
    glossary_map = {item.get("term"): item for item in glossary}

    def sort_key(app: dict[str, Any]) -> tuple[int, str, int, int, str]:
        date = next_action_date(app)
        timestamp = app.get("updated_at") or app.get("created_at") or ""
        status = STATUS_PRIORITY.get(str(app.get("status") or "").lower(), 5)
        missing = missing_review_count(app, glossary_map)
        return (0 if date else 1, date or reverse_timestamp(timestamp), status, missing, app.get("company", ""))

    return sorted(applications, key=sort_key)


def reverse_timestamp(timestamp: str) -> str:
    if not timestamp:
        return "9999"
    try:
        parsed = datetime.fromisoformat(timestamp)
    except ValueError:
        return timestamp
    return f"{9999999999 - int(parsed.timestamp()):010d}"
