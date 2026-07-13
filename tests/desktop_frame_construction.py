from __future__ import annotations

import tempfile
from pathlib import Path

import wx  # type: ignore[import-not-found]

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode
from aaaat.ui_desktop.main_window import DesktopDashboardFrame


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        storage = Path(tmp)
        init_db(storage)
        layout = DashboardLayoutState.default()
        with connect(storage) as conn:
            projection = build_dashboard_projection(
                dashboard_payload(conn, include_raw=True),
                Mode.FULL,
                view="smart",
                layout_state=layout,
            )
        app = wx.App(False)
        frame = DesktopDashboardFrame(
            storage_path=str(storage),
            projection=projection,
            layout_state=layout,
            layout_path=storage / "dashboard-layout.json",
        )
        frame.Show(False)
        app.Yield()
        frame.Destroy()
        app.Yield()


if __name__ == "__main__":
    main()
