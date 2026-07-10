from __future__ import annotations

import wx  # type: ignore[import-not-found]

from aaaat.security import can_write

from .user_panel import UserPanel


class UserViewMixin:
    """User/Profile View foundation for local desktop profile context."""

    def _build_user_surface(self) -> None:
        self.user_panel = wx.Panel(self.root)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.user_panel.SetSizer(sizer)
        self.user_content = UserPanel(
            self.user_panel,
            on_save=self._save_user_edits,
            on_cancel=self._cancel_user_edits,
        )
        sizer.Add(self.user_content, 1, wx.ALL | wx.EXPAND, 0)
        self.root_sizer.Add(self.user_panel, 1, wx.ALL | wx.EXPAND, 6)

    def _bind_user_events(self) -> None:
        pass

    def _show_user(self) -> None:
        self.current_view = "user"
        self.layout_state.selected_view = "user"
        self.overview_panel.Hide()
        self.focus_panel.Hide()
        self.detailed_panel.Hide()
        self.user_panel.Show()
        self.root_sizer.Layout()
        self.Layout()

    def _go_user(self) -> None:
        self._show_user()
        self._refresh_all()

    def _refresh_user_view(self) -> None:
        self.user_panel.Freeze()
        try:
            self.user_content.render(self.projection, can_edit=can_write(self.mode))
            self.user_panel.Layout()
        finally:
            self.user_panel.Thaw()

    def _save_user_edits(self, changes: dict[str, str]) -> None:
        if not can_write(self.mode):
            return
        self.command_service.update_profile_variables(changes)
        self._reload_projection()
        self._refresh_user_view()

    def _cancel_user_edits(self) -> None:
        self._refresh_user_view()
