from __future__ import annotations

from typing import Any

from .dashboard_layout import DashboardLayoutState
from .dashboard_modules import modules_for_view, validate_module_registry

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

DETAIL_VALUE_KEYS = (
    "description",
    "salary_expectation",
    "publication_date",
    "application_date",
    "raw_application_form",
    "strengths",
    "questions_to_ask",
    "tech_stack",
    "valuation",
    "candidature_evaluation",
    "role_strategy",
    "cv_material",
    "cover_letter_material",
    "recruiter_material",
    "material_sent_notes",
)

DETAILED_COLUMNS = [
    {"id": "company", "title": "Company", "source": "company"},
    {"id": "role", "title": "Role", "source": "role"},
    {"id": "status", "title": "State", "source": "status"},
    {"id": "priority", "title": "Priority", "source": "priority"},
    {"id": "last_contact", "title": "Last activity", "source": "last_activity"},
    {"id": "source", "title": "Source", "source": "source"},
    {"id": "source_url", "title": "Source URL", "source": "source_url"},
    {"id": "location", "title": "Location", "source": "location"},
    {"id": "remote_mode", "title": "Remote", "source": "remote_mode"},
    {"id": "keywords", "title": "Keywords", "source": "keywords"},
    {"id": "artifacts_state", "title": "Material", "source": "artifacts_state"},
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
    *,
    view: str | None = None,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
    search_query: str | None = None,
    layout_state: DashboardLayoutState | dict[str, Any] | None = None,
) -> dict[str, Any]:
    validate_module_registry()
    apps = list(payload.get("applications") or [])
    glossary = list(payload.get("glossary") or [])
    layout = _layout(layout_state)
    current_view = normalize_desktop_view(view or layout.selected_view, has_candidatures=bool(apps))
    selected = _selected_application(apps, selected_application_id or layout.selected_candidature_ref)
    selected_keyword_value = selected_keyword or layout.selected_keyword or _first_keyword(selected)
    column_state = _column_state(layout)
    return {
        "permissions": _permissions(),
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
        "glossary": {"terms": glossary, "selected": _glossary_definition(glossary, selected_keyword_value)},
        "modules": {view_name: [_module_to_dict(module, view_name=view_name) for module in modules_for_view(view_name)] for view_name in ("welcome", "smart", "detailed", "user")},
        "layout_state": layout.to_dict(),
    }


def _layout(layout_state: DashboardLayoutState | dict[str, Any] | None) -> DashboardLayoutState:
    if isinstance(layout_state, DashboardLayoutState):
        return layout_state
    if isinstance(layout_state, dict):
        return DashboardLayoutState.from_dict(layout_state)
    return DashboardLayoutState.default()


def _permissions() -> dict[str, bool | str]:
    return {"surface": "local_desktop", "can_write": True, "can_show_raw_intake": True}


def _selected_application(apps: list[dict[str, Any]], selected_id: str | None) -> dict[str, Any] | None:
    if selected_id:
        for app in apps:
            if str(app.get("id")) == str(selected_id):
                return app
    active = [app for app in apps if str(app.get("status") or "active") == "active"]
    return (active or apps)[0] if apps else None


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
        "pending_tasks_summary": _preparation_queue_summary(payload.get("preparation_queue") or []),
    }


def _user_projection(payload: dict[str, Any]) -> dict[str, Any]:
    profile_variables = payload.get("profile_variables") or {}
    variable_records = list(payload.get("profile_variable_records") or [])
    profile_facts = list(payload.get("profile_facts") or [])
    profile_context = payload.get("profile_context_local") or {}
    missing = list(payload.get("missing_profile_variables") or [])
    return {
        "profile_summary": {"variable_count": len(profile_variables), "fact_count": len(profile_facts), "missing_variables": list(missing), "ready_for_templates": not bool(missing)},
        "profile_variables": _profile_variable_items(profile_variables),
        "profile_variable_records": _profile_variable_record_items(variable_records),
        "profile_facts": _profile_fact_items(profile_facts),
        "profile_context": profile_context,
        "career_summary": {"configured": bool(payload.get("career_plan") or payload.get("career_strategy")), "has_strategy": bool(payload.get("career_strategy")), "note": "Career and strategy data are editable in User View."},
        "template_summary": {"missing_profile_variables": list(missing), "artifact_types": ["cv", "cover_letter"]},
        "settings_summary": {"storage_mode": "local", "privacy": "local-first", "agent_workflows": "optional"},
        "workspace_modules": [module.module_id for module in modules_for_view("user")],
    }


