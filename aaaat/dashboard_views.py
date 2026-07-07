from __future__ import annotations

from pathlib import Path
from typing import Any

from .candidatures import get_candidature
from .keywords import list_keywords
from .search import SearchUnavailable, rebuild_index, search
from .security import Mode, can_show_raw_intake, can_write
from .tasks import OPEN_TASK_STATES, list_tasks
from .todos import list_todos


VIEW_MODES = {"welcomeView", "smartView", "detailedView", "userView"}
FRAGMENTS = {
    "candidature-list": "partials/candidature_list.html",
    "search-results": "partials/candidature_list.html",
    "selected-card": "partials/selected_card.html",
    "inspector": "partials/inspector.html",
    "keyword-panel": "partials/inspector.html",
    "task-panel": "partials/selected_card.html",
    "todo-panel": "partials/selected_card.html",
    "note-panel": "partials/selected_card.html",
    "blob-panel": "partials/selected_card.html",
    "new-candidature-result": "partials/inspector.html",
}


def normalize_view(view: str | None) -> str:
    return view if view in VIEW_MODES else "welcomeView"


def render_dashboard_view(
    payload: dict[str, Any],
    mode: Mode | str = Mode.FULL,
    *,
    view: str | None = None,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
    search_query: str | None = None,
    view_model: dict[str, Any] | None = None,
) -> str:
    model = view_model or dashboard_view_model(
        payload,
        mode,
        view=view,
        selected_application_id=selected_application_id,
        selected_keyword=selected_keyword,
        search_query=search_query,
    )
    env = dashboard_environment()
    return env.get_template("dashboard.html").render(**model)


def render_dashboard_fragment(fragment: str, view_model: dict[str, Any]) -> str:
    if fragment not in FRAGMENTS:
        raise KeyError(f"Unknown dashboard fragment: {fragment}")
    env = dashboard_environment()
    return env.get_template(FRAGMENTS[fragment]).render(**view_model)


def dashboard_environment() -> Any:
    try:
        from jinja2 import Environment, FileSystemLoader, select_autoescape
    except ModuleNotFoundError as exc:  # pragma: no cover - exercised only without installed deps
        raise RuntimeError("Jinja2 is required for dashboard view templates") from exc

    template_dir = Path(__file__).with_name("templates_ui")
    env = Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.globals.update(can_write=can_write, can_show_raw_intake=can_show_raw_intake)
    return env


def dashboard_view_model(
    payload: dict[str, Any],
    mode: Mode | str = Mode.FULL,
    *,
    view: str | None = None,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
    search_query: str | None = None,
    conn: Any | None = None,
) -> dict[str, Any]:
    mode = Mode(mode)
    apps = payload.get("applications", [])
    selected = next((app for app in apps if app.get("id") == selected_application_id), apps[0] if apps else {})
    if conn is not None and selected:
        selected = get_candidature(conn, selected["id"], include_related=True)
    keywords = selected.get("keywords", []) if selected else []
    selected_term = selected_keyword or (keywords[0] if keywords else "")
    queue = payload.get("review_queue", [])
    all_tasks = list_tasks(conn) if conn is not None else []
    open_tasks = [item for item in all_tasks if item.get("state") in OPEN_TASK_STATES]
    all_todos = list_todos(conn) if conn is not None else []
    open_todos = [item for item in all_todos if item.get("state") == "open"]
    pinned_todos = [item for item in open_todos if item.get("pinned")]
    glossary = list_keywords(conn) if conn is not None else payload.get("glossary", [])
    selected_keyword_item = next((item for item in glossary if item.get("term") == selected_term), {})
    search_result = {"available": True, "results": []}
    if conn is not None and search_query:
        try:
            rebuild_index(conn)
            search_result = search(conn, search_query)
        except SearchUnavailable as exc:
            search_result = {"available": False, "error": str(exc), "results": []}
    return {
        "payload": payload,
        "mode": mode,
        "view": normalize_view(view),
        "view_modes": sorted(VIEW_MODES),
        "applications": apps,
        "selected": selected,
        "selected_keyword": selected_term,
        "queue": queue,
        "selected_queue": [item for item in queue if selected and item.get("application_id") == selected.get("id")],
        "open_tasks": open_tasks,
        "open_todos": open_todos,
        "pinned_todos": pinned_todos,
        "keywords": glossary,
        "selected_keyword_item": selected_keyword_item,
        "search_query": search_query or "",
        "search_result": search_result,
    }
