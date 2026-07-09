from __future__ import annotations

from typing import Any

from .candidatures import get_candidature
from .keywords import list_keywords
from .profile_facts import list_profile_facts
from .search import SearchUnavailable, rebuild_index, search
from .security import Mode, can_show_raw_intake, can_write
from .tasks import OPEN_TASK_STATES, list_tasks
from .todos import list_todos

try:  # Career plans are optional dashboard context for the first projection pass.
    from .career_plans import list_career_plans
except ImportError:  # pragma: no cover - only for partial installs or packaging mistakes.
    list_career_plans = None  # type: ignore[assignment]


VIEW_MODES = {"welcomeView", "smartView", "detailedView", "userView"}
VIEW_KEYS = {
    "welcomeView": "welcome",
    "smartView": "smart",
    "detailedView": "detailed",
    "userView": "user",
}
VIEW_ALIASES = {
    "welcome": "welcomeView",
    "smart": "smartView",
    "detailed": "detailedView",
    "user": "userView",
}

DETAILED_COLUMNS: list[dict[str, str]] = [
    {"key": "company", "label": "Company"},
    {"key": "role", "label": "Role"},
    {"key": "status", "label": "Status"},
    {"key": "priority", "label": "Priority"},
    {"key": "next_action", "label": "Next action"},
    {"key": "source", "label": "Source"},
    {"key": "source_url", "label": "Source URL"},
    {"key": "location", "label": "Location"},
    {"key": "remote_mode", "label": "Remote mode"},
    {"key": "keywords", "label": "Keywords"},
    {"key": "artifacts_state", "label": "Artifacts state"},
    {"key": "notes_excerpt", "label": "Notes excerpt"},
    {"key": "created_at", "label": "Created at"},
    {"key": "updated_at", "label": "Updated at"},
]
DEFAULT_VISIBLE_COLUMNS = [
    "company",
    "role",
    "status",
    "priority",
    "next_action",
    "source",
    "location",
    "keywords",
    "artifacts_state",
    "notes_excerpt",
    "updated_at",
]
SMART_CONTEXT_MODULES = [
    {"id": "notes", "label": "Notes"},
    {"id": "keywords", "label": "Keywords"},
    {"id": "artifacts", "label": "Artifacts"},
    {"id": "call_card", "label": "Call card"},
    {"id": "company_research", "label": "Company research"},
    {"id": "form_answers", "label": "Form answers"},
    {"id": "agent_suggestions", "label": "Agent suggestions"},
]


def normalize_view(view: str | None) -> str:
    if view in VIEW_MODES:
        return str(view)
    if view in VIEW_ALIASES:
        return VIEW_ALIASES[str(view)]
    return "welcomeView"


