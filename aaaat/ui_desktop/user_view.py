from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

from .profile_facts_panel import ProfileFactsPanel
from .user_panel import UserPanel


class UserViewMixin:
    """User/Profile View foundation for local desktop profile context."""

    def _build_user_surface(self) -> None:
        self.user_panel = wx.Panel(self.view_book)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.user_panel.SetSizer(sizer)
        self.user_workspace = wx.Notebook(self.user_panel)

        self.user_content = UserPanel(
            self.user_workspace,
            on_save=self._save_user_edits,
            on_cancel=self._cancel_user_edits,
        )
        self.user_workspace.AddPage(self.user_content, "Profile")

        self.evidence_scroll = wx.ScrolledWindow(self.user_workspace, style=wx.VSCROLL)
        self.evidence_scroll.SetScrollRate(0, 12)
        self.evidence_sizer = wx.BoxSizer(wx.VERTICAL)
        self.evidence_scroll.SetSizer(self.evidence_sizer)
        self.user_workspace.AddPage(self.evidence_scroll, "Reusable evidence")

        sizer.Add(self.user_workspace, 1, wx.ALL | wx.EXPAND, 0)
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
            self.user_content.render(self.projection, can_edit=True)
            self._render_profile_facts()
            self.user_panel.Layout()
        finally:
            self.user_panel.Thaw()

    def _render_profile_facts(self) -> None:
        self.evidence_sizer.Clear(delete_windows=True)
        self.profile_facts_panel = ProfileFactsPanel(
            self.evidence_scroll,
            facts=self.command_service.list_profile_facts(),
            can_edit=True,
            on_create=self._create_profile_fact,
            on_update=self._update_profile_fact,
            on_archive=self._archive_profile_fact,
            on_geometry_changed=self._refresh_evidence_geometry,
        )
        self.evidence_sizer.Add(self.profile_facts_panel, 0, wx.ALL | wx.EXPAND, 10)
        self._refresh_evidence_geometry()

    def _refresh_evidence_geometry(self) -> None:
        try:
            self.evidence_scroll.Layout()
            self.evidence_scroll.FitInside()
        except RuntimeError:
            pass

    def _create_profile_fact(self, fields: dict[str, Any]) -> list[dict[str, Any]]:
        facts = self.command_service.create_profile_fact(fields)
        self.SetStatusText("Reusable evidence saved")
        return facts

    def _update_profile_fact(self, fact_id: str, fields: dict[str, Any]) -> list[dict[str, Any]]:
        facts = self.command_service.update_profile_fact(fact_id, fields)
        self.SetStatusText("Reusable evidence updated")
        return facts

    def _archive_profile_fact(self, fact_id: str) -> list[dict[str, Any]]:
        facts = self.command_service.archive_profile_fact(fact_id)
        self.SetStatusText("Reusable evidence archived")
        return facts

    def _save_user_edits(self, changes: dict[str, str]) -> None:
        saved = self.command_service.update_profile_variables(changes)
        if not saved:
            self.SetStatusText("No profile changes were saved")
            return
        self._reload_projection()
        self._rendered_view_keys["user"] = self._view_cache_key("user")
        self.SetStatusText("Profile saved")

    def _cancel_user_edits(self) -> None:
        self._refresh_user_view()
        self._mark_current_view_rendered()
