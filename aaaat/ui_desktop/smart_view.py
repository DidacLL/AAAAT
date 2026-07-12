from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]
import wx.html  # type: ignore[import-not-found]

from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect
from aaaat.payload import dashboard_payload
from aaaat.security import can_write

from .candidature_actions import add_candidature_actions
from .center_cards import CenterCardBuilder
from .keyword_pane import KeywordPane
from .notes_band import NotesBand
from .overview_board import OverviewBoardMixin
from .scrolling import bind_parent_wheel_scroll
from .wx_html_links import KeywordHtmlLinker

DEFAULT_FOCUS_LEFT = 230
DEFAULT_FOCUS_RIGHT = 330
DEFAULT_WINDOW_SIZE = (1440, 860)
DEFAULT_CENTER_NOTES_HEIGHT = 150
_VIEW_TAB_INDEX = {"smart": 0, "detailed": 1, "user": 2}


class SmartViewMixin(OverviewBoardMixin):
    """Smart View behavior for the wx desktop frame."""

    def _init_smart_view_helpers(self) -> None:
        self.center_cards = CenterCardBuilder(self)
        self.keyword_linker = KeywordHtmlLinker(
            known_terms=self._known_terms,
            select_keyword=lambda term: self._select_keyword(term, refresh_center=False),
        )

    def _bind_shell_events(self) -> None:
        self.Bind(wx.EVT_CLOSE, self._on_close)
        self.Bind(wx.EVT_MENU, lambda _event: self.Close(), id=wx.ID_EXIT)
        self.Bind(wx.EVT_MENU, self._on_support_surface, self.new_candidature_item)
        self.Bind(wx.EVT_MENU, lambda _event: self._go_user(), self.profile_item)
        self.Bind(wx.EVT_MENU, self._on_reset_layout, self.reset_layout_item)
        self.view_book.Bind(wx.EVT_NOTEBOOK_PAGE_CHANGED, self._on_view_tab_changed)
        self.new_button.Bind(wx.EVT_BUTTON, self._on_support_surface)
        self.reset_button.Bind(wx.EVT_BUTTON, self._on_reset_layout)
        self.expand_list_button.Bind(wx.EVT_BUTTON, lambda _event: self._go_overview())
        self.overview_search.Bind(wx.EVT_SEARCHCTRL_SEARCH_BTN, self._on_overview_search)
        self.overview_search.Bind(wx.EVT_TEXT_ENTER, self._on_overview_search)
        self.overview_search.Bind(wx.EVT_SEARCHCTRL_CANCEL_BTN, self._on_clear_search)
        self.nav_search.Bind(wx.EVT_SEARCHCTRL_SEARCH_BTN, self._on_nav_search)
        self.nav_search.Bind(wx.EVT_TEXT_ENTER, self._on_nav_search)
        self.nav_search.Bind(wx.EVT_SEARCHCTRL_CANCEL_BTN, self._on_clear_search)
        self.nav_list.Bind(wx.EVT_LISTBOX, self._on_select_nav)
        self._bind_detailed_events()
        self._bind_user_events()

    def _sync_view_tab(self) -> None:
        target = _VIEW_TAB_INDEX.get(self.current_view, 0)
        if self.view_book.GetSelection() != target:
            self.view_book.ChangeSelection(target)

    def _on_view_tab_changed(self, event: wx.BookCtrlEvent) -> None:
        index = event.GetSelection()
        if index == _VIEW_TAB_INDEX["detailed"]:
            self._go_detailed()
        elif index == _VIEW_TAB_INDEX["user"]:
            self._go_user()
        elif self.selected_ref:
            self._show_focus()
            self._refresh_current_if_needed()
        else:
            self._go_overview()
        event.Skip()

    def _view_cache_key(self, view: str) -> tuple[Any, ...]:
        detailed_columns = tuple(self.layout_state.detailed_columns.get("visible") or [])
        smart_surface = self._smart_surface if view == "smart" else ""
        return (
            view,
            smart_surface,
            str(self.selected_ref or ""),
            str(self.selected_keyword or ""),
            self.search_query,
            detailed_columns,
        )

    def _is_view_rendered(self, view: str) -> bool:
        return self._rendered_view_keys.get(view) == self._view_cache_key(view)

    def _mark_current_view_rendered(self) -> None:
        self._rendered_view_keys[self.current_view] = self._view_cache_key(self.current_view)

    def _refresh_current_if_needed(self) -> None:
        if not self._is_view_rendered(self.current_view):
            self._refresh_all()
            return
        self._update_title_for_current_view()
        self._sync_view_tab()
        self._layout_current_surface()

    def _update_title_for_current_view(self) -> None:
        if self.current_view == "user":
            self.title.SetLabel("AAAAT · User")
        elif self.current_view == "detailed":
            self.title.SetLabel("AAAAT · Detailed")
        else:
            self.title.SetLabel("AAAAT · Smart")

    def _layout_current_surface(self) -> None:
        if self.current_view == "smart":
            self.smart_panel.Layout()
            self.smart_sizer.Layout()
            if self._smart_surface == "overview":
                self.overview_panel.Layout()
                self.overview_scroll.Layout()
                self.overview_scroll.FitInside()
            else:
                self.focus_panel.Layout()
                self._fit_vertical_scroll(self.center_body_scroll)
                self._fit_vertical_scroll(self.right_scroll)
        elif self.current_view == "detailed":
            self.detailed_panel.Layout()
        elif self.current_view == "user":
            self.user_panel.Layout()
        self.view_book.Layout()
        self.root_sizer.Layout()
        self.root.Layout()
        self.Layout()

    @staticmethod
    def _fit_vertical_scroll(window: wx.ScrolledWindow) -> None:
        width = max(1, window.GetClientSize().GetWidth())
        window.SetVirtualSize((width, max(window.GetBestVirtualSize().GetHeight(), window.GetClientSize().GetHeight())))
        window.Layout()

    def _show_overview(self) -> None:
        self.current_view = "smart"
        self._smart_surface = "overview"
        self.layout_state.selected_view = "smart"
        self.selected_ref = None
        self.overview_panel.Show()
        self.focus_panel.Hide()
        self._sync_view_tab()

    def _show_focus(self) -> None:
        self.current_view = "smart"
        self._smart_surface = "focus"
        self.layout_state.selected_view = "smart"
        self.overview_panel.Hide()
        self.focus_panel.Show()
        self._sync_view_tab()
        if not self._focus_layout_applied:
            wx.CallAfter(self._apply_focus_layout, False)

    def _apply_focus_layout(self, force: bool) -> None:
        if not self.focus_panel.IsShown() or (self._focus_layout_applied and not force):
            return
        total_width = max(DEFAULT_WINDOW_SIZE[0], int(self.focus_panel.GetClientSize().GetWidth() or DEFAULT_WINDOW_SIZE[0]))
        left = max(210, min(280, int(total_width * 0.18)))
        right = max(300, min(380, int(total_width * 0.24)))
        content_width = max(720, total_width - left)
        center = max(520, content_width - right)
        if self.focus_splitter.IsSplit():
            self.focus_splitter.SetSashPosition(left)
        if self.content_splitter.IsSplit():
            self.content_splitter.SetSashPosition(center)
        center_height = int(self.center_panel.GetClientSize().GetHeight() or DEFAULT_WINDOW_SIZE[1])
        notes_height = max(120, min(180, int(center_height * 0.18)))
        if self.center_splitter.IsSplit():
            self.center_splitter.SetSashPosition(max(260, center_height - notes_height))
        self.focus_left_width = left
        self.focus_right_width = right
        self._focus_layout_applied = True
        self._layout_current_surface()

    def _refresh_all(self) -> None:
        self.Freeze()
        try:
            self._reload_projection()
            if self.current_view == "user":
                self._refresh_user_view()
            elif self.current_view == "detailed":
                self._refresh_detailed_view()
            elif self._smart_surface == "overview":
                self._refresh_overview_cards()
            else:
                self._refresh_nav_list()
                self._refresh_focus_modules()
            self._update_title_for_current_view()
            self._sync_view_tab()
            self._mark_current_view_rendered()
            self._layout_current_surface()
        finally:
            self.Thaw()

    def _reload_projection(self) -> None:
        with connect(self.storage_path) as conn:
            payload = dashboard_payload(conn, include_raw=True)
        view = self.current_view if self.current_view in {"smart", "detailed", "user"} else "smart"
        self.projection = build_dashboard_projection(
            payload,
            self.mode,
            view=view,
            selected_application_id=self.selected_ref,
            selected_keyword=self.selected_keyword,
            search_query=self.search_query,
            layout_state=self.layout_state,
        )
        projected_ref = self.projection.get("view_state", {}).get("selected_candidature_ref")
        if projected_ref:
            self.selected_ref = str(projected_ref)
            self.layout_state.selected_candidature_ref = self.selected_ref

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
        self.center_notes_sizer.Clear(delete_windows=True)
        self.right_sizer.Clear(delete_windows=True)
        detail = self._selected_detail()
        if not detail:
            self.center_sizer.Add(self._empty_message(self.center_scroll, "Select a candidature."), 0, wx.ALL | wx.EXPAND, 12)
            self._fit_vertical_scroll(self.center_scroll)
            self._fit_vertical_scroll(self.right_scroll)
            bind_parent_wheel_scroll(self.center_scroll, self.center_scroll)
            return

        self.center_cards.add_hero(detail)
        self.center_cards.add_call_card(detail)
        self.center_cards.add_source_card(detail)
        self.center_cards.add_center_card("now", "Now", detail.get("prepare_first"), expanded_by_default=True, min_height=92)
        self.center_cards.add_center_card("later", "Later", detail.get("prepare_later"), expanded_by_default=False, min_height=92)
        self.center_cards.add_center_card("offer", "Offer", detail.get("offer_snapshot"), expanded_by_default=False, min_height=92)
        self._add_notes_band()
        self._refresh_right_context(detail)

        self.center_scroll.Layout()
        self.center_scroll.FitInside()
        self.center_notes_panel.Layout()
        self._fit_vertical_scroll(self.right_scroll)
        bind_parent_wheel_scroll(self.center_scroll, self.center_scroll)
        bind_parent_wheel_scroll(self.right_scroll, self.right_scroll)

    def _add_notes_band(self) -> None:
        primary_note = self.projection["smart"].get("primary_note") or {}
        band = NotesBand(
            parent=self.center_notes_panel,
            target_sizer=self.center_notes_sizer,
            can_save=can_write(self.mode),
            on_save=self._save_note_body,
        )
        self.note_text = band.render(str(primary_note.get("body") or ""))

    def _save_note_body(self, body: str) -> None:
        if not can_write(self.mode) or not self.selected_ref:
            return
        self.command_service.save_note(str(self.selected_ref), body)
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._mark_current_view_rendered()

    def _refresh_right_context(self, detail: dict[str, Any]) -> None:
        self.right_sizer.Clear(delete_windows=True)
        add_candidature_actions(self.right_scroll, self.right_sizer, self._open_candidature_action, compact=False)
        terms = self._terms_for_detail(detail)
        definition = self.projection["smart"].get("selected_keyword_definition") or {}
        selected = str(definition.get("term") or self.selected_keyword or (terms[0] if terms else ""))
        pane = KeywordPane(
            parent=self.right_scroll,
            target_sizer=self.right_sizer,
            html_text_window=lambda parent, text, min_height: self._html_text_window(parent, text, min_height=min_height),
            clip=self._clip,
        )
        pane.render_keyword_module(
            terms=terms,
            selected=selected,
            definition=definition,
            on_select=lambda term: self._select_keyword(term, refresh_center=False),
        )
        pane.render_content_module("Artifacts", self._artifacts_text(), expanded=False)
        self._fit_vertical_scroll(self.right_scroll)
        bind_parent_wheel_scroll(self.right_scroll, self.right_scroll)

    def _html_text_window(self, parent: wx.Window, text: str, *, min_height: int) -> wx.html.HtmlWindow:
        return self.keyword_linker.make_window(parent, text, min_height=min_height)

    def _known_terms(self) -> list[str]:
        terms: set[str] = set()
        for item in self.projection.get("glossary", {}).get("terms") or []:
            term = str(item.get("term") or "").strip()
            if len(term) >= 2:
                terms.add(term)
        detail = self._selected_detail() or {}
        for term in detail.get("keywords") or []:
            cleaned = str(term).strip()
            if len(cleaned) >= 2:
                terms.add(cleaned)
        return sorted(terms, key=len, reverse=True)

    def _terms_for_detail(self, detail: dict[str, Any]) -> list[str]:
        result: list[str] = []
        for term in detail.get("keywords") or []:
            if str(term).strip() and str(term) not in result:
                result.append(str(term))
        selected = self.selected_keyword
        if selected and selected not in result:
            result.insert(0, selected)
        return result

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

    def _on_overview_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.overview_search.GetValue()
        self._refresh_all()

    def _on_nav_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.nav_search.GetValue()
        self._refresh_all()

    def _on_clear_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = ""
        self.overview_search.SetValue("")
        self.nav_search.SetValue("")
        self._refresh_all()

    def _on_select_nav(self, event: wx.CommandEvent) -> None:
        index = event.GetSelection()
        if 0 <= index < len(self._list_refs):
            self._select_ref(self._list_refs[index])

    def _go_overview(self) -> None:
        self._show_overview()
        self._refresh_all()

    def _select_keyword(self, term: str, *, refresh_center: bool = True) -> None:
        self.selected_keyword = term
        self.layout_state.selected_keyword = term
        self._reload_projection()
        if refresh_center:
            self._refresh_focus_modules()
        else:
            detail = self._selected_detail()
            if detail:
                self._refresh_right_context(detail)
        self._mark_current_view_rendered()

    def _selected_detail(self) -> dict[str, Any] | None:
        detail = self.projection.get("smart", {}).get("selected_candidature_detail")
        if not isinstance(detail, dict):
            return None
        if self.selected_ref and str(detail.get("ref")) != str(self.selected_ref):
            return None
        return detail

    def _artifacts_text(self) -> str:
        summary = self.projection.get("smart", {}).get("artifact_summary") or {}
        items = summary.get("items") or []
        if not items:
            return "No artifacts yet."
        return "\n".join(
            self._clip(f"{item.get('artifact_type', 'artifact')} · {item.get('label', '')}", 90)
            for item in items
            if isinstance(item, dict)
        )