def _profile_variable_items(profile_variables: dict[str, Any]) -> list[dict[str, str]]:
    by_key: dict[str, str] = {}
    for key, value in sorted(profile_variables.items()):
        canonical = str(key) if str(key).startswith("profile.") else f"profile.{key}"
        by_key[canonical] = str(value or "")
    return [{"key": key, "value": value} for key, value in sorted(by_key.items())]


def _profile_variable_record_items(records: list[Any]) -> list[dict[str, Any]]:
    items = []
    for record in records:
        if isinstance(record, dict) and str(record.get("key") or "").startswith("profile."):
            items.append({"key": record.get("key") or "", "placeholder": record.get("placeholder") or "", "exposure": record.get("exposure") or "", "summary": record.get("summary") or "", "is_sensitive": bool(record.get("is_sensitive")), "updated_at": record.get("updated_at") or ""})
    return items


def _profile_fact_items(facts: list[Any]) -> list[dict[str, Any]]:
    items = []
    for fact in facts:
        if isinstance(fact, dict):
            items.append({"fact_type": fact.get("fact_type") or "", "title": fact.get("title") or "", "body": fact.get("body") or "", "tags": list(fact.get("tags") or []), "visibility": fact.get("visibility") or "", "exposure": fact.get("exposure") or "", "source": fact.get("source") or "", "review_state": fact.get("review_state") or "", "usage": {"cv": bool(fact.get("use_for_cv")), "cover_letter": bool(fact.get("use_for_cover_letter")), "agent_context": bool(fact.get("use_for_agent_context")), "market_research": bool(fact.get("use_for_market_research")), "desktop": bool(fact.get("use_for_desktop"))}, "updated_at": fact.get("updated_at") or ""})
    return items


def _smart_projection(payload: dict[str, Any], apps: list[dict[str, Any]], selected: dict[str, Any] | None, glossary: list[dict[str, Any]], selected_keyword: str | None) -> dict[str, Any]:
    active_apps = [app for app in apps if str(app.get("status") or "active") == "active"]
    selected_detail = _selected_detail(selected)
    return {
        "candidature_summaries": [_candidature_summary(app) for app in active_apps],
        "selected_candidature_detail": selected_detail,
        "primary_note": _primary_note(selected),
        "context_modules": [
            {"id": "keywords", "title": "Keywords", "selected": True},
        ],
        "selected_keyword_definition": _glossary_definition(glossary, selected_keyword),
        "call_card": _call_card(selected),
        "source_text": _source_text(selected),
        "company_research": {"body": selected.get("company_research", "") if selected else ""},
        "form_answers": {"body": selected.get("form_answers", "") if selected else ""},
    }


def _detailed_projection(payload: dict[str, Any], apps: list[dict[str, Any]], selected: dict[str, Any] | None, column_state: dict[str, list[str]], search_query: str) -> dict[str, Any]:
    rows = [_detailed_row(app) for app in apps]
    return {
        "rows": rows,
        "available_columns": list(DETAILED_COLUMNS),
        "visible_columns": column_state["visible"],
        "column_order": column_state["order"],
        "search_query": search_query,
        "filters": {"state_model": ["active", "closed"]},
        "selected_row": _detailed_row(selected) if selected else None,
        "artifact_summary": _artifact_summary(selected),
        "toolbox_actions": _toolbox_actions(selected),
        "task_queue_summary": _preparation_queue_summary(payload.get("preparation_queue") or []),
    }


def _column_state(layout: DashboardLayoutState) -> dict[str, list[str]]:
    available = [column["id"] for column in DETAILED_COLUMNS]
    visible = [item for item in layout.detailed_columns.get("visible", []) if item in available]
    order = [item for item in layout.detailed_columns.get("order", []) if item in available]
    if not visible:
        visible = ["company", "role", "status", "priority", "location", "remote_mode", "keywords", "artifacts_state"]
    if not order:
        order = list(visible)
    for column_id in visible:
        if column_id not in order:
            order.append(column_id)
    return {"visible": visible, "order": order}


def _candidature_summary(app: dict[str, Any]) -> dict[str, Any]:
    source_text = _source_text(app)
    return {"ref": app.get("id"), "company": app.get("company") or "Company not set", "role": app.get("role") or "Role not set", "status": app.get("status") or "active", "priority": app.get("priority") or "normal", "call_signals": app.get("call_signals") or "", "source_excerpt": source_text["excerpt"], "source_length": source_text["length"], "deadline_or_last_contact": app.get("last_activity") or "", "source": app.get("source") or "", "keywords": list(app.get("keywords") or []), "artifacts_state": _artifact_state_label(app)}