def build_dashboard_projection(
    payload: dict[str, Any],
    mode: Mode | str = Mode.FULL,
    *,
    view: str | None = None,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
    search_query: str | None = None,
    selected_context_module: str | None = None,
    visible_columns: list[str] | None = None,
    column_order: list[str] | None = None,
    filters: dict[str, Any] | None = None,
    conn: Any | None = None,
) -> dict[str, Any]:
    """Build internal dashboard-facing projection data for server-rendered views.

    This projection is for the human-local dashboard only. It is intentionally not
    registered as an agent route, MCP resource, or broad JSON API.
    """

    mode = Mode(mode)
    current_view = normalize_view(view)
    permissions = build_permissions(mode)

    apps = list(payload.get("applications", []))
    selected = select_application(apps, selected_application_id)
    if conn is not None and selected:
        selected = get_candidature(conn, selected["id"], include_related=True)
    selected = ensure_selected_shape(selected)

    selected_user_view = selected_user_view_blob(selected)
    selected_term = selected_keyword or first_keyword(selected)

    queue = payload.get("review_queue", [])
    all_tasks = list_tasks(conn) if conn is not None else []
    open_tasks = [item for item in all_tasks if item.get("state") in OPEN_TASK_STATES]
    all_todos = list_todos(conn) if conn is not None else []
    open_todos = [item for item in all_todos if item.get("state") == "open"]
    pinned_todos = [item for item in open_todos if item.get("pinned")]
    glossary = list_keywords(conn) if conn is not None else payload.get("glossary", [])
    profile_facts = list_profile_facts(conn) if conn is not None else payload.get("profile_facts", [])
    career_plans = load_career_plans(conn)
    grouped_profile_facts = group_profile_facts(profile_facts)
    selected_keyword_item = next((item for item in glossary if item.get("term") == selected_term), {})
    search_result = build_search_result(conn, search_query)
    important = important_applications(apps)
    selected_queue = [item for item in queue if selected and item.get("application_id") == selected.get("id")]

    view_state = build_view_state(
        current_view,
        selected,
        selected_term,
        search_query,
        selected_context_module,
        visible_columns,
        column_order,
        filters,
    )
    welcome = build_welcome_projection(payload, permissions, apps, important, open_todos, open_tasks)
    user = build_user_projection(payload, permissions, profile_facts, grouped_profile_facts, career_plans, selected_user_view)
    smart = build_smart_projection(
        apps,
        selected,
        selected_term,
        selected_keyword_item,
        selected_queue,
        permissions,
        view_state,
    )
    detailed = build_detailed_projection(
        apps,
        selected,
        all_tasks,
        queue,
        permissions,
        view_state,
    )

    return {
        # Compatibility keys consumed by the current Jinja templates.
        "payload": payload,
        "mode": mode,
        "view": current_view,
        "view_modes": sorted(VIEW_MODES),
        "applications": apps,
        "important_applications": important,
        "selected": selected,
        "selected_user_view": selected_user_view,
        "selected_keyword": selected_term,
        "queue": queue,
        "selected_queue": selected_queue,
        "open_tasks": open_tasks,
        "open_todos": open_todos,
        "pinned_todos": pinned_todos,
        "keywords": glossary,
        "profile_facts": profile_facts,
        "grouped_profile_facts": grouped_profile_facts,
        "selected_keyword_item": selected_keyword_item,
        "search_query": search_query or "",
        "search_result": search_result,
        # Structured projection sections for the four-view redesign.
        "permissions": permissions,
        "view_state": view_state,
        "welcome": welcome,
        "user": user,
        "smart": smart,
        "detailed": detailed,
        "glossary": {
            "items": glossary,
            "selected_keyword": selected_term,
            "selected_item": selected_keyword_item,
        },
    }


def build_permissions(mode: Mode) -> dict[str, Any]:
    return {
        "mode": mode.value,
        "is_full_local": mode == Mode.FULL,
        "is_read_only": mode == Mode.READ_ONLY,
        "is_static_demo": mode == Mode.STATIC_DEMO,
        "can_write": can_write(mode),
        "can_show_raw_intake": can_show_raw_intake(mode),
        "allow_dashboard_actions": can_write(mode),
    }


def build_view_state(
    current_view: str,
    selected: dict[str, Any],
    selected_keyword: str,
    search_query: str | None,
    selected_context_module: str | None,
    visible_columns: list[str] | None,
    column_order: list[str] | None,
    filters: dict[str, Any] | None,
) -> dict[str, Any]:
    current_order = normalized_column_order(column_order)
    current_visible = normalized_visible_columns(visible_columns, current_order)
    module = selected_context_module or ("keywords" if selected_keyword else "notes")
    if module not in {item["id"] for item in SMART_CONTEXT_MODULES}:
        module = "notes"
    return {
        "current_view": current_view,
        "view_key": VIEW_KEYS[current_view],
        "selected_application_id": selected.get("id") if selected else "",
        "selected_keyword": selected_keyword,
        "selected_context_module": module,
        "search_query": search_query or "",
        "visible_columns": current_visible,
        "column_order": current_order,
        "filters": filters or {},
    }


