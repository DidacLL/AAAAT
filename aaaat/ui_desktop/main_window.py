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
DEFAULT_FOCUS_RIGHT = 260
DEFAULT_WINDOW_SIZE = (1280, 780)


class DesktopDashboardFrame(wx.Frame):
    """wx desktop Smart View adapter.

    Smart View has two states:

    - overview: candidature cards occupy the workspace for fast recognition;
    - focus: the selected candidature becomes the center, and the list collapses
      into a narrow navigation strip.

    This adapter consumes toolkit-neutral projection data and writes user actions
    through domain functions. Agent runtime code must not import this module.
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
        self.focus_left_width = int(layout_state.pane_layout.get("smart", {}).get("left", DEFAULT_FOCUS_LEFT))
        self.focus_right_width = int(layout_state.pane_layout.get("smart", {}).get("right", DEFAULT_FOCUS_RIGHT))

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
        self.overview_scroll.SetScrollRate(8, 16)
        self.overview_cards_sizer = wx.BoxSizer(wx.VERTICAL)
        self.overview_scroll.SetSizer(self.overview_cards_sizer)
        sizer.Add(self.overview_scroll, 1, wx.EXPAND)

    def _build_focus_panel(self) -> None:
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.focus_panel.SetSizer(sizer)
        self.focus_splitter = wx.SplitterWindow(self.focus_panel, style=wx.SP_LIVE_UPDATE)
        self.focus_splitter.SetMinimumPaneSize(150)
        self.nav_panel = wx.Panel(self.focus_splitter)
        self.content_splitter = wx.SplitterWindow(self.focus_splitter, style=wx.SP_LIVE_UPDATE)
        self.content_splitter.SetMinimumPaneSize(220)
        self.center_scroll = wx.ScrolledWindow(self.content_splitter)
        self.right_scroll = wx.ScrolledWindow(self.content_splitter)
        self.center_scroll.SetScrollRate(8, 12)
        self.right_scroll.SetScrollRate(8, 12)
        self.focus_splitter.SplitVertically(self.nav_panel, self.content_splitter, self.focus_left_width)
        self.content_splitter.SplitVertically(self.center_scroll, self.right_scroll, max(520, DEFAULT_WINDOW_SIZE[0] - self.focus_left_width - self.focus_right_width))
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
        self._reload_projection()
        self._refresh_overview_cards()
        self._refresh_nav_list()
        self._refresh_focus_modules()
        self.title.SetLabel("AAAAT · Smart")
        self.Layout()

    def _reload_projection(self) -> None:
        with connect(self.storage_path) as conn:
            payload = dashboard_payload(conn)
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
        if not apps:
            self._overview_cards_sizer.Add(self._empty_message(self.overview_scroll, "No matching candidatures."), 0, wx.ALL | wx.EXPAND, 12)
        for item in apps:
            self._overview_cards_sizer.Add(self._candidature_card(item), 0, wx.BOTTOM | wx.EXPAND, 10)
        self.overview_scroll.Layout()
        self.overview_scroll.FitInside()

    def _candidature_card(self, item: dict[str, Any]) -> wx.Panel:
        card = wx.Panel(self.overview_scroll, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        card.SetSizer(sizer)

        top = wx.BoxSizer(wx.HORIZONTAL)
        title_box = wx.BoxSizer(wx.VERTICAL)
        company = wx.StaticText(card, label=str(item.get("company") or "Untitled"))
        company.SetFont(company.GetFont().Bold().Larger())
        role = wx.StaticText(card, label=str(item.get("role") or "Role"))
        role.SetFont(role.GetFont().Bold())
        title_box.Add(company, 0, wx.BOTTOM | wx.EXPAND, 2)
        title_box.Add(role, 0, wx.EXPAND, 2)
        open_button = wx.Button(card, label="Open", size=(68, -1))
        top.Add(title_box, 1, wx.ALL | wx.EXPAND, 8)
        top.Add(open_button, 0, wx.ALL | wx.ALIGN_TOP, 8)
        sizer.Add(top, 0, wx.EXPAND)

        chips = "  ".join([str(item.get("status") or ""), str(item.get("priority") or ""), *[f"#{keyword}" for keyword in item.get("keywords") or []]])
        if chips.strip():
            sizer.Add(wx.StaticText(card, label=chips), 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        identifier_parts = [str(item.get("source") or ""), str(item.get("next_action") or ""), str(item.get("deadline_or_last_contact") or "")]
        identifier = " · ".join(part for part in identifier_parts if part)
        if identifier:
            text = wx.StaticText(card, label=self._clip(identifier, 130))
            text.Wrap(880)
            sizer.Add(text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        ref = str(item.get("ref"))
        open_button.Bind(wx.EVT_BUTTON, lambda _event, selected=ref: self._select_ref(selected))
        card.Bind(wx.EVT_LEFT_DCLICK, lambda _event, selected=ref: self._select_ref(selected))
        self._overview_card_refs.append(ref)
        return card

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

        self._add_content_module(self.center_scroll, self.center_sizer, "Pitch", detail.get("pitch"), expanded=True)
        self._add_content_module(self.center_scroll, self.center_sizer, "Ask", detail.get("smart_question"), expanded=True)
        self._add_content_module(self.center_scroll, self.center_sizer, "Watch", detail.get("risk_to_avoid"), expanded=False)
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

    def _add_content_module(self, parent: wx.Window, target_sizer: wx.BoxSizer, title: str, body: Any, *, expanded: bool) -> None:
        text = str(body or "")
        label = title if not text else f"{title} · {self._clip(text, 64)}"
        module = wx.CollapsiblePane(parent, label=label)
        module.Collapse(not expanded)
        pane = module.GetPane()
        pane_sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(pane_sizer)
        content = wx.StaticText(pane, label=text or "—")
        content.Wrap(620 if parent is self.center_scroll else 240)
        pane_sizer.Add(content, 0, wx.ALL | wx.EXPAND, 8)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_scrollers())
        target_sizer.Add(module, 0, wx.BOTTOM | wx.EXPAND, 6)

    def _add_note_module(self) -> None:
        primary_note = self.projection["smart"].get("primary_note") or {}
        body = primary_note.get("body") or ""
        module = wx.CollapsiblePane(self.right_scroll, label=f"Notes · {self._clip(body, 48) if body else 'empty'}")
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        self.note_text = wx.TextCtrl(pane, value=body, style=wx.TE_MULTILINE)
        self.note_text.SetMinSize((-1, 120))
        self.note_text.Enable(can_write(self.mode))
        save = wx.Button(pane, label="Save", size=(64, -1))
        save.Enable(can_write(self.mode))
        save.Bind(wx.EVT_BUTTON, self._on_save_note)
        sizer.Add(self.note_text, 1, wx.ALL | wx.EXPAND, 6)
        sizer.Add(save, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.ALIGN_RIGHT, 6)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_scrollers())
        self.right_sizer.Add(module, 0, wx.BOTTOM | wx.EXPAND, 6)

    def _add_keywords_module(self, detail: dict[str, Any]) -> None:
        keywords = list(detail.get("keywords") or [])
        definition = self.projection["smart"].get("selected_keyword_definition") or {}
        label = "Keywords" if not keywords else f"Keywords · {' '.join('#' + str(item) for item in keywords[:3])}"
        module = wx.CollapsiblePane(self.right_scroll, label=label)
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        self.keyword_list = wx.ListBox(pane, choices=[str(item) for item in keywords])
        self.keyword_definition = wx.StaticText(pane, label=str(definition.get("definition") or "No definition."))
        self.keyword_definition.Wrap(240)
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
                    " ".join(str(keyword) for keyword in item.get("keywords") or []),
                ]
            ).lower()
            if query in haystack:
                result.append(item)
        return result

    def _selected_detail(self) -> dict[str, Any] | None:
        detail = self.projection["smart"].get("selected_candidature_detail")
        if detail and self.selected_ref and str(detail.get("ref")) == str(self.selected_ref):
            return detail
        if detail and self.selected_ref is None:
            return None
        return detail if detail else None

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
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self._show_focus()
        self._refresh_all()

    def _go_overview(self) -> None:
        self.layout_state.selected_candidature_ref = None
        self._show_overview()
        self._refresh_all()

    def _on_overview_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.overview_search.GetValue()
        self.nav_search.SetValue(self.search_query)
        self._refresh_all()

    def _on_nav_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.nav_search.GetValue()
        self.overview_search.SetValue(self.search_query)
        self._refresh_all()

    def _on_clear_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = ""
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
                self.layout_state.pane_layout.setdefault("smart", {})["right"] = max(1, int(self.right_scroll.GetSize().GetWidth()))
            self.layout_state.save(self.layout_path)
        finally:
            event.Skip()
