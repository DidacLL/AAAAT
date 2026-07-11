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
    _selected_application,
    _smart_projection,
    _user_projection,
    _welcome_projection,
    normalize_desktop_view,
)
from .security import Mode

_AVAILABLE_VIEWS = ["welcome", "smart", "detailed", "user"]


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
        # The current wx shell presents the empty state through Smart overview.
        projection["smart"] = _smart_projection(payload, apps, selected, glossary, selected_keyword_value)
        projection["glossary"] = {
            "terms": glossary,
            "selected": _glossary_definition(glossary, selected_keyword_value),
        }
    elif current_view == "user":
        projection["user"] = _user_projection(payload)
    elif current_view == "detailed":
        # The full-record editor intentionally reuses selected-candidature
        # summaries from Smart View, but does not build Welcome or User data.
        projection["smart"] = _smart_projection(payload, apps, selected, glossary, selected_keyword_value)
        projection["detailed"] = _detailed_projection(
            payload,
            apps,
            selected,
            _column_state(layout),
            search_query or "",
        )
        projection["glossary"] = {
            "terms": glossary,
            "selected": _glossary_definition(glossary, selected_keyword_value),
        }
    else:
        projection["smart"] = _smart_projection(payload, apps, selected, glossary, selected_keyword_value)
        projection["glossary"] = {
            "terms": glossary,
            "selected": _glossary_definition(glossary, selected_keyword_value),
        }

    return projection


def install_desktop_projection_compatibility() -> None:
    """Route legacy desktop imports through the active-view builder.

    The wx adapter historically imports ``build_dashboard_projection`` directly.
    Installing this alias during desktop bootstrap avoids a risky widget rewrite
    while ensuring initial loads and subsequent refreshes use the same projection
    semantics. Non-desktop callers retain the legacy compatibility builder.
    """

    from . import dashboard_projection

    dashboard_projection.build_dashboard_projection = build_desktop_view_projection


install_desktop_projection_compatibility()