def build_welcome_projection(
    payload: dict[str, Any],
    permissions: dict[str, Any],
    apps: list[dict[str, Any]],
    important: list[dict[str, Any]],
    open_todos: list[dict[str, Any]],
    open_tasks: list[dict[str, Any]],
) -> dict[str, Any]:
    missing_profile = list(payload.get("missing_profile_variables", []))
    setup_state = {
        "has_candidatures": bool(apps),
        "is_first_run": not bool(apps),
        "has_profile_variables": bool(payload.get("profile_variables")),
        "missing_profile_variables": missing_profile,
        "needs_profile_setup": bool(missing_profile),
    }
    return {
        "setup_state": setup_state,
        "primary_actions": [
            action("create_first_candidature", "Create first candidature", panel="new-candidature", enabled=permissions["can_write"]),
            action("import_source_material", "Import candidature/source material", panel="new-candidature", enabled=permissions["can_write"]),
            action("configure_personal_data", "Configure personal data", target_view="userView", enabled=permissions["can_write"]),
            action("configure_career_strategy", "Configure career path/strategy", target_view="userView", enabled=permissions["can_write"]),
            action("configure_cv_templates", "Configure CV fields/templates", target_view="userView", enabled=permissions["can_write"]),
            action("open_smart_view", "Open Smart View", target_view="smartView"),
            action("open_detailed_view", "Open Detailed View", target_view="detailedView"),
        ],
        "open_todo_summary": {"count": len(open_todos), "items": open_todos[:5]},
        "open_task_summary": {"count": len(open_tasks), "items": open_tasks[:5]},
        "important_candidatures": [candidature_summary(app) for app in important],
    }


def build_user_projection(
    payload: dict[str, Any],
    permissions: dict[str, Any],
    profile_facts: list[dict[str, Any]],
    grouped_profile_facts: dict[str, list[dict[str, Any]]],
    career_plans: list[dict[str, Any]],
    selected_user_view: dict[str, Any],
) -> dict[str, Any]:
    profile_variables = payload.get("profile_variables", {})
    missing_profile = list(payload.get("missing_profile_variables", []))
    summary_sections = [
        {"id": "personal_data", "label": "Personal data", "count": len(profile_variables), "editable": permissions["can_write"]},
        {"id": "career_strategy", "label": "Career strategy", "count": len(career_plans), "editable": permissions["can_write"]},
        {"id": "cv_fields", "label": "CV fields", "count": len([fact for fact in profile_facts if fact.get("use_for_cv")]), "editable": permissions["can_write"]},
        {"id": "template_variables", "label": "Template variables", "count": len(missing_profile), "editable": permissions["can_write"]},
        {"id": "writing_preferences", "label": "Writing preferences", "count": 1 if selected_user_view else 0, "editable": permissions["can_write"]},
        {"id": "settings", "label": "Settings", "count": 1, "editable": permissions["can_write"]},
    ]
    return {
        "summary_sections": summary_sections,
        "profile_summary": {
            "profile_variable_count": len(profile_variables),
            "profile_fact_count": len(profile_facts),
            "grouped_profile_facts": grouped_profile_facts,
            "missing_profile_variables": missing_profile,
        },
        "career_summary": {"career_plan_count": len(career_plans), "items": career_plans[:3]},
        "template_summary": {"missing_profile_variables": missing_profile},
        "settings_summary": {"mode": permissions["mode"], "write_enabled": permissions["can_write"]},
        "panels": [section["id"] for section in summary_sections],
    }


