from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_path
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect
from aaaat.payload import dashboard_payload
from aaaat.upgrade import upgrade_storage


def build_desktop_projection(storage: str | Path, layout_state: DashboardLayoutState | None = None) -> dict[str, Any]:
    """Build the current desktop projection without importing any GUI toolkit."""

    upgrade_storage(storage)
    layout = layout_state or DashboardLayoutState.load(layout_state_path(storage))
    with connect(storage) as conn:
        payload = dashboard_payload(conn, include_raw=True)
    requested_view = layout.selected_view
    if not payload.get("applications") and requested_view in {"smart", "detailed"}:
        requested_view = "welcome"
    return build_dashboard_projection(payload, view=requested_view, layout_state=layout)


def launch_desktop_dashboard(storage: str | Path = ".private") -> int:
    """Launch the local desktop app.

    wxPython is an optional desktop dependency. The import is deliberately kept
    inside this function so tests and non-desktop AAAAT workflows do not require
    wx or a graphical environment.
    """
    try:
        import wx  # type: ignore[import-not-found]
    except ModuleNotFoundError as exc:  # pragma: no cover - depends on optional dependency
        raise RuntimeError(
            "wxPython is required for the desktop app. Install AAAAT with the desktop extra: pip install .[desktop]"
        ) from exc

    from .main_window import DesktopDashboardFrame
    from .services import DesktopCommandService

    upgrade_storage(storage)
    layout_path = layout_state_path(storage)
    layout = DashboardLayoutState.load(layout_path)
    projection = build_desktop_projection(storage, layout)

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
    parser = argparse.ArgumentParser(prog="aaaat-desktop")
    parser.add_argument("--storage", default=".private")
    args = parser.parse_args(argv)
    return launch_desktop_dashboard(args.storage)


if __name__ == "__main__":
    raise SystemExit(main())
