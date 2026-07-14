from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class UserVariableSpec:
    group: str
    key: str
    label: str
    multiline: bool = False


FIELD_GROUPS = [
    "Identity",
    "Professional links",
    "Professional profile",
    "Career direction",
    "Writing preferences",
]

WRITABLE_USER_VARIABLE_SPECS = [
    UserVariableSpec("Identity", "profile.display_name", "Display name"),
    UserVariableSpec("Identity", "profile.email", "Professional email"),
    UserVariableSpec("Identity", "profile.phone", "Phone"),
    UserVariableSpec("Identity", "profile.location", "Location"),
    UserVariableSpec("Professional links", "profile.linkedin_url", "LinkedIn URL"),
    UserVariableSpec("Professional links", "profile.github_url", "GitHub URL"),
    UserVariableSpec("Professional links", "profile.portfolio_url", "Portfolio URL"),
    UserVariableSpec("Professional profile", "profile.summary.default", "Default professional summary", multiline=True),
    UserVariableSpec("Professional profile", "profile.experience", "Reusable experience", multiline=True),
    UserVariableSpec("Professional profile", "profile.education", "Education", multiline=True),
    UserVariableSpec("Professional profile", "profile.skills", "Skills", multiline=True),
    UserVariableSpec("Professional profile", "profile.projects", "Projects and evidence", multiline=True),
    UserVariableSpec("Career direction", "profile.career.objectives", "Objectives", multiline=True),
    UserVariableSpec("Career direction", "profile.career.constraints", "Constraints", multiline=True),
    UserVariableSpec("Career direction", "profile.career.target_roles", "Target roles", multiline=True),
    UserVariableSpec("Career direction", "profile.career.target_markets", "Target markets", multiline=True),
    UserVariableSpec("Career direction", "profile.career.direction", "Career direction", multiline=True),
    UserVariableSpec("Writing preferences", "profile.writing.tone", "Preferred tone", multiline=True),
    UserVariableSpec("Writing preferences", "profile.writing.preferences", "Writing preferences", multiline=True),
    UserVariableSpec("Writing preferences", "profile.cv.reusable_material", "Reusable CV material", multiline=True),
    UserVariableSpec("Writing preferences", "profile.cover_letter.reusable_material", "Reusable cover-letter material", multiline=True),
]

WRITABLE_USER_STORAGE_KEYS = {spec.key for spec in WRITABLE_USER_VARIABLE_SPECS}


def grouped_user_fields(projection: dict[str, Any]) -> list[dict[str, Any]]:
    user = projection.get("user") or {}
    variable_values = _variable_values(user)
    groups = {group: [] for group in FIELD_GROUPS}

    for spec in WRITABLE_USER_VARIABLE_SPECS:
        groups[spec.group].append(
            {
                "key": spec.key,
                "label": spec.label,
                "value": variable_values.get(spec.key, ""),
                "editable": True,
                "storage_key": spec.key,
                "multiline": spec.multiline,
                "read_only_reason": "",
            }
        )

    return [{"title": group, "fields": fields} for group, fields in groups.items() if fields]


def collect_writable_user_changes(original_values: dict[str, str], current_values: dict[str, str], field_map: dict[str, str | None]) -> dict[str, str]:
    changes: dict[str, str] = {}
    for field_key, current in current_values.items():
        storage_key = field_map.get(field_key)
        if storage_key not in WRITABLE_USER_STORAGE_KEYS:
            continue
        if current != original_values.get(field_key, ""):
            changes[storage_key] = current
    return changes


def has_editable_user_fields(projection: dict[str, Any]) -> bool:
    return any(field.get("editable") and field.get("storage_key") in WRITABLE_USER_STORAGE_KEYS for group in grouped_user_fields(projection) for field in group.get("fields") or [])


def _variable_values(user: dict[str, Any]) -> dict[str, str]:
    values: dict[str, str] = {}
    raw = user.get("profile_variables") or []
    if isinstance(raw, dict):
        iterable = [{"key": key, "value": value} for key, value in raw.items()]
    else:
        iterable = list(raw)
    for item in iterable:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or "")
        if not key:
            continue
        canonical = key if key.startswith("profile.") else f"profile.{key}"
        values[canonical] = _string_value(item.get("value"))
    return values


def _string_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if str(item).strip())
    return str(value)