def build_smart_projection(
    apps: list[dict[str, Any]],
    selected: dict[str, Any],
    selected_keyword: str,
    selected_keyword_item: dict[str, Any],
    selected_queue: list[dict[str, Any]],
    permissions: dict[str, Any],
    view_state: dict[str, Any],
) -> dict[str, Any]:
    selected_detail = selected_candidature_detail(selected)
    return {
        "candidature_summaries": [candidature_summary(app) for app in apps],
        "selected_candidature_detail": selected_detail,
        "primary_note": primary_note_state(selected, permissions),
        "context_modules": SMART_CONTEXT_MODULES,
        "selected_context_module": view_state["selected_context_module"],
        "selected_keyword_context": {
            "term": selected_keyword,
            "item": selected_keyword_item,
            "definition": selected_keyword_item.get("definition", "") if selected_keyword_item else "",
            "selected_candidature": selected_detail,
        },
        "artifact_summary": artifact_summary(selected.get("artifacts", []) if selected else []),
        "call_card": call_card(selected),
        "company_research": selected.get("company_research", "") if selected else "",
        "form_answers": selected.get("form_answers", "") if selected else "",
        "agent_suggestions": selected_queue,
    }


def build_detailed_projection(
    apps: list[dict[str, Any]],
    selected: dict[str, Any],
    all_tasks: list[dict[str, Any]],
    queue: list[dict[str, Any]],
    permissions: dict[str, Any],
    view_state: dict[str, Any],
) -> dict[str, Any]:
    rows = [detailed_row(app) for app in apps]
    selected_row = next((row for row in rows if selected and row.get("id") == selected.get("id")), {})
    return {
        "rows": rows,
        "available_columns": DETAILED_COLUMNS,
        "visible_columns": view_state["visible_columns"],
        "column_order": view_state["column_order"],
        "filters": {"search": view_state["search_query"], "column_filters": view_state["filters"]},
        "selected_row": selected_row,
        "toolbox_actions": toolbox_actions(bool(selected), permissions),
        "task_queue_summary": task_queue_summary(all_tasks, queue),
    }


def select_application(apps: list[dict[str, Any]], selected_application_id: str | None) -> dict[str, Any]:
    if not apps:
        return {}
    return next((app for app in apps if app.get("id") == selected_application_id), apps[0])


def ensure_selected_shape(selected: dict[str, Any]) -> dict[str, Any]:
    if not selected:
        return {}
    selected = dict(selected)
    selected.setdefault("details", {})
    selected.setdefault("tasks", [])
    selected.setdefault("todos", [])
    selected.setdefault("notes_records", [])
    selected.setdefault("text_blobs", [])
    selected.setdefault("artifacts", [])
    selected.setdefault("raw_intake", [])
    selected.setdefault("keywords", [])
    return selected


def selected_user_view_blob(selected: dict[str, Any]) -> dict[str, Any]:
    if not selected:
        return {}
    return next(
        (
            blob
            for blob in selected.get("text_blobs", [])
            if blob.get("blob_type") == "user_view"
            and blob.get("source_context") == f"candidature:{selected.get('id')}:user_view"
        ),
        {},
    )


def first_keyword(selected: dict[str, Any]) -> str:
    keywords = selected.get("keywords", []) if selected else []
    return keywords[0] if keywords else ""


def load_career_plans(conn: Any | None) -> list[dict[str, Any]]:
    if conn is None or list_career_plans is None:
        return []
    return list_career_plans(conn)


