from __future__ import annotations

from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect, update_application
from aaaat.payload import dashboard_payload
from aaaat.security import Mode, can_write


RIGHT_MODULES = ["notes", "keywords", "artifacts"]
DEFAULT_FOCUS_LEFT = 210
DEFAULT_FOCUS_RIGHT = 210
DEFAULT_WINDOW_SIZE = (1280, 780)
OVERVIEW_CARD_SIZE = (390, 168)
EXPANDED_CARD_SIZE = (790, 250)


class DesktopDashboardFrame(wx.Frame):
    """wx desktop Smart View adapter.

    Overview card interaction is staged: first click expands one card in place;
    second click on that expanded card opens focus mode.
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
        super().__init__(None, title="AAAAT — Smart View", size=DEFAULT_WINDOW_SIZE)
        self.storage_path = storage_path
        self.mode = Mode(mode)
        self.projection = projection
        self.layout_state = layout_state
        self.layout_path = Path(layout_path)
        self.selected_ref = layout_state.selected_candidature_ref
        self.selected_keyword = layout_state.selected_keyword
        self.search_query = ""
        self.expanded_overview_ref: str | None = None
        self.focus_left_width = int(layout_state.pane_layout.get("smart", {}).get("left", DEFAULT_FOCUS_LEFT))
        saved_right = int(layout_state.pane_layout.get("smart", {}).get("right", DEFAULT_FOCUS_RIGHT))
        self.focus_right_width = min(saved_right, 230)

        self._list_refs: list[str] = []
        self._overview_card_refs: list[str] = []

        self._build_menu()
        self._build_shell()
        self._bind_shell_events()
        self._show_overview() if not self.selected_ref else self._show_focus()
        self._refresh_all()

    def _build_menu(self) -> None:
        menu_bar = wx.MenuBar()
        file_menu = wx.Menu()
        self.new_candidature_item = file_menu.Append(wx.ID_NEW, "New…")
        self.profile_item = file_menu.Append(wx.ID_ANY, "Profile…")
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

        self.toolbar = wx.Panel(self.root)
        toolbar_sizer = wx.BoxSizer(wx.HORIZONTAL)
        self.toolbar.SetSizer(toolbar_sizer)
        self.title = wx.StaticText(self.toolbar, label="AAAAT")
        self.title.SetFont(self.title.GetFont().Bold().Larger())
        self.mode_chip = wx.StaticText(self.toolbar, label="read-only" if self.mode == Mode.READ_ONLY else "local")
        self.overview_button = wx.Button(self.toolbar, label="List", size=(62, -1))
        self.reset_button = wx.Button(self.toolbar, label="Reset", size=(68, -1))
        self.new_button = wx.Button(self.toolbar, label="+", size=(40, -1))
        self.profile_button = wx.Button(self.toolbar, label="Me", size=(48, -1))
        toolbar_sizer.Add(self.title, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        toolbar_sizer.AddStretchSpacer(1)
        for control in (self.mode_chip, self.overview_button, self.reset_button, self.new_button, self.profile_button):
            toolbar_sizer.Add(control, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
        self.root_sizer.Add(self.toolbar, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 4)

        self.overview_panel = wx.Panel(self.root)
        self._build_overview_panel()
        self.root_sizer.Add(self.overview_panel, 1, wx.ALL | wx.EXPAND, 6)

        self.focus_panel = wx.Panel(self.root)
        self._build_focus_panel()
        self.root_sizer.Add(self.focus_panel, 1, wx.ALL | wx.EXPAND, 6)

    def _build_overview_panel(self) -> None:
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.overview_panel.SetSizer(sizer)
        self.overview_search = wx.SearchCtrl(self.overview_panel, style=wx.TE_PROCESS_ENTER)
        self.overview_search.ShowSearchButton(True)
        self.overview_search.ShowCancelButton(True)
        sizer.Add(self.overview_search, 0, wx.BOTTOM | wx.EXPAND, 8)

        self.overview_scroll = wx.ScrolledWindow(self.overview_panel)
        self.overview_scroll.SetScrollRate(12, 12)
        self.overview_cards_sizer = wx.WrapSizer(wx.HORIZONTAL)
        self.overview_scroll.SetSizer(self.overview_cards_sizer)
        sizer.Add(self.overview_scroll, 1, wx.EXPAND)

    def _build_focus_panel(self) -> None:
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.focus_panel.SetSizer(sizer)
        self.focus_splitter = wx.SplitterWindow(self.focus_panel, style=wx.SP_LIVE_UPDATE)
        self.focus_splitter.SetMinimumPaneSize(150)
        self.nav_panel = wx.Panel(self.focus_splitter)
        self.content_splitter = wx.SplitterWindow(self.focus_splitter, style=wx.SP_LIVE_UPDATE)
        self.content_splitter.SetMinimumPaneSize(160)
        self.center_scroll = wx.ScrolledWindow(self.content_splitter)
        self.right_scroll = wx.ScrolledWindow(self.content_splitter)
        self.center_scroll.SetScrollRate(8, 12)
        self.right_scroll.SetScrollRate(8, 12)
        self.focus_splitter.SplitVertically(self.nav_panel, self.content_splitter, self.focus_left_width)
        center_width = max(760, DEFAULT_WINDOW_SIZE[0] - self.focus_left_width - self.focus_right_width)
        self.content_splitter.SplitVertically(self.center_scroll, self.right_scroll, center_width)
        sizer.Add(self.focus_splitter, 1, wx.EXPAND)

        self._build_nav_panel()
        self.center_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_scroll.SetSizer(self.center_sizer)
        self.right_sizer = wx.BoxSizer(wx.VERTICAL)
        self.right_scroll.SetSizer(self.right_sizer)

    def _build_nav_panel(self) -> None:
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.nav_panel.SetSizer(sizer)
        self.nav_search = wx.SearchCtrl(self.nav_panel, style=wx.TE_PROCESS_ENTER)
        self.nav_search.ShowSearchButton(True)
        self.nav_search.ShowCancelButton(True)
        self.nav_list = wx.ListBox(self.nav_panel)
        self.expand_list_button = wx.Button(self.nav_panel, label="Expand")
        sizer.Add(self.nav_search, 0, wx.ALL | wx.EXPAND, 4)
        sizer.Add(self.nav_list, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)
        sizer.Add(self.expand_list_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)

    def _bind_shell_events(self) -> None:
        self.Bind(wx.EVT_CLOSE, self._on_close)
        self.Bind(wx.EVT_MENU, lambda _event: self.Close(), id=wx.ID_EXIT)
        self.Bind(wx.EVT_MENU, self._on_support_surface, self.new_candidature_item)
        self.Bind(wx.EVT_MENU, self._on_support_surface, self.profile_item)
        self.Bind(wx.EVT_MENU, self._on_reset_layout, self.reset_layout_item)
        self.new_button.Bind(wx.EVT_BUTTON, self._on_support_surface)
        self.profile_button.Bind(wx.EVT_BUTTON, self._on_support_surface)
        self.reset_button.Bind(wx.EVT_BUTTON, self._on_reset_layout)
        self.overview_button.Bind(wx.EVT_BUTTON, lambda _event: self._go_overview())
        self.expand_list_button.Bind(wx.EVT_BUTTON, lambda _event: self._go_overview())
        self.overview_search.Bind(wx.EVT_SEARCHCTRL_SEARCH_BTN, self._on_overview_search)
        self.overview_search.Bind(wx.EVT_TEXT_ENTER, self._on_overview_search)
        self.overview_search.Bind(wx.EVT_SEARCHCTRL_CANCEL_BTN, self._on_clear_search)
        self.nav_search.Bind(wx.EVT_SEARCHCTRL_SEARCH_BTN, self._on_nav_search)
        self.nav_search.Bind(wx.EVT_TEXT_ENTER, self._on_nav_search)
        self.nav_search.Bind(wx.EVT_SEARCHCTRL_CANCEL_BTN, self._on_clear_search)
        self.nav_list.Bind(wx.EVT_LISTBOX, self._on_select_nav)

    def _show_overview(self) -> None:
        self.selected_ref = None
        self.overview_panel.Show()
        self.focus_panel.Hide()
        self.root_sizer.Layout()
        self.Layout()

    def _show_focus(self) -> None:
        self.overview_panel.Hide()
        self.focus_panel.Show()
        self.root_sizer.Layout()
        self.Layout()

    def _refresh_all(self) -> None:
        self.Freeze()
        try:
            self._reload_projection()
            if self.overview_panel.IsShown():
                self._refresh_overview_cards()
            else:
                self._refresh_nav_list()
                self._refresh_focus_modules()
            self.title.SetLabel("AAAAT · Smart")
            self.Layout()
        finally:
            self.Thaw()

    def _reload_projection(self) -> None:
        with connect(self.storage_path) as conn:
            payload = dashboard_payload(conn, include_raw=True)
        self.projection = build_dashboard_projection(
            payload,
            self.mode,
            view="smart",
            selected_application_id=self.selected_ref,
            selected_keyword=self.selected_keyword,
            search_query=self.search_query,
            layout_state=self.layout_state,
        )
        if self.selected_ref and not self._selected_detail():
            self.selected_ref = None

    def _refresh_overview_cards(self) -> None:
        self.overview_cards_sizer.Clear(delete_windows=True)
        self._overview_card_refs = []
        apps = self._filtered_summaries()
        if self.expanded_overview_ref and self.expanded_overview_ref not in {str(item.get("ref")) for item in apps}:
            self.expanded_overview_ref = None
        if not apps:
            self.overview_cards_sizer.Add(self._empty_message(self.overview_scroll, "No matching candidatures."), 0, wx.ALL | wx.EXPAND, 12)
        for item in apps:
            self.overview_cards_sizer.Add(self._candidature_card(item), 0, wx.ALL | wx.EXPAND, 8)
        self.overview_scroll.Layout()
        self.overview_scroll.FitInside()

    def _candidature_card(self, item: dict[str, Any]) -> wx.Panel:
        ref = str(item.get("ref"))
        expanded = self.expanded_overview_ref == ref
        card = wx.Panel(self.overview_scroll, style=wx.BORDER_SIMPLE)
        card.SetMinSize(EXPANDED_CARD_SIZE if expanded else OVERVIEW_CARD_SIZE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        card.SetSizer(sizer)

        header = wx.BoxSizer(wx.HORIZONTAL)
        title_box = wx.BoxSizer(wx.VERTICAL)
        company = wx.StaticText(card, label=str(item.get("company") or "Untitled"))
        company.SetFont(company.GetFont().Bold().Larger())
        role = wx.StaticText(card, label=str(item.get("role") or "Role"))
        role.SetFont(role.GetFont().Bold())
        title_box.Add(company, 0, wx.BOTTOM | wx.EXPAND, 2)
        title_box.Add(role, 0, wx.EXPAND, 2)
        state = wx.StaticText(card, label=self._clip(f"{item.get('status') or ''} · {item.get('priority') or ''}", 34))
        state.SetFont(state.GetFont().Bold())
        header.Add(title_box, 1, wx.ALL | wx.EXPAND, 8)
        header.Add(state, 0, wx.ALL | wx.ALIGN_TOP, 8)
        sizer.Add(header, 0, wx.EXPAND)

        keywords = "  ".join(f"#{keyword}" for keyword in item.get("keywords") or [])
        if keywords:
            chip_label = wx.StaticText(card, label=self._clip(keywords, 84))
            chip_label.Wrap(360 if not expanded else 740)
            sizer.Add(chip_label, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        if expanded:
            self._add_overview_expanded_body(card, sizer, item)
            hint = wx.StaticText(card, label="Click again to open Smart View")
            hint.SetFont(hint.GetFont().Bold())
            sizer.Add(hint, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.ALIGN_RIGHT, 8)
        else:
            self._add_overview_compact_body(card, sizer, item)

        self._bind_card_click(card, ref)
        self._overview_card_refs.append(ref)
        return card

    def _add_overview_compact_body(self, card: wx.Panel, sizer: wx.BoxSizer, item: dict[str, Any]) -> None:
        body_grid = wx.FlexGridSizer(rows=1, cols=2, vgap=6, hgap=10)
        body_grid.AddGrowableCol(0, 1)
        body_grid.AddGrowableCol(1, 1)
        signal = wx.StaticText(card, label=self._clip(str(item.get("call_signals") or item.get("source_excerpt") or "signal pending"), 56))
        source = wx.StaticText(card, label=self._clip(str(item.get("source_excerpt") or item.get("next_action") or "source pending"), 64))
        signal.Wrap(170)
        source.Wrap(170)
        body_grid.Add(signal, 1, wx.EXPAND)
        body_grid.Add(source, 1, wx.EXPAND)
        sizer.Add(body_grid, 1, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 8)

    def _add_overview_expanded_body(self, card: wx.Panel, sizer: wx.BoxSizer, item: dict[str, Any]) -> None:
        grid = wx.FlexGridSizer(rows=2, cols=2, vgap=8, hgap=12)
        grid.AddGrowableCol(0, 1)
        grid.AddGrowableCol(1, 1)
        blocks = [
            ("Recognize", item.get("call_signals") or item.get("source_excerpt") or "No call signal yet."),
            ("Source", item.get("source_excerpt") or item.get("source") or "Source pending."),
            ("Next", item.get("next_action") or "No next action yet."),
            ("Artifacts", item.get("artifacts_state") or "No artifact state."),
        ]
        for title, body in blocks:
            panel = wx.Panel(card)
            panel_sizer = wx.BoxSizer(wx.VERTICAL)
            panel.SetSizer(panel_sizer)
            label = wx.StaticText(panel, label=title)
            label.SetFont(label.GetFont().Bold())
            text = wx.StaticText(panel, label=self._clip(body, 120))
            text.Wrap(350)
            panel_sizer.Add(label, 0, wx.BOTTOM | wx.EXPAND, 2)
            panel_sizer.Add(text, 1, wx.EXPAND, 2)
            grid.Add(panel, 1, wx.EXPAND)
        sizer.Add(grid, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _bind_card_click(self, window: wx.Window, ref: str) -> None:
        window.SetCursor(wx.Cursor(wx.CURSOR_HAND))
        window.Bind(wx.EVT_LEFT_UP, lambda _event, selected=ref: self._on_card_click(selected))
        for child in window.GetChildren():
            if isinstance(child, wx.Window):
                self._bind_card_click(child, ref)

    def _on_card_click(self, ref: str) -> None:
        if self.expanded_overview_ref == ref:
            self._select_ref(ref)
            return
        self.expanded_overview_ref = ref
        self.Freeze()
        try:
            self._refresh_overview_cards()
            self.Layout()
        finally:
            self.Thaw()

    def _refresh_nav_list(self) -> None:
        apps = self._filtered_summaries()
        self._list_refs = [str(item.get("ref")) for item in apps]
        rows = []
        for item in apps:
            keywords = " ".join(f"#{keyword}" for keyword in item.get("keywords") or [])
            rows.append(self._clip(f"{item.get('company')}\n{item.get('role')} {keywords}", 80))
        if not rows:
            rows = ["No match"]
        self.nav_list.Set(rows)
        if self.selected_ref in self._list_refs:
            self.nav_list.SetSelection(self._list_refs.index(str(self.selected_ref)))

    def _refresh_focus_modules(self) -> None:
        self.center_sizer.Clear(delete_windows=True)
        self.right_sizer.Clear(delete_windows=True)
        detail = self._selected_detail()
        if not detail:
            self.center_sizer.Add(self._empty_message(self.center_scroll, "Select a candidature."), 0, wx.ALL | wx.EXPAND, 12)
            self.center_scroll.Layout()
            self.right_scroll.Layout()
            return

        self._add_hero(detail)
        self._add_call_priority_panel(detail)
        self._add_source_reader(detail)
        self._add_content_module(self.center_scroll, self.center_sizer, "Now", detail.get("prepare_first"), expanded=True)
        self._add_content_module(self.center_scroll, self.center_sizer, "Later", detail.get("prepare_later"), expanded=False)
        self._add_content_module(self.center_scroll, self.center_sizer, "Offer", detail.get("offer_snapshot"), expanded=False)

        self._add_note_module()
        self._add_keywords_module(detail)
        self._add_content_module(self.right_scroll, self.right_sizer, "Artifacts", self._artifacts_text(), expanded=False)

        self.center_scroll.Layout()
        self.center_scroll.FitInside()
        self.right_scroll.Layout()
        self.right_scroll.FitInside()

    def _add_hero(self, detail: dict[str, Any]) -> None:
        hero = wx.Panel(self.center_scroll)
        hero_sizer = wx.BoxSizer(wx.VERTICAL)
        hero.SetSizer(hero_sizer)
        company = wx.StaticText(hero, label=str(detail.get("company") or "Untitled"))
        company.SetFont(company.GetFont().Bold().Larger().Larger())
        role = wx.StaticText(hero, label=str(detail.get("role") or "Role"))
        role.SetFont(role.GetFont().Bold().Larger())
        chips = wx.StaticText(hero, label=self._chips(detail))
        hero_sizer.Add(company, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        hero_sizer.Add(role, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        hero_sizer.Add(chips, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 8)
        self.center_sizer.Add(hero, 0, wx.BOTTOM | wx.EXPAND, 8)

    def _add_call_priority_panel(self, detail: dict[str, Any]) -> None:
        panel = wx.Panel(self.center_scroll, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        title = wx.StaticText(panel, label="Call cockpit")
        title.SetFont(title.GetFont().Bold().Larger())
        sizer.Add(title, 0, wx.ALL | wx.EXPAND, 8)

        grid = wx.FlexGridSizer(rows=2, cols=2, vgap=8, hgap=12)
        grid.AddGrowableCol(0, 1)
        grid.AddGrowableCol(1, 1)
        blocks = [
            ("Recognize", detail.get("call_signals") or detail.get("source_excerpt") or "No signal yet."),
            ("Pitch", detail.get("pitch") or "No pitch yet."),
            ("Ask", detail.get("smart_question") or "No question yet."),
            ("Watch", detail.get("risk_to_avoid") or "No risk note yet."),
        ]
        for heading, body in blocks:
            block = wx.Panel(panel)
            block_sizer = wx.BoxSizer(wx.VERTICAL)
            block.SetSizer(block_sizer)
            label = wx.StaticText(block, label=heading)
            label.SetFont(label.GetFont().Bold())
            text = wx.StaticText(block, label=self._clip(body, 220))
            text.Wrap(420)
            block_sizer.Add(label, 0, wx.BOTTOM | wx.EXPAND, 2)
            block_sizer.Add(text, 1, wx.EXPAND, 2)
            grid.Add(block, 1, wx.EXPAND)
        sizer.Add(grid, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        self.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)

    def _add_source_reader(self, detail: dict[str, Any]) -> None:
        source_text = str(detail.get("source_text") or "")
        source_excerpt = str(detail.get("source_excerpt") or source_text or "No source text stored yet.")
        label = f"Source · {self._clip(source_excerpt, 110)}"
        module = wx.CollapsiblePane(self.center_scroll, label=label)
        module.Collapse(True)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        heading = wx.StaticText(pane, label=f"Literal offer/source text · {len(source_text)} chars")
        heading.SetFont(heading.GetFont().Bold())
        reader = wx.TextCtrl(pane, value=source_text or source_excerpt, style=wx.TE_MULTILINE | wx.TE_READONLY | wx.TE_WORDWRAP)
        reader.SetMinSize((-1, 280))
        sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        sizer.Add(reader, 1, wx.ALL | wx.EXPAND, 8)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_scrollers())
        self.center_sizer.Add(module, 0, wx.BOTTOM | wx.EXPAND, 8)

    def _add_content_module(self, parent: wx.Window, target_sizer: wx.Sizer, title: str, body: Any, *, expanded: bool) -> None:
        text = str(body or "")
        label = title if not text else f"{title} · {self._clip(text, 90)}"
        module = wx.CollapsiblePane(parent, label=label)
        module.Collapse(not expanded)
        pane = module.GetPane()
        pane_sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(pane_sizer)
        heading = wx.StaticText(pane, label=title)
        heading.SetFont(heading.GetFont().Bold())
        content = wx.StaticText(pane, label=text or "—")
        content.Wrap(760 if parent is self.center_scroll else 210)
        pane_sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        pane_sizer.Add(content, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_scrollers())
        target_sizer.Add(module, 0, wx.BOTTOM | wx.EXPAND, 6)

    def _add_note_module(self) -> None:
        primary_note = self.projection["smart"].get("primary_note") or {}
        body = primary_note.get("body") or ""
        module = wx.CollapsiblePane(self.right_scroll, label=f"Notes · {self._clip(body, 42) if body else 'empty'}")
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        self.note_text = wx.TextCtrl(pane, value=body, style=wx.TE_MULTILINE)
        self.note_text.SetMinSize((-1, 100))
        self.note_text.Enable(can_write(self.mode))
        save = wx.Button(pane, label="Save", size=(58, -1))
        save.Enable(can_write(self.mode))
        save.Bind(wx.EVT_BUTTON, self._on_save_note)
        sizer.Add(self.note_text, 1, wx.ALL | wx.EXPAND, 6)
        sizer.Add(save, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.ALIGN_RIGHT, 6)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_scrollers())
        self.right_sizer.Add(module, 0, wx.BOTTOM | wx.EXPAND, 6)

    def _add_keywords_module(self, detail: dict[str, Any]) -> None:
        keywords = list(detail.get("keywords") or [])
        definition = self.projection["smart"].get("selected_keyword_definition") or {}
        label = "Keywords" if not keywords else f"Keywords · {' '.join('#' + str(item) for item in keywords[:2])}"
        module = wx.CollapsiblePane(self.right_scroll, label=label)
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        self.keyword_list = wx.ListBox(pane, choices=[str(item) for item in keywords])
        self.keyword_definition = wx.StaticText(pane, label=str(definition.get("definition") or "No definition."))
        self.keyword_definition.Wrap(210)
        self.keyword_list.Bind(wx.EVT_LISTBOX, self._on_select_keyword)
        sizer.Add(self.keyword_list, 0, wx.ALL | wx.EXPAND, 6)
        sizer.Add(self.keyword_definition, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_scrollers())
        self.right_sizer.Add(module, 0, wx.BOTTOM | wx.EXPAND, 6)

    def _fit_scrollers(self) -> None:
        self.center_scroll.Layout()
        self.center_scroll.FitInside()
        self.right_scroll.Layout()
        self.right_scroll.FitInside()

    def _filtered_summaries(self) -> list[dict[str, Any]]:
        query = self.search_query.lower().strip()
        summaries = list(self.projection["smart"].get("candidature_summaries") or [])
        if not query:
            return summaries
        result = []
        for item in summaries:
            haystack = " ".join(
                [
                    str(item.get("company") or ""),
                    str(item.get("role") or ""),
                    str(item.get("status") or ""),
                    str(item.get("priority") or ""),
                    str(item.get("next_action") or ""),
                    str(item.get("call_signals") or ""),
                    str(item.get("source_excerpt") or ""),
                    " ".join(str(keyword) for keyword in item.get("keywords") or []),
                ]
            ).lower()
            if query in haystack:
                result.append(item)
        return result

    def _selected_detail(self) -> dict[str, Any] | None:
        detail = self.projection["smart"].get("selected_candidature_detail")
        if not detail:
            return None
        if self.selected_ref is None:
            return None
        if str(detail.get("ref")) != str(self.selected_ref):
            return None
        return detail

    def _chips(self, detail: dict[str, Any]) -> str:
        parts = [str(detail.get("status") or ""), str(detail.get("priority") or ""), str(detail.get("location") or ""), str(detail.get("remote_mode") or "")]
        parts.extend(f"#{keyword}" for keyword in detail.get("keywords") or [])
        return "  ".join(part for part in parts if part)

    def _artifacts_text(self) -> str:
        summary = self.projection["smart"].get("artifact_summary") or {}
        items = summary.get("items") or []
        if not items:
            return "No artifacts yet."
        return "\n".join(self._clip(f"{item.get('artifact_type', 'artifact')} · {item.get('label', '')}", 90) for item in items)

    def _empty_message(self, parent: wx.Window, text: str) -> wx.StaticText:
        label = wx.StaticText(parent, label=text)
        label.SetFont(label.GetFont().Bold())
        return label

    def _clip(self, value: Any, limit: int) -> str:
        text = " ".join(str(value or "").split())
        if len(text) <= limit:
            return text
        return text[: max(0, limit - 1)].rstrip() + "…"

    def _select_ref(self, ref: str) -> None:
        self.expanded_overview_ref = None
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self._show_focus()
        self._refresh_all()

    def _go_overview(self) -> None:
        self.expanded_overview_ref = None
        self.layout_state.selected_candidature_ref = None
        self._show_overview()
        self._refresh_all()

    def _on_overview_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.overview_search.GetValue()
        self.expanded_overview_ref = None
        self.nav_search.SetValue(self.search_query)
        self._refresh_all()

    def _on_nav_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.nav_search.GetValue()
        self.overview_search.SetValue(self.search_query)
        self._refresh_all()

    def _on_clear_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = ""
        self.expanded_overview_ref = None
        self.overview_search.SetValue("")
        self.nav_search.SetValue("")
        self._refresh_all()

    def _on_select_nav(self, _event: wx.CommandEvent) -> None:
        selection = self.nav_list.GetSelection()
        if selection == wx.NOT_FOUND or selection >= len(self._list_refs):
            return
        self.selected_ref = self._list_refs[selection]
        self.layout_state.selected_candidature_ref = self.selected_ref
        self._refresh_all()

    def _on_select_keyword(self, _event: wx.CommandEvent) -> None:
        selection = self.keyword_list.GetSelection()
        if selection == wx.NOT_FOUND:
            return
        self.selected_keyword = self.keyword_list.GetString(selection)
        self.layout_state.selected_keyword = self.selected_keyword
        self._refresh_all()

    def _on_save_note(self, _event: wx.CommandEvent) -> None:
        if not can_write(self.mode) or not self.selected_ref:
            return
        with connect(self.storage_path) as conn:
            update_application(conn, self.selected_ref, notes=self.note_text.GetValue())
        self._refresh_all()

    def _on_support_surface(self, event: wx.Event) -> None:
        label = "Support"
        event_id = event.GetId()
        if event_id in {self.new_candidature_item.GetId(), self.new_button.GetId()}:
            label = "New candidature"
        if event_id in {self.profile_item.GetId(), self.profile_button.GetId()}:
            label = "Profile"
        wx.MessageBox(f"{label} opens as a compact dialog in the next slice.", "AAAAT", wx.OK | wx.ICON_INFORMATION, self)

    def _on_reset_layout(self, _event: wx.Event) -> None:
        self.focus_left_width = DEFAULT_FOCUS_LEFT
        self.focus_right_width = DEFAULT_FOCUS_RIGHT
        if self.focus_splitter.IsSplit():
            self.focus_splitter.SetSashPosition(DEFAULT_FOCUS_LEFT)
        if self.content_splitter.IsSplit():
            self.content_splitter.SetSashPosition(DEFAULT_WINDOW_SIZE[0] - DEFAULT_FOCUS_LEFT - DEFAULT_FOCUS_RIGHT)
        self.layout_state.pane_layout.setdefault("smart", {})["left"] = DEFAULT_FOCUS_LEFT
        self.layout_state.pane_layout.setdefault("smart", {})["right"] = DEFAULT_FOCUS_RIGHT
        self.layout_state.save(self.layout_path)
        self.Layout()

    def _on_close(self, event: wx.CloseEvent) -> None:
        try:
            self.layout_state.selected_view = "smart"
            self.layout_state.selected_candidature_ref = self.selected_ref
            self.layout_state.selected_keyword = self.selected_keyword
            if self.focus_splitter.IsSplit():
                self.layout_state.pane_layout.setdefault("smart", {})["left"] = max(1, int(self.focus_splitter.GetSashPosition()))
            if self.right_scroll:
                self.layout_state.pane_layout.setdefault("smart", {})["right"] = max(1, min(230, int(self.right_scroll.GetSize().GetWidth())))
            self.layout_state.save(self.layout_path)
        finally:
            event.Skip()
