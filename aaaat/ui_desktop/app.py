from __future__ import annotations

import argparse
import sys
from pathlib import Path

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode

from .main_window import DesktopDashboardFrame
from .services import DesktopCommandService


def launch_desktop_dashboard(storage_path: str | Path) -> int:
    try:
        import wx  # type: ignore[import-not-found]
    except ImportError as exc:
        raise SystemExit("The desktop UI requires wxPython. Install AAAAT with the desktop extra.") from exc

    storage = Path(storage_path)
    init_db(storage)
    layout_path = storage / "dashboard-layout.json" if not storage.suffix else storage.parent / "dashboard-layout.json"
    layout = DashboardLayoutState.load(layout_path)
    with connect(storage) as conn:
        payload = dashboard_payload(conn, include_raw=True)
    projection = build_dashboard_projection(
        payload,
        Mode.FULL,
        view=layout.selected_view,
        selected_application_id=layout.selected_candidature_ref,
        selected_keyword=layout.selected_keyword,
        search_query=layout.search_query,
        layout_state=layout,
    )
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
    sys.exit(main())
