from __future__ import annotations

from typing import Any

from .dashboard_layout import DashboardLayoutState
from .dashboard_modules import modules_for_view, validate_module_registry
from .security import Mode, can_show_raw_intake, can_write

DESKTOP_VIEWS = {"welcome", "smart", "detailed", "user"}
VIEW_ALIASES = {
    "welcomeView": "welcome",
    "smartView": "smart",
    "detailedView": "detailed",
    "userView": "user",
    "welcome": "welcome",
    "smart": "smart",
    "detailed": "detailed",
    "user": "user",
}

DETAILED_COLUMNS = [
    {"id": "company", "title": "Company", "source": "company"},
    {"id": "role", "title": "Role", "source": "role"},
    {"id": "status", "title": "Status", "source": "status"},
    {"id": "priority", "title": "Priority", "source": "priority"},
    {"id": "next_action", "title": "Next action", "source": "next_action"},
    {"id": "deadline", "title": "Next date", "source": "next_action_date"},
    {"id": "last_contact", "title": "Last activity", "source": "last_activity"},
    {"id": "source", "title": "Source", "source": "source"},
    {"id": "source_url", "title": "Source URL", "source": "source_url"},
    {"id": "location", "title": "Location", "source": "location"},
    {"id": "remote_mode", "title": "Remote", "source": "remote_mode"},
    {"id": "keywords", "title": "Keywords", "source": "keywords"},
    {"id": "artifacts_state", "title": "Artifacts", "source": "artifacts_state"},
    {"id": "notes_excerpt", "title": "Notes", "source": "notes_excerpt"},
    {"id": "created_at", "title": "Created", "source": "created_at"},
    {"id": "updated_at", "title": "Updated", "source": "updated_at"},
]


def normalize_desktop_view(view: str | None, *, has_candidatures: bool = True) -> str:
    if view in VIEW_ALIASES:
        return VIEW_ALIASES[str(view)]
    return "smart" if has_candidatures else "welcome"


