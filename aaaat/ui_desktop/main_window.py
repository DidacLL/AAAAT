from __future__ import annotations

from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect, update_application
from aaaat.payload import dashboard_payload
from aaaat.security import Mode, can_write


RIGHT_MODULES = [
    ("primary_note", "Notes"),
    ("keyword_context", "Keywords"),
    ("artifacts", "Artifacts"),
    ("call_card", "Call card"),
    ("company_research", "Company research"),
    ("form_answers", "Form answers"),
    ("agent_suggestions", "Agent suggestions"),
]


class DesktopDashboardFrame(wx.Frame):
    """First wx desktop vertical slice: Smart View.

    This class is deliberately kept inside the desktop UI adapter. It consumes
    toolkit-neutral projection data and writes user actions back through domain
    functions. Agent runtime code must not import this module.
    """

    def __init__(
        self,
        *,
        storage_path: str,
        mode: Mode,
        projection: dict[str, Any],
        layout_state: DashboardLayoutState,
        layout_path: str | Path,
    ) -> None:
        super().__init__(None, title="AAAAT — Local Desktop Dashboard", size=(1240, 760))
        self.storage_path = storage_path
        self.mode = Mode(mode)
        self.projection = projection
        self.layout_state = layout_state
        self.layout_path = Path(layout_path)
        self.selected_ref = projection["view_state"].get("selected_candidature_ref")
        self.selected_keyword = projection["view_state"].get("selected_keyword")
        self.visible_right_modules = list(layout_state.modules.get("smart", {}).get("visible", [])) or [item[0] for item in RIGHT_MODULES]
        self._right_pages: dict[str, wx.Window] = {}
        self._module_menu_items: dict[str, wx.MenuItem] = {}

        self._build_menu()
        self._build_smart_view()
        self._bind_events()
        self._restore_layout()
        self._refresh_from_projection()

    def _build_menu(self) -> None:
        menu_bar = wx.MenuBar()

        file_menu = wx.Menu()
        self.new_candidature_item = file_menu.Append(wx.ID_NEW, "New candidature…")
        self.profile_item = file_menu.Append(wx.ID_ANY, "Profile / settings…")
        file_menu.AppendSeparator()
        file_menu.Append(wx.ID_EXIT, "Close")
        menu_bar.Append(file_menu, "File")

        modules_menu = wx.Menu()
        for module_id, label in RIGHT_MODULES:
            item = modules_menu.AppendCheckItem(wx.ID_ANY, label)
            item.Check(module_id in self.visible_right_modules)
            self._module_menu_items[module_id] = item
        menu_bar.Append(modules_menu, "Modules")

        self.SetMenuBar(menu_bar)

    def _build_smart_view(self) -> None:
        root = wx.Panel(self)
        root_sizer = wx.BoxSizer(wx.VERTICAL)
        root.SetSizer(root_sizer)

        self.header = wx.StaticText(root, label="AAAAT Smart View")
        self.header.SetFont(self.header.GetFont().Bold().Larger())
        root_sizer.Add(self.header, 0, wx.ALL | wx.EXPAND, 8)

        self.search = wx.SearchCtrl(root, style=wx.TE_PROCESS_ENTER)
        self.search.ShowSearchButton(True)
        self.search.ShowCancelButton(True)
        root_sizer.Add(self.search, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        self.outer_splitter = wx.SplitterWindow(root, style=wx.SP_LIVE_UPDATE)
        self.left_panel = wx.Panel(self.outer_splitter)
        self.inner_splitter = wx.SplitterWindow(self.outer_splitter, style=wx.SP_LIVE_UPDATE)
        self.center_panel = wx.ScrolledWindow(self.inner_splitter)
        self.right_panel = wx.Panel(self.inner_splitter)

        self.center_panel.SetScrollRate(8, 8)
        self.outer_splitter.SplitVertically(self.left_panel, self.inner_splitter, 320)
        self.inner_splitter.SplitVertically(self.center_panel, self.right_panel, 520)
        self.outer_splitter.SetMinimumPaneSize(240)
        self.inner_splitter.SetMinimumPaneSize(300)
        root_sizer.Add(self.outer_splitter, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        self._build_left_panel()
        self._build_center_panel()
        self._build_right_panel()

    def _build_left_panel(self) -> None:
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.left_panel.SetSizer(sizer)
        title = wx.StaticText(self.left_panel, label="Candidatures")
        title.SetFont(title.GetFont().Bold())
        sizer.Add(title, 0, wx.ALL, 6)
        self.candidature_list = wx.ListBox(self.left_panel)
        sizer.Add(self.candidature_list, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)

    def _build_center_panel(self) -> None:
        self.center_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_panel.SetSizer(self.center_sizer)

    def _build_right_panel(self) -> None:
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.right_panel.SetSizer(sizer)
        self.right_notebook = wx.Notebook(self.right_panel)
        sizer.Add(self.right_notebook, 1, wx.ALL | wx.EXPAND, 0)
        self._rebuild_right_notebook()

    def _bind_events(self) -> None:
        self.Bind(wx.EVT_CLOSE, self._on_close)
        self.Bind(wx.EVT_MENU, lambda _event: self.Close(), id=wx.ID_EXIT)
        self.Bind(wx.EVT_MENU, self._on_support_surface, self.new_candidature_item)
        self.Bind(wx.EVT_MENU, self._on_support_surface, self.profile_item)
        self.candidature_list.Bind(wx.EVT_LISTBOX, self._on_select_candidature)
        self.search.Bind(wx.EVT_SEARCHCTRL_SEARCH_BTN, self._on_search)
        self.search.Bind(wx.EVT_TEXT_ENTER, self._on_search)
        self.search.Bind(wx.EVT_SEARCHCTRL_CANCEL_BTN, self._on_cancel_search)
        for module_id, item in self._module_menu_items.items():
            self.Bind(wx.EVT_MENU, lambda event, mid=module_id: self._on_toggle_module(mid, event), item)

    def _restore_layout(self) -> None:
        smart_layout = self.layout_state.pane_layout.get("smart", {})
        if smart_layout.get("left"):
            self.outer_splitter.SetSashPosition(int(smart_layout["left"]))
        if smart_layout.get("right"):
            width = max(self.GetSize().GetWidth() - int(smart_layout["right"]) - self.outer_splitter.GetSashPosition(), 320)
            self.inner_splitter.SetSashPosition(width)

    def _refresh_from_projection(self) -> None:
        mode_label = "read-only" if self.mode == Mode.READ_ONLY else "full local"
        self.header.SetLabel(f"AAAAT Smart View · {mode_label}")
        self._refresh_left_list()
        self._refresh_center_detail()
        self._refresh_right_pages()
        self.Layout()

    def _refresh_left_list(self) -> None:
        summaries = self.projection["smart"]["candidature_summaries"]
        query = self.projection["view_state"].get("search_query", "").lower()
        self._list_refs: list[str] = []
        rows: list[str] = []
        for item in summaries:
            text = f"{item['company']} — {item['role']} · {item['status']} · {item['next_action']}"
            searchable = " ".join([text, " ".join(item.get("keywords") or [])]).lower()
            if query and query not in searchable:
                continue
            self._list_refs.append(str(item["ref"]))
            rows.append(text)
        if not rows:
            rows = ["No candidatures yet. Use File > New candidature…"]
            self._list_refs = []
        self.candidature_list.Set(rows)
        if self.selected_ref in self._list_refs:
            self.candidature_list.SetSelection(self._list_refs.index(str(self.selected_ref)))

    def _refresh_center_detail(self) -> None:
        self.center_sizer.Clear(delete_windows=True)
        detail = self.projection["smart"].get("selected_candidature_detail")
        if not detail:
            self._add_center_text("No candidature selected", bold=True)
            self._add_center_text("Select or create a candidature to start the Smart View focus state.")
            self.center_panel.Layout()
            self.center_panel.FitInside()
            return

        self._add_center_text(f"{detail['company']} — {detail['role']}", bold=True, larger=True)
        for label, key in (
            ("Status", "status"),
            ("Priority", "priority"),
            ("Location", "location"),
            ("Remote", "remote_mode"),
            ("Source", "source"),
            ("Next action", "next_action"),
            ("Pitch", "pitch"),
            ("Question", "smart_question"),
            ("Avoid", "risk_to_avoid"),
            ("Prepare first", "prepare_first"),
            ("Prepare later", "prepare_later"),
            ("Offer snapshot", "offer_snapshot"),
        ):
            value = detail.get(key) or "—"
            self._add_center_text(f"{label}: {value}")
        keywords = ", ".join(detail.get("keywords") or []) or "—"
        self._add_center_text(f"Keywords: {keywords}")
        self.center_panel.Layout()
        self.center_panel.FitInside()

    def _add_center_text(self, text: str, *, bold: bool = False, larger: bool = False) -> None:
        label = wx.StaticText(self.center_panel, label=text)
        label.Wrap(520)
        font = label.GetFont()
        if bold:
            font = font.Bold()
        if larger:
            font = font.Larger()
        label.SetFont(font)
        self.center_sizer.Add(label, 0, wx.ALL | wx.EXPAND, 6)

    def _rebuild_right_notebook(self) -> None:
        if not hasattr(self, "right_notebook"):
            return
        self.right_notebook.DeleteAllPages()
        self._right_pages = {}
        builders = {
            "primary_note": self._build_note_page,
            "keyword_context": self._build_keywords_page,
            "artifacts": self._build_text_page,
            "call_card": self._build_text_page,
            "company_research": self._build_text_page,
            "form_answers": self._build_text_page,
            "agent_suggestions": self._build_text_page,
        }
        labels = dict(RIGHT_MODULES)
        for module_id, label in RIGHT_MODULES:
            if module_id not in self.visible_right_modules:
                continue
            page = builders[module_id](module_id)
            self._right_pages[module_id] = page
            self.right_notebook.AddPage(page, label)

    def _build_note_page(self, _module_id: str) -> wx.Panel:
        panel = wx.Panel(self.right_notebook)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        self.note_text = wx.TextCtrl(panel, style=wx.TE_MULTILINE)
        self.note_text.Enable(can_write(self.mode))
        sizer.Add(self.note_text, 1, wx.ALL | wx.EXPAND, 6)
        self.save_note_button = wx.Button(panel, label="Save note")
        self.save_note_button.Enable(can_write(self.mode))
        self.save_note_button.Bind(wx.EVT_BUTTON, self._on_save_note)
        sizer.Add(self.save_note_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        return panel

    def _build_keywords_page(self, _module_id: str) -> wx.Panel:
        panel = wx.Panel(self.right_notebook)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        self.keyword_list = wx.ListBox(panel)
        self.keyword_definition = wx.StaticText(panel, label="Select a keyword to view its definition.")
        self.keyword_definition.Wrap(300)
        self.keyword_list.Bind(wx.EVT_LISTBOX, self._on_select_keyword)
        sizer.Add(self.keyword_list, 0, wx.ALL | wx.EXPAND, 6)
        sizer.Add(self.keyword_definition, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        return panel

    def _build_text_page(self, module_id: str) -> wx.Panel:
        panel = wx.Panel(self.right_notebook)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        text = wx.TextCtrl(panel, style=wx.TE_MULTILINE | wx.TE_READONLY)
        text.SetName(module_id)
        sizer.Add(text, 1, wx.ALL | wx.EXPAND, 6)
        return panel

    def _refresh_right_pages(self) -> None:
        if "primary_note" in self._right_pages:
            note = self.projection["smart"]["primary_note"]
            self.note_text.ChangeValue(note.get("body") or "")
        if "keyword_context" in self._right_pages:
            detail = self.projection["smart"].get("selected_candidature_detail") or {}
            keywords = list(detail.get("keywords") or [])
            self.keyword_list.Set(keywords)
            if self.selected_keyword in keywords:
                self.keyword_list.SetSelection(keywords.index(self.selected_keyword))
            selected = self.projection["smart"].get("selected_keyword_definition") or {}
            body = f"{selected.get('term', self.selected_keyword or '')}\n\n{selected.get('definition', '') or 'No definition stored yet.'}"
            self.keyword_definition.SetLabel(body)
            self.keyword_definition.Wrap(300)
        self._set_text_page("artifacts", self._artifacts_text())
        self._set_text_page("call_card", self._dict_text(self.projection["smart"].get("call_card") or {}))
        self._set_text_page("company_research", (self.projection["smart"].get("company_research") or {}).get("body", ""))
        self._set_text_page("form_answers", (self.projection["smart"].get("form_answers") or {}).get("body", ""))
        self._set_text_page("agent_suggestions", self._dict_text(self.projection["smart"].get("agent_suggestions") or {}))

    def _set_text_page(self, module_id: str, value: str) -> None:
        page = self._right_pages.get(module_id)
        if not page:
            return
        for child in page.GetChildren():
            if isinstance(child, wx.TextCtrl):
                child.ChangeValue(value or "—")
                return

    def _artifacts_text(self) -> str:
        summary = self.projection["smart"].get("artifact_summary") or {}
        items = summary.get("items") or []
        if not items:
            return "No artifacts yet."
        lines = []
        for item in items:
            lines.append(f"{item.get('artifact_type', 'artifact')}: {item.get('label', '')} [{item.get('review_state', '')}]")
        return "\n".join(lines)

    def _dict_text(self, value: dict[str, Any]) -> str:
        lines = []
        for key, item in value.items():
            lines.append(f"{key.replace('_', ' ').title()}: {item}")
        return "\n".join(lines) if lines else "—"

    def _on_select_candidature(self, _event: wx.CommandEvent) -> None:
        selection = self.candidature_list.GetSelection()
        if selection == wx.NOT_FOUND or selection >= len(self._list_refs):
            return
        self.selected_ref = self._list_refs[selection]
        self._reload_projection()

    def _on_search(self, _event: wx.CommandEvent) -> None:
        self._reload_projection(search_query=self.search.GetValue())

    def _on_cancel_search(self, _event: wx.CommandEvent) -> None:
        self.search.SetValue("")
        self._reload_projection(search_query="")

    def _on_select_keyword(self, _event: wx.CommandEvent) -> None:
        selection = self.keyword_list.GetSelection()
        if selection == wx.NOT_FOUND:
            return
        self.selected_keyword = self.keyword_list.GetString(selection)
        self._reload_projection(selected_keyword=self.selected_keyword)

    def _on_save_note(self, _event: wx.CommandEvent) -> None:
        if not can_write(self.mode) or not self.selected_ref:
            return
        with connect(self.storage_path) as conn:
            update_application(conn, self.selected_ref, notes=self.note_text.GetValue())
        self._reload_projection()

    def _on_toggle_module(self, module_id: str, _event: wx.CommandEvent) -> None:
        item = self._module_menu_items[module_id]
        if item.IsChecked() and module_id not in self.visible_right_modules:
            self.visible_right_modules.append(module_id)
        if not item.IsChecked() and module_id in self.visible_right_modules:
            self.visible_right_modules.remove(module_id)
        if not self.visible_right_modules:
            self.visible_right_modules.append("primary_note")
            self._module_menu_items["primary_note"].Check(True)
        self._rebuild_right_notebook()
        self._refresh_right_pages()
        self.Layout()

    def _on_support_surface(self, event: wx.CommandEvent) -> None:
        label = "support surface"
        if event.GetId() == self.new_candidature_item.GetId():
            label = "New candidature intake"
        elif event.GetId() == self.profile_item.GetId():
            label = "Profile and settings"
        wx.MessageBox(
            f"{label} will open as a desktop dialog in a later slice. This placeholder proves support surfaces are reachable without occupying Smart View.",
            "AAAAT",
            wx.OK | wx.ICON_INFORMATION,
            self,
        )

    def _reload_projection(self, *, selected_keyword: str | None = None, search_query: str | None = None) -> None:
        self.layout_state.selected_view = "smart"
        self.layout_state.selected_candidature_ref = self.selected_ref
        self.layout_state.selected_keyword = selected_keyword if selected_keyword is not None else self.selected_keyword
        self.layout_state.modules.setdefault("smart", {})["visible"] = list(self.visible_right_modules)
        with connect(self.storage_path) as conn:
            payload = dashboard_payload(conn)
        self.projection = build_dashboard_projection(
            payload,
            self.mode,
            view="smart",
            selected_application_id=self.selected_ref,
            selected_keyword=self.layout_state.selected_keyword,
            search_query=search_query if search_query is not None else self.search.GetValue(),
            layout_state=self.layout_state,
        )
        self.selected_ref = self.projection["view_state"].get("selected_candidature_ref")
        self.selected_keyword = self.projection["view_state"].get("selected_keyword")
        self._refresh_from_projection()

    def _on_close(self, event: wx.CloseEvent) -> None:
        try:
            self.layout_state.selected_view = "smart"
            self.layout_state.selected_candidature_ref = self.selected_ref
            self.layout_state.selected_keyword = self.selected_keyword
            self.layout_state.modules.setdefault("smart", {})["visible"] = list(self.visible_right_modules)
            self.layout_state.pane_layout.setdefault("smart", {})["left"] = max(1, int(self.outer_splitter.GetSashPosition()))
            right_width = max(1, int(self.right_panel.GetSize().GetWidth()))
            self.layout_state.pane_layout.setdefault("smart", {})["right"] = right_width
            self.layout_state.save(self.layout_path)
        finally:
            event.Skip()
