from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_path
from aaaat.db import connect, init_db
from aaaat.desktop_view_projection import build_desktop_view_projection
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


def build_desktop_projection(storage: str | Path, mode: Mode | str, layout_state: DashboardLayoutState | None = None) -> dict[str, Any]:
    """Build the current desktop projection without importing any GUI toolkit."""

    init_db(storage)
    layout = layout_state or DashboardLayoutState.load(layout_state_path(storage))
    with connect(storage) as conn:
        payload = dashboard_payload(conn, include_raw=True)
    return build_desktop_view_projection(payload, Mode(mode), view=layout.selected_view, layout_state=layout)


def launch_desktop_dashboard(storage: str | Path = ".private", *, read_only: bool = False) -> int:
    """Launch the local desktop dashboard.

    wxPython is an optional desktop dependency. The import is deliberately kept
    inside this function so tests and non-desktop AAAAT workflows do not require
    wx or a graphical environment.
    """

    try:
        import wx  # type: ignore[import-not-found]
    except ModuleNotFoundError as exc:  # pragma: no cover - depends on optional dependency
        raise RuntimeError("wxPython is required for the desktop dashboard. Install AAAAT with the desktop extra: pip install -e .[desktop]") from exc

    from .main_window import DesktopDashboardFrame
    from .services import DesktopCommandService

    mode = Mode.READ_ONLY if read_only else Mode.FULL
    init_db(storage)
    layout_path = layout_state_path(storage)
    layout = DashboardLayoutState.load(layout_path)
    projection = build_desktop_projection(storage, mode, layout)

    app = wx.App(False)
    frame = DesktopDashboardFrame(
        storage_path=str(storage),
        mode=mode,
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
    parser.add_argument("--read-only", action="store_true")
    args = parser.parse_args(argv)
    return launch_desktop_dashboard(args.storage, read_only=args.read_only)


if __name__ == "__main__":
    raise SystemExit(main())