def group_profile_facts(profile_facts: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for fact in profile_facts:
        grouped.setdefault(fact.get("fact_type", "other"), []).append(fact)
    return grouped


def build_search_result(conn: Any | None, search_query: str | None) -> dict[str, Any]:
    if conn is None or not search_query:
        return {"available": True, "results": []}
    try:
        rebuild_index(conn)
        return search(conn, search_query)
    except SearchUnavailable as exc:
        return {"available": False, "error": str(exc), "results": []}


def candidature_summary(app: dict[str, Any]) -> dict[str, Any]:
    artifacts = app.get("artifacts", []) or []
    return {
        "id": app.get("id", ""),
        "company": app.get("company", ""),
        "role": app.get("role", ""),
        "status": app.get("status", "draft"),
        "priority": app.get("priority", "normal"),
        "next_action": app.get("next_action", ""),
        "source": app.get("source", ""),
        "source_url": app.get("source_url", ""),
        "location": app.get("location", ""),
        "remote_mode": app.get("remote_mode", ""),
        "keywords": app.get("keywords", []) or [],
        "last_activity": app.get("last_activity") or app.get("updated_at") or app.get("created_at") or "",
        "artifact_summary": artifact_summary(artifacts),
    }


def selected_candidature_detail(selected: dict[str, Any]) -> dict[str, Any]:
    if not selected:
        return {}
    return {
        "id": selected.get("id", ""),
        "company": selected.get("company", ""),
        "role": selected.get("role", ""),
        "status": selected.get("status", ""),
        "priority": selected.get("priority", ""),
        "location": selected.get("location", ""),
        "remote_mode": selected.get("remote_mode", ""),
        "source_url": selected.get("source_url", ""),
        "next_action": selected.get("next_action", ""),
        "pitch": selected.get("pitch", ""),
        "risks_to_avoid": selected.get("risks_to_avoid", ""),
        "smart_question": selected.get("smart_question", ""),
        "prepare_first": selected.get("prepare_first", ""),
        "prepare_later": selected.get("prepare_later", ""),
        "call_signals": selected.get("call_signals", ""),
        "offer_snapshot": selected.get("offer_snapshot") or selected.get("details", {}).get("description", ""),
        "keywords": selected.get("keywords", []) or [],
    }


def primary_note_state(selected: dict[str, Any], permissions: dict[str, Any]) -> dict[str, Any]:
    return {
        "application_id": selected.get("id", "") if selected else "",
        "value": selected.get("notes", "") if selected else "",
        "source": "applications.notes",
        "visible": bool(selected),
        "editable": bool(selected) and permissions["can_write"],
        "history_count": len(selected.get("notes_records", [])) if selected else 0,
    }


def artifact_summary(artifacts: list[dict[str, Any]]) -> dict[str, Any]:
    current = [artifact for artifact in artifacts if artifact.get("review_state") != "archived"]
    archived = [artifact for artifact in artifacts if artifact.get("review_state") == "archived"]
    states: dict[str, int] = {}
    for artifact in artifacts:
        state = artifact.get("review_state", "draft")
        states[state] = states.get(state, 0) + 1
    return {
        "count": len(artifacts),
        "current_count": len(current),
        "archived_count": len(archived),
        "states": states,
        "current": current,
        "archived": archived,
    }


def call_card(selected: dict[str, Any]) -> dict[str, str]:
    if not selected:
        return {}
    return {
        "pitch": selected.get("pitch", ""),
        "risk_to_avoid": selected.get("risks_to_avoid", ""),
        "smart_question": selected.get("smart_question") or selected.get("details", {}).get("questions_to_ask", ""),
        "prepare_first": selected.get("prepare_first", ""),
        "prepare_later": selected.get("prepare_later", ""),
        "call_signals": selected.get("call_signals", ""),
    }


def detailed_row(app: dict[str, Any]) -> dict[str, Any]:
    artifacts = app.get("artifacts", []) or []
    summary = artifact_summary(artifacts)
    return {
        "id": app.get("id", ""),
        "company": app.get("company", ""),
        "role": app.get("role", ""),
        "status": app.get("status", "draft"),
        "priority": app.get("priority", "normal"),
        "next_action": app.get("next_action", ""),
        "source": app.get("source", ""),
        "source_url": app.get("source_url", ""),
        "location": app.get("location", ""),
        "remote_mode": app.get("remote_mode", ""),
        "keywords": ", ".join(app.get("keywords", []) or []),
        "artifacts_state": ", ".join(f"{state}:{count}" for state, count in sorted(summary["states"].items())),
        "notes_excerpt": excerpt(app.get("notes", "")),
        "created_at": app.get("created_at", ""),
        "updated_at": app.get("updated_at", ""),
        "raw": app,
    }


def toolbox_actions(has_selected_row: bool, permissions: dict[str, Any]) -> list[dict[str, Any]]:
    if has_selected_row:
        return [
            action("generate_cv", "Generate CV", enabled=permissions["can_write"]),
            action("generate_cover_letter", "Generate cover letter", enabled=permissions["can_write"]),
            action("generate_fit_report", "Generate job-market adequacy report", enabled=permissions["can_write"]),
            action("generate_interview_guide", "Generate interview guide", enabled=permissions["can_write"]),
            action("prepare_recruiter_call", "Prepare recruiter call", enabled=permissions["can_write"]),
            action("review_fit", "Review fit", enabled=permissions["can_write"]),
            action("create_form_answers", "Create/update form answers", enabled=permissions["can_write"]),
            action("attach_artifact", "Attach artifact", enabled=permissions["can_write"]),
            action("archive_candidature", "Archive candidature", enabled=permissions["can_write"]),
        ]
    return [
        action("career_path_edit", "Career path edit", target_view="userView", enabled=permissions["can_write"]),
        action("strategy", "Strategy", target_view="userView", enabled=permissions["can_write"]),
        action("personal_data", "Personal data", target_view="userView", enabled=permissions["can_write"]),
        action("cv_fields", "CV fields", target_view="userView", enabled=permissions["can_write"]),
        action("template_config", "Template config", target_view="userView", enabled=permissions["can_write"]),
        action("view_config", "View config", target_view="detailedView", enabled=permissions["can_write"]),
        action("agent_task_settings", "Agent/task settings", target_view="userView", enabled=permissions["can_write"]),
        action("import_create_candidature", "Import/create candidature", panel="new-candidature", enabled=permissions["can_write"]),
    ]


def task_queue_summary(all_tasks: list[dict[str, Any]], queue: list[dict[str, Any]]) -> dict[str, Any]:
    queued_running_states = {"queued", "claimed", "in_progress", "blocked"}
    groups = {
        "pending": [task for task in all_tasks if task.get("state") in queued_running_states],
        "queued_running": [task for task in all_tasks if task.get("state") in queued_running_states],
        "review_needed": queue,
        "failed": [task for task in all_tasks if task.get("state") == "failed"],
        "deferred": [task for task in all_tasks if task.get("state") == "deferred"],
        "recently_completed": [task for task in all_tasks if task.get("state") == "completed"][:5],
    }
    return {
        "groups": {name: {"count": len(items), "items": items[:8]} for name, items in groups.items()},
        "total_open": len(groups["pending"]),
        "human_facing": True,
    }


def normalized_column_order(column_order: list[str] | None) -> list[str]:
    available = [column["key"] for column in DETAILED_COLUMNS]
    if not column_order:
        return available
    ordered = [column for column in column_order if column in available]
    return ordered + [column for column in available if column not in ordered]


def normalized_visible_columns(visible_columns: list[str] | None, column_order: list[str]) -> list[str]:
    if visible_columns is None:
        visible_columns = DEFAULT_VISIBLE_COLUMNS
    visible = [column for column in visible_columns if column in column_order]
    return visible or [column for column in DEFAULT_VISIBLE_COLUMNS if column in column_order]


def important_applications(apps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    priority_order = {"high": 0, "normal": 1, "low": 2}
    return sorted(
        apps,
        key=lambda item: (
            priority_order.get(str(item.get("priority") or "normal"), 1),
            0 if item.get("next_action") else 1,
            str(item.get("updated_at") or item.get("created_at") or ""),
        ),
    )[:6]


def action(
    action_id: str,
    label: str,
    *,
    target_view: str | None = None,
    panel: str | None = None,
    enabled: bool = True,
) -> dict[str, Any]:
    return {"id": action_id, "label": label, "target_view": target_view or "", "panel": panel or "", "enabled": enabled}


def excerpt(value: Any, limit: int = 96) -> str:
    text = str(value or "").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"
