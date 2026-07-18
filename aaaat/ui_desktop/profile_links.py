from __future__ import annotations

import json
from typing import Any

LEGACY_LINK_KEYS = (
    ("profile.linkedin_url", "LinkedIn"),
    ("profile.github_url", "GitHub"),
    ("profile.portfolio_url", "Portfolio"),
)


def parse_profile_links(value: Any) -> list[dict[str, str]]:
    if isinstance(value, list):
        raw = value
    else:
        text = str(value or "").strip()
        if not text:
            return []
        try:
            raw = json.loads(text)
        except (TypeError, ValueError, json.JSONDecodeError):
            return []
    result: list[dict[str, str]] = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        description = str(item.get("description") or "").strip()
        url = str(item.get("url") or "").strip()
        if name or description or url:
            result.append({"name": name, "description": description, "url": url})
    return result


def serialize_profile_links(items: list[dict[str, Any]]) -> str:
    cleaned = parse_profile_links(items)
    return json.dumps(cleaned, ensure_ascii=False, separators=(",", ":"))


def profile_links_from_variables(values: dict[str, Any]) -> list[dict[str, str]]:
    current = parse_profile_links(values.get("profile.links"))
    if current:
        return current
    legacy: list[dict[str, str]] = []
    for key, label in LEGACY_LINK_KEYS:
        url = str(values.get(key) or "").strip()
        if url:
            legacy.append({"name": label, "description": "", "url": url})
    return legacy
