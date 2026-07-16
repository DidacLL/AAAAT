from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_path
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect
from aaaat.payload import dashboard_payload
from aaaat.upgrade import upgrade_storage
from aaaat.desktop_workspace import default_desktop_workspace, save_desktop_workspace, selected_desktop_workspace


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


def _select_first_run_workspace(wx: Any) -> Path | None:
    """Ask once where the user wants AAAAT to keep its private workspace."""

    suggested = default_desktop_workspace()
    suggested.mkdir(parents=True, exist_ok=True)
    message = (
        "Choose where AAAAT keeps your private job-search workspace. "
        "This folder stays on this computer and can be backed up later."
    )
    while True:
        with wx.DirDialog(
            None,
            message,
            defaultPath=str(suggested),
            style=wx.DD_DEFAULT_STYLE | wx.DD_DIR_MUST_EXIST,
        ) as dialog:
            if dialog.ShowModal() != wx.ID_OK:
                return None
            try:
                return save_desktop_workspace(dialog.GetPath())
            except ValueError as exc:
                wx.MessageBox(str(exc), "Choose another folder", wx.OK | wx.ICON_WARNING)


def launch_desktop_dashboard(storage: str | Path | None = None) -> int:
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

    if storage is None:
        storage = selected_desktop_workspace()
        if storage is None:
            storage = _select_first_run_workspace(wx)
            if storage is None:
                return 0
        else:
            storage = save_desktop_workspace(storage)

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
    parser.add_argument("--storage", help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    return launch_desktop_dashboard(args.storage)


if __name__ == "__main__":
    raise SystemExit(main())
