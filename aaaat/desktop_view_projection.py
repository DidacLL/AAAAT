from __future__ import annotations

from typing import Any

from .dashboard_layout import DashboardLayoutState
from .dashboard_projection import (
    _column_state,
    _detailed_projection,
    _first_keyword,
    _glossary_definition,
    _layout,
    _permissions,
    _profile_fact_items,
    _profile_variable_items,
    _profile_variable_record_items,
    _selected_application,
    _smart_projection,
    _welcome_projection,
    normalize_desktop_view,
)
from .security import Mode

_AVAILABLE_VIEWS = ["welcome", "smart", "detailed", "user"]
_USER_WORKSPACE_SECTIONS = ["profile_summary", "career_summary", "template_summary", "settings_summary"]


def build_desktop_view_projection(
    payload: dict[str, Any],
    mode: Mode | str = Mode.FULL,
    *,
    view: str | None = None,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
    search_query: str | None = None,
    layout_state: DashboardLayoutState | dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build only the projection sections required by the active desktop view.

    This is an internal first-party UI contract. It contains no wx widgets and is
    not exposed through agent HTTP or MCP surfaces.
    """

    apps = list(payload.get("applications") or [])
    glossary = list(payload.get("glossary") or [])
    layout = _layout(layout_state)
    current_view = normalize_desktop_view(view or layout.selected_view, has_candidatures=bool(apps))
    selected = _selected_application(apps, selected_application_id or layout.selected_candidature_ref)
    selected_keyword_value = selected_keyword or layout.selected_keyword or _first_keyword(selected)

    projection: dict[str, Any] = {
        "permissions": _permissions(mode),
        "view_state": {
            "current_view": current_view,
            "selected_candidature_ref": selected.get("id") if selected else None,
            "selected_keyword": selected_keyword_value,
            "search_query": search_query or "",
            "available_views": list(_AVAILABLE_VIEWS),
        },
        "layout_state": layout.to_dict(),
    }

    if current_view == "welcome":
        projection["welcome"] = _welcome_projection(payload, apps)
        projection["smart"] = _smart_projection(payload, apps, selected, glossary, selected_keyword_value)
        projection["glossary"] = _glossary_projection(glossary, selected_keyword_value)
    elif current_view == "user":
        projection["user"] = _desktop_user_projection(payload)
    elif current_view == "detailed":
        projection["smart"] = _smart_projection(payload, apps, selected, glossary, selected_keyword_value)
        projection["detailed"] = _detailed_projection(
            payload,
            apps,
            selected,
            _column_state(layout),
            search_query or "",
        )
        projection["glossary"] = _glossary_projection(glossary, selected_keyword_value)
    else:
        projection["smart"] = _smart_projection(payload, apps, selected, glossary, selected_keyword_value)
        projection["glossary"] = _glossary_projection(glossary, selected_keyword_value)

    return projection


def _glossary_projection(glossary: list[dict[str, Any]], selected_keyword: str | None) -> dict[str, Any]:
    return {
        "terms": glossary,
        "selected": _glossary_definition(glossary, selected_keyword),
    }


def _desktop_user_projection(payload: dict[str, Any]) -> dict[str, Any]:
    profile_variables = payload.get("profile_variables") or {}
    variable_records = list(payload.get("profile_variable_records") or [])
    profile_facts = list(payload.get("profile_facts") or [])
    profile_context = payload.get("profile_context_dashboard") or {}
    missing = list(payload.get("missing_profile_variables") or [])
    return {
        "profile_summary": {
            "variable_count": len(profile_variables),
            "fact_count": len(profile_facts),
            "missing_variables": list(missing),
            "ready_for_templates": not bool(missing),
        },
        "profile_variables": _profile_variable_items(profile_variables),
        "profile_variable_records": _profile_variable_record_items(variable_records),
        "profile_facts": _profile_fact_items(profile_facts),
        "profile_context": profile_context,
        "career_summary": {
            "configured": bool(payload.get("career_plan") or payload.get("career_strategy")),
            "has_strategy": bool(payload.get("career_strategy")),
            "note": "No dedicated local CareerPlan record is projected yet." if not payload.get("career_plan") else "CareerPlan data available.",
        },
        "template_summary": {
            "missing_profile_variables": list(missing),
            "artifact_types": ["cv", "cover_letter"],
        },
        "settings_summary": {
            "storage_mode": "local",
            "privacy": "local-first",
            "agent_workflows": "optional",
        },
        "workspace_modules": list(_USER_WORKSPACE_SECTIONS),
    }


def install_desktop_projection_compatibility() -> None:
    """Route legacy wx reload imports through the active-view builder."""

    from . import dashboard_projection

    dashboard_projection.build_dashboard_projection = build_desktop_view_projection


install_desktop_projection_compatibility()
