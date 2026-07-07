from __future__ import annotations

from pathlib import Path
from typing import Any

from .security import Mode, can_show_raw_intake, can_write


VIEW_MODES = {"welcomeView", "smartView", "detailedView", "userView"}


def normalize_view(view: str | None) -> str:
    return view if view in VIEW_MODES else "welcomeView"


def render_dashboard_view(
    payload: dict[str, Any],
    mode: Mode | str = Mode.FULL,
    *,
    view: str | None = None,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
) -> str:
    try:
        from jinja2 import Environment, FileSystemLoader, select_autoescape
    except ModuleNotFoundError as exc:  # pragma: no cover - exercised only without installed deps
        raise RuntimeError("Jinja2 is required for dashboard view templates") from exc

    mode = Mode(mode)
    apps = payload.get("applications", [])
    selected = next((app for app in apps if app.get("id") == selected_application_id), apps[0] if apps else {})
    keywords = selected.get("keywords", []) if selected else []
    selected_term = selected_keyword or (keywords[0] if keywords else "")
    queue = payload.get("review_queue", [])
    template_dir = Path(__file__).with_name("templates_ui")
    env = Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.globals.update(can_write=can_write, can_show_raw_intake=can_show_raw_intake)
    return env.get_template("dashboard.html").render(
        payload=payload,
        mode=mode,
        view=normalize_view(view),
        view_modes=sorted(VIEW_MODES),
        applications=apps,
        selected=selected,
        selected_keyword=selected_term,
        queue=queue,
        selected_queue=[item for item in queue if selected and item.get("application_id") == selected.get("id")],
    )