def build_dashboard_projection(
    payload: dict[str, Any],
    mode: Mode | str = Mode.FULL,
    *,
    view: str | None = None,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
    search_query: str | None = None,
    layout_state: DashboardLayoutState | dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a toolkit-neutral dashboard projection for the local desktop UI.

    The projection is human-local UI state, not an agent API and not a provider
    integration contract. It intentionally contains no wxPython widgets, no HTML
    fragments, and no dashboard routes.
    """

    validate_module_registry()
    apps = list(payload.get("applications") or [])
    glossary = list(payload.get("glossary") or [])
    layout = _layout(layout_state)
    current_view = normalize_desktop_view(view or layout.selected_view, has_candidatures=bool(apps))
    selected = _selected_application(apps, selected_application_id or layout.selected_candidature_ref)
    selected_keyword_value = selected_keyword or layout.selected_keyword or _first_keyword(selected)
    column_state = _column_state(layout)

    projection = {
        "permissions": _permissions(mode),
        "view_state": {
            "current_view": current_view,
            "selected_candidature_ref": selected.get("id") if selected else None,
            "selected_keyword": selected_keyword_value,
            "search_query": search_query or "",
            "available_views": ["welcome", "smart", "detailed", "user"],
        },
        "welcome": _welcome_projection(payload, apps),
        "user": _user_projection(payload),
        "smart": _smart_projection(payload, apps, selected, glossary, selected_keyword_value),
        "detailed": _detailed_projection(payload, apps, selected, column_state, search_query or ""),
        "glossary": {
            "terms": glossary,
            "selected": _glossary_definition(glossary, selected_keyword_value),
        },
        "modules": {
            view_name: [_module_to_dict(module) for module in modules_for_view(view_name)]
            for view_name in ("welcome", "smart", "detailed", "user")
        },
        "layout_state": layout.to_dict(),
    }
    return projection


def _layout(layout_state: DashboardLayoutState | dict[str, Any] | None) -> DashboardLayoutState:
    if isinstance(layout_state, DashboardLayoutState):
        return layout_state
    if isinstance(layout_state, dict):
        return DashboardLayoutState.from_dict(layout_state)
    return DashboardLayoutState.default()


def _permissions(mode: Mode | str) -> dict[str, bool | str]:
    resolved = Mode(mode)
    return {
        "mode": resolved.value,
        "can_write": can_write(resolved),
        "can_show_raw_intake": can_show_raw_intake(resolved),
        "is_static_demo": resolved == Mode.STATIC_DEMO,
        "allow_dashboard_actions": can_write(resolved),
    }


def _selected_application(apps: list[dict[str, Any]], selected_id: str | None) -> dict[str, Any] | None:
    if selected_id:
        for app in apps:
            if str(app.get("id")) == str(selected_id):
                return app
    return apps[0] if apps else None


def _first_keyword(app: dict[str, Any] | None) -> str | None:
    if not app:
        return None
    keywords = app.get("keywords") or []
    return str(keywords[0]) if keywords else None


def _welcome_projection(payload: dict[str, Any], apps: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "setup_state": "ready" if apps else "empty",
        "primary_actions": [
            {"id": "create_candidature", "label": "Create first candidature" if not apps else "Create candidature"},
            {"id": "import_source_material", "label": "Import candidature/source material"},
            {"id": "configure_profile", "label": "Configure personal data"},
            {"id": "open_smart", "label": "Open Smart View"},
            {"id": "open_detailed", "label": "Open Detailed View"},
        ],
        "recent_or_important_candidatures": [_candidature_summary(app) for app in apps[:5]],
        "open_todos_summary": _items_summary(payload.get("todos") or payload.get("open_todos") or []),
        "pending_tasks_summary": _review_queue_summary(payload.get("review_queue") or []),
    }


def _user_projection(payload: dict[str, Any]) -> dict[str, Any]:
    profile_variables = payload.get("profile_variables") or {}
    missing = payload.get("missing_profile_variables") or []
    return {
        "profile_summary": {
            "variable_count": len(profile_variables),
            "missing_variables": list(missing),
            "ready_for_templates": not bool(missing),
        },
        "career_summary": {"configured": bool(payload.get("career_plan")), "has_strategy": bool(payload.get("career_strategy"))},
        "template_summary": {"missing_profile_variables": list(missing), "artifact_types": ["cv", "cover_letter"]},
        "settings_summary": {"storage_mode": "local", "privacy": "local-first", "agent_workflows": "optional"},
        "workspace_modules": [module.module_id for module in modules_for_view("user")],
    }


def _smart_projection(
    payload: dict[str, Any],
    apps: list[dict[str, Any]],
    selected: dict[str, Any] | None,
    glossary: list[dict[str, Any]],
    selected_keyword: str | None,
) -> dict[str, Any]:
    selected_detail = _selected_detail(selected)
    return {
        "candidature_summaries": [_candidature_summary(app) for app in apps],
        "selected_candidature_detail": selected_detail,
        "primary_note": _primary_note(selected),
        "context_modules": [
            {"id": "primary_note", "title": "Notes", "selected": True},
            {"id": "keyword_context", "title": "Keywords", "selected": False},
            {"id": "artifacts", "title": "Artifacts", "selected": False},
            {"id": "call_card", "title": "Call card", "selected": False},
            {"id": "source_text", "title": "Source", "selected": False},
            {"id": "company_research", "title": "Company research", "selected": False},
            {"id": "form_answers", "title": "Form answers", "selected": False},
            {"id": "agent_suggestions", "title": "Agent suggestions", "selected": False},
        ],
        "selected_keyword_definition": _glossary_definition(glossary, selected_keyword),
        "artifact_summary": _artifact_summary(selected),
        "call_card": _call_card(selected),
        "source_text": _source_text(selected),
        "company_research": {"body": selected.get("company_research", "") if selected else ""},
        "form_answers": {"body": selected.get("form_answers", "") if selected else ""},
        "agent_suggestions": _review_queue_summary(payload.get("review_queue") or []),
    }


def _detailed_projection(
    payload: dict[str, Any],
    apps: list[dict[str, Any]],
    selected: dict[str, Any] | None,
    column_state: dict[str, list[str]],
    search_query: str,
) -> dict[str, Any]:
    rows = [_detailed_row(app) for app in apps]
    return {
        "rows": rows,
        "available_columns": list(DETAILED_COLUMNS),
        "visible_columns": column_state["visible"],
        "column_order": column_state["order"],
        "search_query": search_query,
        "filters": {},
        "selected_row": _detailed_row(selected) if selected else None,
        "toolbox_actions": _toolbox_actions(selected),
        "task_queue_summary": _review_queue_summary(payload.get("review_queue") or []),
    }


def _column_state(layout: DashboardLayoutState) -> dict[str, list[str]]:
    available = [column["id"] for column in DETAILED_COLUMNS]
    visible = [item for item in layout.detailed_columns.get("visible", []) if item in available]
    order = [item for item in layout.detailed_columns.get("order", []) if item in available]
    if not visible:
        visible = ["company", "role", "status", "priority", "next_action", "artifacts_state"]
    if not order:
        order = list(visible)
    for column_id in visible:
        if column_id not in order:
            order.append(column_id)
    return {"visible": visible, "order": order}


def _candidature_summary(app: dict[str, Any]) -> dict[str, Any]:
    source_text = _source_text(app)
    return {
        "ref": app.get("id"),
        "company": app.get("company") or "Untitled Company",
        "role": app.get("role") or "Untitled Role",
        "status": app.get("status") or "draft",
        "priority": app.get("priority") or "normal",
        "next_action": app.get("next_action") or "",
        "call_signals": app.get("call_signals") or "",
        "source_excerpt": source_text["excerpt"],
        "source_length": source_text["length"],
        "deadline_or_last_contact": app.get("next_action_date") or app.get("last_activity") or "",
        "source": app.get("source") or "",
        "keywords": list(app.get("keywords") or []),
        "artifacts_state": _artifact_state_label(app),
    }


def _selected_detail(app: dict[str, Any] | None) -> dict[str, Any] | None:
    if not app:
        return None
    source_text = _source_text(app)
    return {
        "ref": app.get("id"),
        "company": app.get("company") or "Untitled Company",
        "role": app.get("role") or "Untitled Role",
        "status": app.get("status") or "draft",
        "priority": app.get("priority") or "normal",
        "location": app.get("location") or "",
        "remote_mode": app.get("remote_mode") or "",
        "source": app.get("source") or "",
        "source_url": app.get("source_url") or "",
        "source_excerpt": source_text["excerpt"],
        "source_text": source_text["body"],
        "source_length": source_text["length"],
        "next_action": app.get("next_action") or "",
        "call_signals": app.get("call_signals") or "",
        "last_activity": app.get("last_activity") or "",
        "pitch": app.get("pitch") or "",
        "risk_to_avoid": app.get("risks_to_avoid") or "",
        "smart_question": app.get("smart_question") or "",
        "prepare_first": app.get("prepare_first") or "",
        "prepare_later": app.get("prepare_later") or "",
        "offer_snapshot": app.get("offer_snapshot") or "",
        "keywords": list(app.get("keywords") or []),
    }


def _primary_note(app: dict[str, Any] | None) -> dict[str, Any]:
    return {
        "candidature_ref": app.get("id") if app else None,
        "body": app.get("notes", "") if app else "",
        "interaction_model": "single_primary_note",
        "history_is_secondary": True,
    }


def _call_card(app: dict[str, Any] | None) -> dict[str, str]:
    return {
        "pitch": app.get("pitch", "") if app else "",
        "question": app.get("smart_question", "") if app else "",
        "avoid": app.get("risks_to_avoid", "") if app else "",
        "prepare_first": app.get("prepare_first", "") if app else "",
        "prepare_later": app.get("prepare_later", "") if app else "",
        "signals": app.get("call_signals", "") if app else "",
    }


def _source_text(app: dict[str, Any] | None) -> dict[str, Any]:
    raw_items = list(app.get("raw_intake") or []) if app else []
    body = "\n\n".join(str(item.get("content") or "").strip() for item in raw_items if str(item.get("content") or "").strip())
    if not body and app:
        body = app.get("offer_snapshot") or app.get("company_research") or ""
    compact = " ".join(body.split())
    excerpt = compact[:240].rstrip() + ("…" if len(compact) > 240 else "")
    return {"body": body, "excerpt": excerpt, "length": len(body), "has_raw": bool(raw_items)}


def _artifact_summary(app: dict[str, Any] | None) -> dict[str, Any]:
    artifacts = list(app.get("artifacts") or []) if app else []
    return {"count": len(artifacts), "items": artifacts, "state": _artifact_state_label(app) if app else "none"}


def _artifact_state_label(app: dict[str, Any] | None) -> str:
    if not app:
        return "none"
    count = len(app.get("artifacts") or [])
    return f"{count} artifact" if count == 1 else f"{count} artifacts"


def _detailed_row(app: dict[str, Any] | None) -> dict[str, Any] | None:
    if not app:
        return None
    keywords = list(app.get("keywords") or [])
    notes = app.get("notes") or ""
    return {
        "ref": app.get("id"),
        "company": app.get("company") or "Untitled Company",
        "role": app.get("role") or "Untitled Role",
        "status": app.get("status") or "draft",
        "priority": app.get("priority") or "normal",
        "next_action": app.get("next_action") or "",
        "deadline": app.get("next_action_date") or "",
        "last_contact": app.get("last_activity") or "",
        "source": app.get("source") or "",
        "source_url": app.get("source_url") or "",
        "location": app.get("location") or "",
        "remote_mode": app.get("remote_mode") or "",
        "keywords": keywords,
        "artifacts_state": _artifact_state_label(app),
        "notes_excerpt": notes[:80],
        "created_at": app.get("created_at") or "",
        "updated_at": app.get("updated_at") or "",
    }


def _toolbox_actions(selected: dict[str, Any] | None) -> list[dict[str, str]]:
    if selected:
        return [
            {"id": "generate_cv", "label": "Generate CV"},
            {"id": "generate_cover_letter", "label": "Generate cover letter"},
            {"id": "prepare_recruiter_call", "label": "Prepare recruiter call"},
            {"id": "review_fit", "label": "Review fit"},
            {"id": "archive_candidature", "label": "Archive candidature"},
        ]
    return [
        {"id": "career_path", "label": "Career path"},
        {"id": "strategy", "label": "Strategy"},
        {"id": "personal_data", "label": "Personal data"},
        {"id": "cv_fields", "label": "CV fields"},
        {"id": "template_config", "label": "Template config"},
        {"id": "view_config", "label": "View config"},
        {"id": "agent_task_settings", "label": "Agent/task settings"},
        {"id": "import_create", "label": "Import/create candidature"},
    ]


def _glossary_definition(glossary: list[dict[str, Any]], selected_keyword: str | None) -> dict[str, Any] | None:
    if not selected_keyword:
        return None
    for term in glossary:
        if str(term.get("term")) == str(selected_keyword):
            return term
    return {"term": selected_keyword, "definition": "", "category": ""}


def _review_queue_summary(items: list[Any]) -> dict[str, Any]:
    if isinstance(items, dict):
        iterable = [items]
    else:
        iterable = list(items or [])
    grouped: dict[str, int] = {}
    for item in iterable:
        if isinstance(item, dict):
            state = str(item.get("state") or item.get("review_state") or item.get("status") or "pending")
        else:
            state = "pending"
        grouped[state] = grouped.get(state, 0) + 1
    return {"count": len(iterable), "groups": grouped}


def _items_summary(items: list[Any]) -> dict[str, Any]:
    return {"count": len(items), "items": items[:5]}


def _module_to_dict(module: Any) -> dict[str, Any]:
    return {
        "module_id": module.module_id,
        "title": module.title,
        "purpose": module.purpose,
        "supported_views": list(module.supported_views),
        "default_visibility_by_view": dict(module.default_visibility_by_view),
        "default_region_by_view": dict(module.default_region_by_view),
        "minimum_useful_size": list(module.minimum_useful_size),
        "contextual_actions": list(module.contextual_actions),
        "state_persistence_policy": module.state_persistence_policy,
    }
