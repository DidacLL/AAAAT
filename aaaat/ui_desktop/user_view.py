from __future__ import annotations

import wx  # type: ignore[import-not-found]

from aaaat.workspace_config import config_dir, ensure_workspace_config, templates_dir, validate_workspace_config
from .profile_facts_dialog import ProfileFactsDialog
from .user_panel import UserPanel


class UserViewMixin:
    """User/Profile view for professional context and transparent local configuration."""

    def _build_user_surface(self) -> None:
        self.user_panel = wx.Panel(self.view_book)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.user_panel.SetSizer(sizer)
        self.user_content = UserPanel(
            self.user_panel,
            on_save=self._save_user_edits,
            on_manage_facts=self._manage_profile_facts,
            on_open_config=self._open_config_folder,
            on_open_templates=self._open_templates_folder,
            on_reload_config=self._reload_workspace_config,
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
            self.user_content.render(self.projection)
            self.user_panel.Layout()
        finally:
            self.user_panel.Thaw()

    def _save_user_edits(self, changes: dict[str, str]) -> None:
        self.command_service.update_profile_variables(changes)
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._refresh_user_view()
        self._mark_current_view_rendered()

    def _manage_profile_facts(self) -> None:
        dialog = ProfileFactsDialog(self, service=self.command_service)
        try:
            dialog.ShowModal()
        finally:
            dialog.Destroy()
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _open_config_folder(self) -> None:
        paths = ensure_workspace_config(self.storage_path)
        self._open_local_path(str(paths["config_dir"]))

    def _open_templates_folder(self) -> None:
        ensure_workspace_config(self.storage_path)
        self._open_local_path(str(templates_dir(self.storage_path)))

    def _reload_workspace_config(self) -> None:
        try:
            result = validate_workspace_config(self.storage_path)
        except (ValueError, OSError) as exc:
            wx.MessageBox(str(exc), "Configuration error", wx.OK | wx.ICON_ERROR, self)
            return
        wx.MessageBox(
            f"Configuration valid.\n\nAutomatic preparation: {', '.join(result['settings']['automatic_preparation']) or 'none'}",
            "AAAAT",
            wx.OK | wx.ICON_INFORMATION,
            self,
        )

    def _open_local_path(self, path: str) -> None:
        if not wx.LaunchDefaultApplication(path):
            wx.MessageBox(f"Could not open: {path}", "AAAAT", wx.OK | wx.ICON_ERROR, self)
