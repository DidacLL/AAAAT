from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_path
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


def build_desktop_projection(
    storage: str | Path,
    mode: Mode | str = Mode.FULL,
    layout_state: DashboardLayoutState | None = None,
) -> dict[str, Any]:
    """Build the desktop projection without importing the optional GUI toolkit."""

    init_db(storage)
    layout = layout_state or DashboardLayoutState.load(layout_state_path(storage))
    with connect(storage) as conn:
        payload = dashboard_payload(conn, include_raw=True)
    return build_dashboard_projection(
        payload,
        Mode(mode),
        view=layout.selected_view,
        selected_application_id=layout.selected_candidature_ref,
        selected_keyword=layout.selected_keyword,
        search_query="",
        layout_state=layout,
    )


def launch_desktop_dashboard(storage_path: str | Path = ".private") -> int:
    """Launch the editable local desktop workspace."""

    try:
        import wx  # type: ignore[import-not-found]
    except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "wxPython is required for the desktop workspace. "
            "Install AAAAT with the desktop extra: pip install -e .[desktop]"
        ) from exc

    from .main_window import DesktopDashboardFrame
    from .services import DesktopCommandService

    storage = Path(storage_path)
    init_db(storage)
    layout_path = layout_state_path(storage)
    layout = DashboardLayoutState.load(layout_path)
    projection = build_desktop_projection(storage, Mode.FULL, layout)

    app = wx.App(False)
    frame = DesktopDashboardFrame(
        storage_path=str(storage),
        projection=projection,
        layout_state=layout,
        layout_path=layout_path,
        command_service=DesktopCommandService(storage),
    )
    frame.Show()
    app.MainLoop()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="aaaat-desktop", description="Launch the local AAAAT desktop workspace.")
    parser.add_argument("--storage", default=".private", help="AAAAT storage directory or SQLite path")
    args = parser.parse_args(argv)
    return launch_desktop_dashboard(args.storage)


if __name__ == "__main__":
    raise SystemExit(main())
