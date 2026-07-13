from __future__ import annotations

import tempfile
from pathlib import Path

import wx  # type: ignore[import-not-found]

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_path
from aaaat.db import connect, create_application, init_db
from aaaat.ui_desktop.app import build_desktop_projection
from aaaat.ui_desktop.main_window import DesktopDashboardFrame
from aaaat.ui_desktop.services import DesktopCommandService


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        storage = Path(tmp)
        init_db(storage)
        with connect(storage) as conn:
            app_row = create_application(conn, company="Smoke Co", role="Engineer")
        app = wx.App(False)
        for view in ("smart", "detailed", "user"):
            layout = DashboardLayoutState.default()
            layout.selected_view = view
            layout.selected_candidature_ref = app_row["id"]
            projection = build_desktop_projection(storage, "full", layout)
            frame = DesktopDashboardFrame(
                storage_path=str(storage),
                mode="full",
                projection=projection,
                layout_state=layout,
                layout_path=layout_state_path(storage),
                command_service=DesktopCommandService(storage),
            )
            frame.Show(False)
            app.Yield()
            if view == "detailed":
                frame._open_selected_in_smart()
                app.Yield()
            frame.Destroy()
            app.Yield()


if __name__ == "__main__":
    main()
