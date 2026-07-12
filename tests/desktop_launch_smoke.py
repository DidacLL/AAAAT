from __future__ import annotations

import tempfile
import traceback
from pathlib import Path

import wx  # type: ignore[import-not-found]

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_path
from aaaat.db import init_db
from aaaat.security import Mode
from aaaat.ui_desktop.app import build_desktop_projection
from aaaat.ui_desktop.main_window import DesktopDashboardFrame
from aaaat.ui_desktop.services import DesktopCommandService


def main() -> int:
    try:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp)
            init_db(storage)
            layout_path = layout_state_path(storage)
            layout = DashboardLayoutState.load(layout_path)
            projection = build_desktop_projection(storage, Mode.FULL, layout)

            app = wx.App(False)
            frame = DesktopDashboardFrame(
                storage_path=str(storage),
                mode=Mode.FULL,
                projection=projection,
                layout_state=layout,
                layout_path=layout_path,
                command_service=DesktopCommandService(storage),
            )
            frame.Show(False)
            app.Yield()
            frame.Destroy()
            app.Yield()
        return 0
    except Exception:
        Path("desktop-launch-error.txt").write_text(traceback.format_exc(), encoding="utf-8")
        raise


if __name__ == "__main__":
    raise SystemExit(main())
