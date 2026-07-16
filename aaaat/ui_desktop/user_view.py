from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.host_connection import connection_handoff_message, connection_status, revoke_workspace_connections
from aaaat.assistance_service import (
    assistance_snapshot,
    create_profile_completion_task,
    run_integration_conformance,
    save_integration,
    use_manual_integration,
)
from aaaat.background_worker import OwnedTaskWorker
from aaaat.portable_task_bundle import export_candidature_task_bundle, import_candidature_result_bundle

from .assistance_panel import AssistancePanel
from .connector_onboarding_panel import ConnectorOnboardingPanel
from .portable_bundle_panel import PortableBundlePanel
from .profile_facts_panel import ProfileFactsPanel
from .user_panel import UserPanel


class UserViewMixin:
    """User/Profile View foundation for local desktop profile context."""

    def _build_user_surface(self) -> None:
        self._task_worker: OwnedTaskWorker | None = None
        self._task_progress: dict[str, dict[str, Any]] = {}
        self._conformance_thread: threading.Thread | None = None
        self.user_panel = wx.Panel(self.view_book)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.user_panel.SetSizer(sizer)
        self.user_workspace = wx.Notebook(self.user_panel)

        self.user_content = UserPanel(self.user_workspace, on_save=self._save_user_edits, on_cancel=self._cancel_user_edits)
        self.user_workspace.AddPage(self.user_content, "Profile")

        self.evidence_scroll = wx.ScrolledWindow(self.user_workspace, style=wx.VSCROLL)
        self.evidence_scroll.SetScrollRate(0, 12)
        self.evidence_sizer = wx.BoxSizer(wx.VERTICAL)
        self.evidence_scroll.SetSizer(self.evidence_sizer)
        self.user_workspace.AddPage(self.evidence_scroll, "Reusable evidence")

        self.assistance_panel = AssistancePanel(
            self.user_workspace,
            on_select_mode=self._select_connection_mode,
            on_disconnect=self._pause_ai_connection,
            on_save_integration=self._save_integration,
            on_conformance=self._run_conformance,
            on_create_profile_task=self._create_profile_completion_task,
            on_run_task=self._run_assistance_task,
            on_retry_task=self._retry_assistance_task,
            on_cancel_task=self._cancel_assistance_task,
        )
        self.user_workspace.AddPage(self.assistance_panel, "Assistance")

        self.connector_panel = ConnectorOnboardingPanel(
            self.user_workspace,
            on_prepare_connection=self._prepare_connection_handoff,
            on_connection_status=lambda: connection_status(self.storage_path),
            on_disconnect=self._pause_ai_connection,
        )
        self.user_workspace.AddPage(self.connector_panel, "Connect my AI")

        self.portable_bundle_panel = PortableBundlePanel(
            self.user_workspace,
            on_export=self._export_portable_bundle,
            on_import=self._import_portable_bundle,
        )
        self.user_workspace.AddPage(self.portable_bundle_panel, "Advanced files")

        sizer.Add(self.user_workspace, 1, wx.ALL | wx.EXPAND, 0)
        self.view_book.AddPage(self.user_panel, "User")

    def _bind_user_events(self) -> None:
        self.Bind(wx.EVT_CLOSE, self._stop_task_worker_on_close)

    def _show_user(self) -> None:
        self.current_view = "user"
        self.layout_state.selected_view = "user"
        self._sync_view_tab()

    def _go_user(self) -> None:
        self._show_user()
        self._refresh_current_if_needed()

    def _open_standard_assistance(self, mode_id: str) -> None:
        """Open one guided route from Welcome without exposing setup internals."""
        self._show_user()
        self._select_connection_mode(mode_id)
        self._refresh_current_if_needed()

    def _prepare_connection_handoff(self) -> str:
        return connection_handoff_message(self.storage_path)

    def _assistance_snapshot(self) -> dict[str, Any]:
        return assistance_snapshot(self.storage_path, include_advanced=True, progress_by_task=self._task_progress)

    def _refresh_user_view(self) -> None:
        self.user_panel.Freeze()
        try:
            self.user_content.render(self.projection, can_edit=True)
            self._render_profile_facts()
            self.assistance_panel.render(self._assistance_snapshot())
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

    def _schedule_assistance_refresh(self) -> None:
        wx.CallAfter(self._refresh_user_view)

    def _save_integration(self, adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
        result = save_integration(self.storage_path, adapter_id, settings)
        self.SetStatusText("Advanced integration tested and saved" if result.get("saved") else "Advanced integration test failed; previous setup preserved")
        self._schedule_assistance_refresh()
        return result

    def _select_connection_mode(self, mode_id: str) -> dict[str, Any]:
        if mode_id == "manual":
            result = use_manual_integration(self.storage_path)
            self.SetStatusText("Manual use selected; AI assistance remains optional")
            self._schedule_assistance_refresh()
            return {**result, "message": "Continue manually selected."}
        if mode_id == "guided_connector":
            self._select_user_workspace_page(self.connector_panel)
            self.SetStatusText("External-host connection instructions opened")
            return {"status": "ready", "message": "External-host connection instructions opened."}
        if mode_id == "browser_or_chat":
            self._select_user_workspace_page(self.portable_bundle_panel)
            self.SetStatusText("Advanced file exchange opened")
            return {"status": "ready", "message": "Advanced file exchange opened."}
        if mode_id == "advanced_integration":
            self.SetStatusText("Advanced integration settings opened")
            return {"status": "ready", "message": "Advanced integration settings opened."}
        raise ValueError(f"Unknown connection mode: {mode_id}")

    def _pause_ai_connection(self) -> dict[str, Any]:
        result = revoke_workspace_connections(self.storage_path)
        self.SetStatusText("AI connection paused")
        self._schedule_assistance_refresh()
        return result

    def _select_user_workspace_page(self, page: wx.Window) -> None:
        for index in range(self.user_workspace.GetPageCount()):
            if self.user_workspace.GetPage(index) is page:
                self.user_workspace.SetSelection(index)
                return
        raise RuntimeError("Requested user workspace page is unavailable")

    def _run_conformance(self) -> dict[str, Any]:
        if self._conformance_thread and self._conformance_thread.is_alive():
            return {"status": "running", "message": "Advanced command test is already running."}
        self._conformance_thread = threading.Thread(target=self._conformance_work, name="aaaat-advanced-command-conformance", daemon=False)
        self._conformance_thread.start()
        self.SetStatusText("Advanced command test running")
        return {"status": "running", "message": "Advanced command test started."}

    def _conformance_work(self) -> None:
        try:
            result = run_integration_conformance(self.storage_path)
        except Exception as exc:
            result = {"status": "failed", "message": str(exc)}
        wx.CallAfter(self._apply_conformance_result, result)

    def _apply_conformance_result(self, result: dict[str, Any]) -> None:
        self.SetStatusText(str(result.get("message") or result.get("status") or "Advanced command test complete"))
        if self.current_view == "user":
            self._refresh_user_view()

    def _create_profile_completion_task(self) -> dict[str, Any]:
        task = create_profile_completion_task(self.storage_path)
        self.SetStatusText("Profile completion task ready")
        self._schedule_assistance_refresh()
        return task

    def _ensure_task_worker(self) -> OwnedTaskWorker:
        if self._task_worker is None:
            self._task_worker = OwnedTaskWorker(self.storage_path, on_event=self._on_task_worker_event)
        return self._task_worker

    def _run_assistance_task(self, task_id: str) -> None:
        self._ensure_task_worker().submit(task_id)
        self.SetStatusText("Advanced command task queued")
        self._schedule_assistance_refresh()

    def _retry_assistance_task(self, task_id: str) -> None:
        try:
            self._ensure_task_worker().retry(task_id)
        except ValueError as exc:
            self.SetStatusText(str(exc))
            return
        self.SetStatusText("Advanced command task queued for retry")
        self._schedule_assistance_refresh()

    def _cancel_assistance_task(self, task_id: str) -> None:
        self._ensure_task_worker().cancel(task_id)
        self.SetStatusText("Assistance task cancelled")
        self._schedule_assistance_refresh()

    def _on_task_worker_event(self, event: dict[str, Any]) -> None:
        wx.CallAfter(self._apply_task_worker_event, dict(event))

    def _apply_task_worker_event(self, event: dict[str, Any]) -> None:
        task_id = str(event.get("task_id") or "")
        state = str(event.get("state") or "")
        message = str(event.get("message") or "")
        if task_id:
            previous = self._task_progress.get(task_id) or {}
            if int(event.get("sequence") or 0) >= int(previous.get("sequence") or 0):
                self._task_progress[task_id] = dict(event)
        self.SetStatusText(message or f"Assistance task: {state}")
        self._rendered_view_keys.clear()
        self._reload_projection()
        if state in {"completed", "failed", "cancelled"}:
            self._refresh_all()
        elif self.current_view == "user":
            self._refresh_user_view()

    def _export_portable_bundle(self) -> dict[str, Any] | None:
        candidature_ref = str(self.selected_ref or "")
        if not candidature_ref:
            wx.MessageBox("Select a candidature in Smart or Detailed view first.", "No candidature selected", wx.OK | wx.ICON_INFORMATION, self)
            return None
        default_name = f"aaaat-candidature-tasks-{candidature_ref[-8:]}.aaaat-task.zip"
        with wx.FileDialog(self, "Export bounded candidature tasks", wildcard="AAAAT task bundle (*.aaaat-task.zip)|*.aaaat-task.zip|ZIP archive (*.zip)|*.zip", defaultFile=default_name, style=wx.FD_SAVE | wx.FD_OVERWRITE_PROMPT) as dialog:
            if dialog.ShowModal() != wx.ID_OK:
                return None
            target = Path(dialog.GetPath())
        result = export_candidature_task_bundle(self.storage_path, candidature_ref, target)
        self.SetStatusText(str(result.get("message") or f"Exported {result['task_count']} item(s)"))
        return result

    def _import_portable_bundle(self) -> dict[str, Any] | None:
        with wx.FileDialog(self, "Import AAAAT result bundle", wildcard="AAAAT result bundle (*.aaaat-result.zip)|*.aaaat-result.zip|ZIP archive (*.zip)|*.zip", style=wx.FD_OPEN | wx.FD_FILE_MUST_EXIST) as dialog:
            if dialog.ShowModal() != wx.ID_OK:
                return None
            source = Path(dialog.GetPath())
        result = import_candidature_result_bundle(self.storage_path, source)
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._refresh_all()
        accepted = len(result.get("accepted") or [])
        rejected = len(result.get("rejected") or [])
        self.SetStatusText(
            f"Imported {accepted} result(s); {rejected} could not be applied." if rejected else f"Imported {accepted} result(s)."
        )
        return result

    def _stop_task_worker_on_close(self, event: wx.CloseEvent) -> None:
        if self._task_worker is not None:
            self._task_worker.stop(wait=True)
        if self._conformance_thread and self._conformance_thread.is_alive():
            self._conformance_thread.join(timeout=1)
        event.Skip()
