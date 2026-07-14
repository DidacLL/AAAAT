from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.assistance_service import (
    assistance_snapshot,
    save_integration,
    use_manual_integration,
    use_recommended_local_integration,
)

from .assistance_panel import AssistancePanel
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

        self.assistance_panel = AssistancePanel(
            self.user_workspace,
            on_save_integration=self._save_integration,
            on_recommended=self._use_recommended_integration,
            on_manual=self._use_manual_integration,
            on_run_task=self._run_assistance_task,
            on_retry_task=self._retry_assistance_task,
            on_cancel_task=self._cancel_assistance_task,
        )
        self.user_workspace.AddPage(self.assistance_panel, "Assistance")

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
            self.assistance_panel.render(assistance_snapshot(self.storage_path, include_advanced=True))
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

    def _save_integration(self, adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
        result = save_integration(self.storage_path, adapter_id, settings)
        if result.get("saved"):
            self.SetStatusText("Integration tested and saved")
        else:
            self.SetStatusText("Integration test failed; previous setup preserved")
        self.assistance_panel.render(assistance_snapshot(self.storage_path, include_advanced=True))
        return result

    def _use_recommended_integration(self) -> dict[str, Any]:
        result = use_recommended_local_integration(self.storage_path)
        self.SetStatusText("Recommended local integration ready" if result.get("saved") else "Recommended local integration unavailable")
        self.assistance_panel.render(assistance_snapshot(self.storage_path, include_advanced=True))
        return result

    def _use_manual_integration(self) -> dict[str, Any]:
        result = use_manual_integration(self.storage_path)
        self.SetStatusText("Portable/manual assistance selected")
        self.assistance_panel.render(assistance_snapshot(self.storage_path, include_advanced=True))
        return result

    def _run_assistance_task(self, task_id: str) -> None:
        self.task_worker.submit(task_id)
        self.SetStatusText("Assistance task queued")
        self.assistance_panel.render(assistance_snapshot(self.storage_path, include_advanced=True))

    def _retry_assistance_task(self, task_id: str) -> None:
        try:
            self.task_worker.retry(task_id)
        except ValueError as exc:
            self.SetStatusText(str(exc))
            return
        self.SetStatusText("Assistance task queued for retry")
        self.assistance_panel.render(assistance_snapshot(self.storage_path, include_advanced=True))

    def _cancel_assistance_task(self, task_id: str) -> None:
        self.task_worker.cancel(task_id)
        self.SetStatusText("Assistance task cancelled")
        self.assistance_panel.render(assistance_snapshot(self.storage_path, include_advanced=True))

    def _on_task_worker_event(self, event: dict[str, Any]) -> None:
        wx.CallAfter(self._apply_task_worker_event, dict(event))

    def _apply_task_worker_event(self, event: dict[str, Any]) -> None:
        state = str(event.get("state") or "")
        message = str(event.get("message") or "")
        self.SetStatusText(message or f"Assistance task: {state}")
        self._rendered_view_keys.clear()
        self._reload_projection()
        if hasattr(self, "assistance_panel"):
            self.assistance_panel.render(assistance_snapshot(self.storage_path, include_advanced=True))
        if state in {"completed", "failed", "cancelled"}:
            self._refresh_all()