def _selected_detail(app: dict[str, Any] | None) -> dict[str, Any] | None:
    if not app:
        return None
    source_text = _source_text(app)
    detail = {
        "ref": app.get("id"),
        "company": app.get("company") or "Company not set",
        "role": app.get("role") or "Role not set",
        "status": app.get("status") or "active",
        "priority": app.get("priority") or "normal",
        "location": app.get("location") or "",
        "remote_mode": app.get("remote_mode") or "",
        "source": app.get("source") or "",
        "source_url": app.get("source_url") or "",
        "source_excerpt": source_text["excerpt"],
        "source_text": source_text["body"],
        "source_length": source_text["length"],
        "source_has_raw": source_text["has_raw"],
        "notes": app.get("notes") or "",
        "call_signals": app.get("call_signals") or "",
        "last_activity": app.get("last_activity") or "",
        "pitch": app.get("pitch") or "",
        "risks_to_avoid": app.get("risks_to_avoid") or "",
        "risk_to_avoid": app.get("risks_to_avoid") or "",
        "smart_question": app.get("smart_question") or "",
        "offer_snapshot": app.get("offer_snapshot") or "",
        "company_research": app.get("company_research") or "",
        "form_answers": app.get("form_answers") or "",
        "keywords": list(app.get("keywords") or []),
        "created_at": app.get("created_at") or "",
        "updated_at": app.get("updated_at") or "",
        "artifacts_state": _artifact_state_label(app),
        "artifacts_count": len(app.get("artifacts") or []),
        "artifacts_items": _artifact_items(app),
    }
    for key in DETAIL_VALUE_KEYS:
        detail[key] = app.get(key) or ""
    return detail


def _primary_note(app: dict[str, Any] | None) -> dict[str, Any]:
    return {"candidature_ref": app.get("id") if app else None, "body": app.get("notes", "") if app else "", "interaction_model": "single_primary_note", "history_is_secondary": True}


def _call_card(app: dict[str, Any] | None) -> dict[str, str]:
    return {"pitch": app.get("pitch", "") if app else "", "question": app.get("smart_question", "") if app else "", "avoid": app.get("risks_to_avoid", "") if app else "", "signals": app.get("call_signals", "") if app else ""}


def _source_text(app: dict[str, Any] | None) -> dict[str, Any]:
    raw_items = list(app.get("raw_intake") or []) if app else []
    body = "\n\n".join(str(item.get("content") or "").strip() for item in raw_items if str(item.get("content") or "").strip())
    if not body and app:
        body = app.get("offer_snapshot") or app.get("description") or app.get("company_research") or ""
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


def _artifact_items(app: dict[str, Any]) -> str:
    items = []
    for item in app.get("artifacts") or []:
        items.append(" · ".join(str(part) for part in (item.get("artifact_type"), item.get("label"), item.get("review_state"), item.get("created_at")) if part))
    return "\n".join(items)


def _detailed_row(app: dict[str, Any] | None) -> dict[str, Any] | None:
    if not app:
        return None
    selected = _selected_detail(app) or {}
    notes = app.get("notes") or ""
    row = {**selected, "last_contact": app.get("last_activity") or "", "notes_excerpt": notes[:80]}
    return row


def _toolbox_actions(selected: dict[str, Any] | None) -> list[dict[str, str]]:
    if selected:
        return []
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


def _preparation_queue_summary(items: list[Any]) -> dict[str, Any]:
    iterable = [items] if isinstance(items, dict) else list(items or [])
    grouped: dict[str, int] = {}
    for item in iterable:
        state = str(item.get("state") or item.get("review_state") or item.get("status") or "pending") if isinstance(item, dict) else "pending"
        grouped[state] = grouped.get(state, 0) + 1
    return {"count": len(iterable), "groups": grouped}


def _items_summary(items: list[Any]) -> dict[str, Any]:
    return {"count": len(items), "items": items[:5]}


def _module_to_dict(module: Any, *, view_name: str) -> dict[str, Any]:
    supported_views = tuple(getattr(module, "supported_views", ()) or ())
    visibility = dict(getattr(module, "default_visibility_by_view", {}) or {})
    regions = dict(getattr(module, "default_region_by_view", {}) or {})
    visible = bool(visibility.get(view_name, True))
    return {
        "module_id": str(getattr(module, "module_id", "")),
        "title": str(getattr(module, "title", "")),
        "view": view_name,
        "supported_views": list(supported_views),
        "region": str(regions.get(view_name, "center")),
        "required": visible,
        "optional": not visible,
    }
