from __future__ import annotations

from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.intake import IntakeService
from aaaat.security import Mode
from aaaat.task_workflow import TaskWorkflowError, TaskWorkflowService

from .candidature_sidebar import CandidatureSidebar
from .card_state import CenterCardState
from .detailed_view import DetailedViewMixin
from .new_candidature_dialog import NewCandidatureDialog
from .services import DesktopCommandService
from .smart_view import DEFAULT_CENTER_NOTES_HEIGHT, DEFAULT_FOCUS_LEFT, DEFAULT_FOCUS_RIGHT, DEFAULT_WINDOW_SIZE, SmartViewMixin
from .task_worker import DesktopTaskWorker, TaskProgress
from .user_view import UserViewMixin


class DesktopDashboardFrame(UserViewMixin, DetailedViewMixin, SmartViewMixin, wx.Frame):
    """Top-level desktop workspace. Frame state owns selection and navigation."""

    def __init__(
        self,
        *,
        storage_path: str,
        projection: dict[str, Any],
        layout_state: DashboardLayoutState,
        layout_path: str | Path,
        command_service: DesktopCommandService | None = None,
    ) -> None:
        super().__init__(None, title="AAAAT — Desktop", size=DEFAULT_WINDOW_SIZE)
        self.storage_path = storage_path
        self.mode = Mode.FULL
        self.projection = projection
        self.layout_state = layout_state
        self.layout_path = Path(layout_path)
        self.command_service = command_service or DesktopCommandService(storage_path)
        self.workflow_service = TaskWorkflowService(storage_path)
        self.intake_service = IntakeService(storage_path)
        self.task_worker = DesktopTaskWorker(storage_path)
        self.current_view = str(projection.get("view_state", {}).get("current_view") or layout_state.selected_view or "smart")
        if self.current_view not in {"smart", "detailed", "user"}:
            self.current_view = "smart"
        self.selected_ref = layout_state.selected_candidature_ref
        self.selected_keyword = layout_state.selected_keyword
        self.search_query = str(projection.get("view_state", {}).get("search_query") or "")
        self.expanded_overview_ref: str | None = None
        self.center_card_state = CenterCardState.default()
        self._focus_layout_applied = False
        self.focus_left_width = int(layout_state.pane_layout.get("smart", {}).get("left", DEFAULT_FOCUS_LEFT))
        self.focus_right_width = int(layout_state.pane_layout.get("smart", {}).get("right", DEFAULT_FOCUS_RIGHT))
        self._list_refs: list[str] = []
        self._overview_card_refs: list[str] = []
        self._rendered_view_keys: dict[str, tuple[Any, ...]] = {}

        self._init_smart_view_helpers()
        self._build_menu()
        self._build_shell()
        self._bind_shell_events()
        self._show_initial_view()
        self._refresh_all()

    def _show_initial_view(self) -> None:
        if self.current_view == "user":
            self._show_user()
        elif self.current_view == "detailed":
            self._show_detailed()
        elif self.selected_ref:
            self._show_focus()
        else:
            self._show_overview()

    def _build_menu(self) -> None:
        menu_bar = wx.MenuBar()
        file_menu = wx.Menu()
        self.new_candidature_item = file_menu.Append(wx.ID_NEW, "Add job offer…")
        self.profile_item = file_menu.Append(wx.ID_ANY, "User/Profile")
        file_menu.AppendSeparator()
        self.reset_layout_item = file_menu.Append(wx.ID_ANY, "Reset layout")
        file_menu.AppendSeparator()
        file_menu.Append(wx.ID_EXIT, "Close")
        menu_bar.Append(file_menu, "File")
        self.SetMenuBar(menu_bar)

    def _build_shell(self) -> None:
        self.root = wx.Panel(self)
        self.root_sizer = wx.BoxSizer(wx.VERTICAL)
        self.root.SetSizer(self.root_sizer)
        self._build_toolbar()
        self._build_view_book()
        self._build_overview_surface()
        self._build_focus_surface()
        self._build_detailed_surface()
        self._build_user_surface()

    def _build_toolbar(self) -> None:
        self.toolbar = wx.Panel(self.root)
        sizer = wx.BoxSizer(wx.HORIZONTAL)
        self.toolbar.SetSizer(sizer)
        self.title = wx.StaticText(self.toolbar, label="AAAAT")
        self.title.SetFont(self.title.GetFont().Bold().Larger())
        self.reset_button = wx.Button(self.toolbar, label="Reset", size=(68, -1))
        self.new_button = wx.Button(self.toolbar, label="+", size=(40, -1))
        self.new_button.SetToolTip("Add job offer")
        sizer.Add(self.title, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        sizer.AddStretchSpacer(1)
        sizer.Add(self.reset_button, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
        sizer.Add(self.new_button, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
        self.root_sizer.Add(self.toolbar, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 4)

    def _build_view_book(self) -> None:
        self.view_book = wx.Notebook(self.root, style=wx.NB_TOP)
        self.smart_panel = wx.Panel(self.view_book)
        self.smart_sizer = wx.BoxSizer(wx.VERTICAL)
        self.smart_panel.SetSizer(self.smart_sizer)
        self.view_book.AddPage(self.smart_panel, "Smart")
        self.root_sizer.Add(self.view_book, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)

    def _build_overview_surface(self) -> None:
        self.overview_panel = wx.Panel(self.smart_panel)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.overview_panel.SetSizer(sizer)
        self.overview_search = wx.SearchCtrl(self.overview_panel, style=wx.TE_PROCESS_ENTER)
        self.overview_search.ShowSearchButton(True)
        self.overview_search.ShowCancelButton(True)
        sizer.Add(self.overview_search, 0, wx.BOTTOM | wx.EXPAND, 8)
        self.overview_scroll = wx.ScrolledWindow(self.overview_panel, style=wx.VSCROLL)
        self.overview_scroll.SetScrollRate(0, 12)
        self.overview_cards_sizer = wx.WrapSizer(wx.HORIZONTAL)
        self.overview_scroll.SetSizer(self.overview_cards_sizer)
        sizer.Add(self.overview_scroll, 1, wx.EXPAND)
        self.smart_sizer.Add(self.overview_panel, 1, wx.ALL | wx.EXPAND, 6)

    def _build_focus_surface(self) -> None:
        self.focus_panel = wx.Panel(self.smart_panel)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.focus_panel.SetSizer(sizer)
        self.focus_splitter = wx.SplitterWindow(self.focus_panel, style=wx.SP_LIVE_UPDATE)
        self.focus_splitter.SetMinimumPaneSize(170)
        self.nav_panel = wx.Panel(self.focus_splitter)
        self.content_splitter = wx.SplitterWindow(self.focus_splitter, style=wx.SP_LIVE_UPDATE)
        self.content_splitter.SetMinimumPaneSize(260)
        self.center_panel = wx.Panel(self.content_splitter)
        self.smart_sidebar = CandidatureSidebar(
            self.content_splitter,
            on_run_action=self._run_candidature_action,
            on_apply_task=self._apply_task,
            on_reject_task=self._reject_task,
            on_open_artifact=self._open_artifact,
            on_register_artifact=self._register_artifact,
        )
        self.focus_splitter.SplitVertically(self.nav_panel, self.content_splitter, self.focus_left_width)
        self.content_splitter.SplitVertically(self.center_panel, self.smart_sidebar, -self.focus_right_width)
        self.content_splitter.SetSashGravity(1.0)
        sizer.Add(self.focus_splitter, 1, wx.EXPAND)
        self.smart_sizer.Add(self.focus_panel, 1, wx.ALL | wx.EXPAND, 6)
        self._build_nav_panel()
        self._build_center_panel()
        self.focus_panel.Bind(wx.EVT_SIZE, self._on_focus_size)

    def _build_nav_panel(self) -> None:
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.nav_panel.SetSizer(sizer)
        self.nav_search = wx.SearchCtrl(self.nav_panel, style=wx.TE_PROCESS_ENTER)
        self.nav_search.ShowSearchButton(True)
        self.nav_search.ShowCancelButton(True)
        self.nav_list = wx.ListBox(self.nav_panel)
        self.expand_list_button = wx.Button(self.nav_panel, label="All applications")
        sizer.Add(self.nav_search, 0, wx.ALL | wx.EXPAND, 4)
        sizer.Add(self.nav_list, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)
        sizer.Add(self.expand_list_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)

    def _build_center_panel(self) -> None:
        panel_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_panel.SetSizer(panel_sizer)
        self.center_splitter = wx.SplitterWindow(self.center_panel, style=wx.SP_LIVE_UPDATE)
        self.center_splitter.SetMinimumPaneSize(110)
        self.center_body_scroll = wx.ScrolledWindow(self.center_splitter, style=wx.VSCROLL)
        self.center_body_scroll.SetScrollRate(0, 12)
        self.center_notes_panel = wx.Panel(self.center_splitter, style=wx.BORDER_SIMPLE)
        self.center_splitter.SplitHorizontally(self.center_body_scroll, self.center_notes_panel, -DEFAULT_CENTER_NOTES_HEIGHT)
        self.center_splitter.SetSashGravity(1.0)
        panel_sizer.Add(self.center_splitter, 1, wx.EXPAND)
        self.center_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_body_scroll.SetSizer(self.center_sizer)
        self.center_notes_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_notes_panel.SetSizer(self.center_notes_sizer)
        self.center_scroll = self.center_body_scroll

    def _on_support_surface(self, _event: wx.Event) -> None:
        dialog = NewCandidatureDialog(self, service=self.intake_service, on_created=self._on_candidature_created)
        try:
            dialog.ShowModal()
        finally:
            dialog.Destroy()

    def _on_candidature_created(self, result: dict[str, Any]) -> None:
        candidature = result["candidature"]
        self.selected_ref = str(candidature["id"])
        self.layout_state.selected_candidature_ref = self.selected_ref
        self._show_focus()
        self._rendered_view_keys.clear()
        self._refresh_all()
        if result.get("agent_configured"):
            self.task_worker.run_tasks(
                result.get("tasks") or [],
                on_progress=self._on_task_progress,
                on_complete=self._on_task_batch_complete,
            )

    def _run_candidature_action(self, task_type: str) -> None:
        if not self.selected_ref:
            return
        task = self.workflow_service.create_task(self.selected_ref, task_type, force_new=True)
        self._refresh_sidebars()
        self.task_worker.run_task(task, on_progress=self._on_task_progress, on_complete=self._on_task_batch_complete)

    def _apply_task(self, task_id: str) -> None:
        try:
            task = self.workflow_service.get_task(task_id)
            if task.get("artifact_template") and not task.get("artifact_id"):
                self.workflow_service.render_artifact(task_id)
            self.workflow_service.apply(task_id)
        except (TaskWorkflowError, ValueError, KeyError, OSError) as exc:
            wx.MessageBox(str(exc), "AAAAT", wx.OK | wx.ICON_ERROR, self)
            return
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _reject_task(self, task_id: str) -> None:
        self.workflow_service.reject(task_id)
        self._refresh_sidebars()

    def _on_task_progress(self, _progress: TaskProgress) -> None:
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _on_task_batch_complete(self) -> None:
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _refresh_sidebars(self) -> None:
        detail = self._selected_detail() or self._detailed_selected_row()
        tasks = self.workflow_service.list_tasks(self.selected_ref) if self.selected_ref else []
        if hasattr(self, "smart_sidebar"):
            self.smart_sidebar.render(detail, tasks)
        if hasattr(self, "detailed_sidebar"):
            self.detailed_sidebar.render(detail, tasks)

    def _open_artifact(self, path: str) -> None:
        if not path or not wx.LaunchDefaultApplication(path):
            wx.MessageBox(f"Could not open artifact: {path}", "AAAAT", wx.OK | wx.ICON_ERROR, self)

    def _register_artifact(self) -> None:
        if not self.selected_ref:
            return
        with wx.FileDialog(self, "Register existing artifact", style=wx.FD_OPEN | wx.FD_FILE_MUST_EXIST) as dialog:
            if dialog.ShowModal() != wx.ID_OK:
                return
            path = dialog.GetPath()
        extension = Path(path).suffix.lower()
        artifact_type = "cv" if "cv" in Path(path).stem.lower() else "cover_letter" if "cover" in Path(path).stem.lower() else extension.lstrip(".") or "document"
        try:
            self.command_service.register_external_artifact(self.selected_ref, artifact_type, path, Path(path).name)
        except ValueError as exc:
            wx.MessageBox(str(exc), "AAAAT", wx.OK | wx.ICON_ERROR, self)
            return
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _on_focus_size(self, event: wx.SizeEvent) -> None:
        wx.CallAfter(self._apply_focus_layout, True)
        event.Skip()

    def _on_reset_layout(self, _event: wx.Event) -> None:
        self.layout_state = DashboardLayoutState.default()
        self.layout_state.selected_view = self.current_view
        self.layout_state.selected_candidature_ref = self.selected_ref
        self.center_card_state.reset()
        self._focus_layout_applied = False
        self._rendered_view_keys.clear()
        self._apply_focus_layout(True)
        if hasattr(self, "_apply_detailed_layout"):
            self._apply_detailed_layout()
        self._refresh_all()

    def _on_close(self, event: wx.CloseEvent) -> None:
        self.layout_state.selected_view = self.current_view
        self.layout_state.selected_candidature_ref = self.selected_ref
        self.layout_state.selected_keyword = self.selected_keyword
        if self.focus_splitter.IsSplit():
            self.layout_state.pane_layout.setdefault("smart", {})["left"] = self.focus_splitter.GetSashPosition()
        if self.content_splitter.IsSplit():
            self.layout_state.pane_layout.setdefault("smart", {})["right"] = max(
                260,
                self.content_splitter.GetClientSize().GetWidth() - self.content_splitter.GetSashPosition(),
            )
        self.layout_state.save(self.layout_path)
        event.Skip()

    def _select_ref(self, ref: str) -> None:
        self.expanded_overview_ref = None
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self.center_card_state.reset()
        self._show_focus()
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _empty_message(self, parent: wx.Window, text: str) -> wx.StaticText:
        label = wx.StaticText(parent, label=text)
        label.SetFont(label.GetFont().Bold())
        return label

    @staticmethod
    def _clip(value: Any, limit: int) -> str:
        text = " ".join(str(value or "").split())
        return text if len(text) <= limit else text[: max(0, limit - 1)].rstrip() + "…"
