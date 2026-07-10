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
    "Preferences",
    "Application defaults",
    "Profile facts",
    "Research/context",
    "Generated or derived context",
    "Raw/source/provenance",
]

WRITABLE_USER_VARIABLE_SPECS = [
    UserVariableSpec("Identity", "profile.display_name", "Display name"),
    UserVariableSpec("Identity", "profile.email", "Email"),
    UserVariableSpec("Identity", "profile.phone", "Phone"),
    UserVariableSpec("Identity", "profile.location", "Location"),
    UserVariableSpec("Identity", "profile.linkedin_url", "LinkedIn URL"),
    UserVariableSpec("Identity", "profile.github_url", "GitHub URL"),
    UserVariableSpec("Identity", "profile.portfolio_url", "Portfolio URL"),
    UserVariableSpec("Application defaults", "profile.summary.default", "Default profile summary", multiline=True),
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

    preference_text = _preference_variables_text(user, set(WRITABLE_USER_STORAGE_KEYS))
    groups["Preferences"].append(_readonly("preferences", "Preference/style variables", preference_text or "No preference variables stored yet.", "Existing unsupported profile variables are shown read-only."))

    template_summary = user.get("template_summary") or {}
    missing = template_summary.get("missing_profile_variables") or []
    groups["Application defaults"].append(
        _readonly(
            "template_readiness",
            "Template readiness",
            "Ready for CV/cover-letter templates" if not missing else "Missing: " + ", ".join(str(item) for item in missing),
            "Derived from required template variables.",
        )
    )

    groups["Profile facts"].append(_readonly("profile_facts", "Profile facts", _profile_facts_text(user), "Existing profile facts are source/provenance-bearing records."))
    groups["Research/context"].append(_readonly("research_context", "Research/context facts", _research_context_text(user), "Purpose flags determine where facts are reused."))
    groups["Generated or derived context"].append(_readonly("generated_context", "Generated or derived context", _derived_context_text(user), "Computed local readiness and module summary."))
    groups["Raw/source/provenance"].append(_readonly("raw_provenance", "Raw/source/provenance", _provenance_text(user), "Metadata is visible but not edited in this foundation slice."))

    return [{"title": group, "fields": fields} for group, fields in groups.items()]


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


def _readonly(key: str, label: str, value: str, reason: str) -> dict[str, Any]:
    return {"key": key, "label": label, "value": value, "editable": False, "storage_key": None, "multiline": True, "read_only_reason": reason}


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


def _preference_variables_text(user: dict[str, Any], excluded_keys: set[str]) -> str:
    rows = []
    for item in user.get("profile_variables") or []:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or "")
        if key in excluded_keys:
            continue
        lowered = key.lower()
        if not any(token in lowered for token in ("preference", "style", "target", "summary", "default")):
            continue
        rows.append(f"{key}: {_string_value(item.get('value'))}")
    return "\n".join(rows)


def _profile_facts_text(user: dict[str, Any]) -> str:
    facts = [item for item in user.get("profile_facts") or [] if isinstance(item, dict)]
    if not facts:
        return "No profile facts stored yet."
    rows = []
    for fact in facts[:12]:
        title = str(fact.get("title") or fact.get("fact_type") or "Profile fact")
        fact_type = str(fact.get("fact_type") or "fact")
        body = _clip(_string_value(fact.get("body")), 220)
        rows.append(f"{fact_type} · {title}: {body}" if body else f"{fact_type} · {title}")
    return "\n".join(rows)


def _research_context_text(user: dict[str, Any]) -> str:
    facts = [item for item in user.get("profile_facts") or [] if isinstance(item, dict)]
    selected = []
    for fact in facts:
        usage = fact.get("usage") or {}
        if usage.get("agent_context") or usage.get("market_research") or usage.get("cover_letter") or usage.get("cv"):
            flags = ", ".join(key for key, enabled in usage.items() if enabled)
            selected.append(f"{fact.get('title') or fact.get('fact_type')} · {flags}")
    return "\n".join(selected) if selected else "No profile facts are flagged for agent/research/template context yet."


def _derived_context_text(user: dict[str, Any]) -> str:
    profile_summary = user.get("profile_summary") or {}
    career_summary = user.get("career_summary") or {}
    settings = user.get("settings_summary") or {}
    modules = ", ".join(str(item) for item in user.get("workspace_modules") or [])
    return "\n".join(
        [
            f"Variables: {profile_summary.get('variable_count', 0)}",
            f"Profile facts: {profile_summary.get('fact_count', 0)}",
            f"Template ready: {'yes' if profile_summary.get('ready_for_templates') else 'no'}",
            f"Career strategy: {'configured' if career_summary.get('configured') else career_summary.get('note', 'not configured')}",
            f"Storage: {settings.get('storage_mode', 'local')} · {settings.get('privacy', 'local-first')}",
            f"Modules: {modules}" if modules else "Modules: —",
        ]
    )


def _provenance_text(user: dict[str, Any]) -> str:
    rows = []
    for item in user.get("profile_variable_records") or []:
        if not isinstance(item, dict):
            continue
        rows.append(f"variable · {item.get('key')} · exposure={item.get('exposure') or 'unknown'} · updated={item.get('updated_at') or 'unknown'}")
    for fact in user.get("profile_facts") or []:
        if not isinstance(fact, dict):
            continue
        rows.append(
            f"fact · {fact.get('fact_type') or 'fact'} · {fact.get('title') or ''} · source={fact.get('source') or 'unknown'} · review={fact.get('review_state') or 'unknown'}"
        )
    return "\n".join(rows) if rows else "No variable/fact provenance stored yet."


def _string_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if str(item).strip())
    return str(value)


def _clip(value: str, limit: int) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "…"
