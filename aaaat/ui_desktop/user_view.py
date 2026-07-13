from __future__ import annotations

import wx  # type: ignore[import-not-found]

from aaaat.security import can_write

from .preparation_settings_dialog import PreparationSettingsDialog
from .user_panel import UserPanel


class UserViewMixin:
    """User/Profile view for reusable professional context and preparation settings."""

    def _build_user_surface(self) -> None:
        self.user_panel = wx.Panel(self.view_book)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.user_panel.SetSizer(sizer)
        self.user_content = UserPanel(
            self.user_panel,
            on_save=self._save_user_edits,
            on_cancel=self._cancel_user_edits,
            on_open_settings=self._open_preparation_settings,
        )
        sizer.Add(self.user_content, 1, wx.EXPAND)
        self.view_book.AddPage(self.user_panel, "User")

    def _bind_user_events(self) -> None:
        pass

    def _show_user(self) -> None:
        self.current_view = "user"
        self.layout_state.selected_view = "user"
        self._sync_view_tab()

    def _go_user(self) -> None:
        self._show_user()
        self._refresh_current_if_needed()

    def _refresh_user_view(self) -> None:
        self.user_panel.Freeze()
        try:
            self.user_content.render(self.projection, can_edit=can_write(self.mode))
            self.user_panel.Layout()
        finally:
            self.user_panel.Thaw()

    def _confirm_user_navigation(self) -> bool:
        return not hasattr(self, "user_content") or self.user_content.confirm_navigation()

    def _save_user_edits(self, changes: dict[str, str]) -> None:
        if not can_write(self.mode):
            return
        self.command_service.update_profile_variables(changes)
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._refresh_user_view()
        self._mark_current_view_rendered()

    def _cancel_user_edits(self) -> None:
        self._refresh_user_view()
        self._mark_current_view_rendered()

    def _open_preparation_settings(self) -> None:
        if not self._confirm_user_navigation():
            return
        dialog = PreparationSettingsDialog(
            self,
            storage_path=self.storage_path,
            on_saved=self._refresh_after_settings_change,
        )
        try:
            dialog.ShowModal()
        finally:
            dialog.Destroy()

    def _refresh_after_settings_change(self) -> None:
        self._rendered_view_keys.clear()
        if self.current_view == "user":
            self._refresh_user_view()
            self._mark_current_view_rendered()
