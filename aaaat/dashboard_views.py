from __future__ import annotations

from pathlib import Path
from typing import Any

from .dashboard_projection import VIEW_MODES, build_dashboard_projection, normalize_view
from .security import Mode, can_show_raw_intake, can_write


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
    """Return the internal dashboard projection consumed by Jinja templates.

    The rendering functions stay in this module. Dashboard state construction lives
    in `aaaat.dashboard_projection` so it can be tested without rendering HTML and
    so it remains clearly separate from the agent runtime.
    """

    return build_dashboard_projection(
        payload,
        mode,
        view=view,
        selected_application_id=selected_application_id,
        selected_keyword=selected_keyword,
        search_query=search_query,
        conn=conn,
    )
