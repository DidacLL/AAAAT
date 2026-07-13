from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]
import wx.html  # type: ignore[import-not-found]

from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect
from aaaat.payload import dashboard_payload

from .center_cards import CenterCardBuilder
from .notes_band import NotesBand
from .overview_board import OverviewBoardMixin
from .scrolling import bind_parent_wheel_scroll
from .wx_html_links import KeywordHtmlLinker

DEFAULT_FOCUS_LEFT = 220
DEFAULT_FOCUS_RIGHT = 320
DEFAULT_WINDOW_SIZE = (1440, 860)
DEFAULT_CENTER_NOTES_HEIGHT = 150
_VIEW_TAB_INDEX = {"smart": 0, "detailed": 1, "user": 2}


class SmartViewMixin(OverviewBoardMixin):
    """Smart View behavior. Frame state is the only selection authority."""

    def _init_smart_view_helpers(self) -> None:
        self.center_cards = CenterCardBuilder(self)
        self.keyword_linker = KeywordHtmlLinker(
            known_terms=self._known_terms,
            select_keyword=lambda term: self._select_keyword(term),
        )
        self._smart_surface = "focus" if self.selected_ref else "overview"

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
            if self._confirm_detail_navigation():
                self._go_detailed()
        elif index == _VIEW_TAB_INDEX["user"]:
            if self._confirm_detail_navigation():
                self._go_user()
        elif self.selected_ref:
            self._show_focus()
            self._refresh_current_if_needed()
        else:
            self._go_overview()
        event.Skip()

    def _view_cache_key(self, view: str) -> tuple[Any, ...]:
        return (
            view,
            self._smart_surface if view == "smart" else "",
            str(self.selected_ref or ""),
            str(self.selected_keyword or ""),
            self.search_query,
            tuple(self.layout_state.detailed_columns.get("visible") or []),
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
        label = "User" if self.current_view == "user" else "Detailed" if self.current_view == "detailed" else "Smart"
        self.title.SetLabel(f"AAAAT · {label}")

    def _layout_current_surface(self) -> None:
        if self.current_view == "smart":
            self.smart_panel.Layout()
            if self._smart_surface == "overview":
                self.overview_scroll.Layout()
                self.overview_scroll.FitInside()
            else:
                self.focus_panel.Layout()
                self.center_scroll.Layout()
                self.center_scroll.FitInside()
        elif self.current_view == "detailed":
            self.detailed_panel.Layout()
        elif self.current_view == "user":
            self.user_panel.Layout()
        self.view_book.Layout()
        self.root.Layout()
        self.Layout()

    def _show_overview(self) -> None:
        self.current_view = "smart"
        self._smart_surface = "overview"
        self.layout_state.selected_view = "smart"
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
        wx.CallAfter(self._apply_focus_layout, False)

    def _apply_focus_layout(self, force: bool = False) -> None:
        if not self.focus_panel.IsShown():
            return
        width = int(self.focus_panel.GetClientSize().GetWidth())
        if width <= 0:
            return
        left = max(190, min(260, round(width * 0.17)))
        right = max(280, min(380, round(width * 0.24)))
        center = width - left - right
        if center < 480:
            deficit = 480 - center
            right = max(240, right - deficit)
            center = width - left - right
        if self.focus_splitter.IsSplit():
            self.focus_splitter.SetSashPosition(left)
        if self.content_splitter.IsSplit():
            self.content_splitter.SetSashPosition(max(420, center))
        height = int(self.center_panel.GetClientSize().GetHeight())
        if height > 0 and self.center_splitter.IsSplit():
            notes_height = max(120, min(180, round(height * 0.18)))
            self.center_splitter.SetSashPosition(max(260, height - notes_height))
        self.focus_left_width = left
        self.focus_right_width = right
        self._focus_layout_applied = True
        if force:
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
        available_refs = {str(item.get("id")) for item in payload.get("applications") or []}
        if self.selected_ref and str(self.selected_ref) not in available_refs:
            self.selected_ref = None
            self.layout_state.selected_candidature_ref = None
            self._smart_surface = "overview"
        self.projection = build_dashboard_projection(
            payload,
            self.mode,
            view=self.current_view,
            selected_application_id=self.selected_ref,
            selected_keyword=self.selected_keyword,
            search_query=self.search_query,
            layout_state=self.layout_state,
        )

    def _refresh_nav_list(self) -> None:
        apps = self._filtered_summaries()
        self._list_refs = [str(item.get("ref")) for item in apps]
        labels = [
            self._clip(
                f"{item.get('company') or 'Company'}\n{item.get('role') or 'Role'} "
                + " ".join(f"#{keyword}" for keyword in item.get("keywords") or []),
                90,
            )
            for item in apps
        ]
        self.nav_list.Set(labels or ["No match"])
        if self.selected_ref in self._list_refs:
            self.nav_list.SetSelection(self._list_refs.index(str(self.selected_ref)))

    def _refresh_focus_modules(self) -> None:
        self.center_sizer.Clear(delete_windows=True)
        self.center_notes_sizer.Clear(delete_windows=True)
        detail = self._selected_detail()
        if not detail:
            self.center_sizer.Add(self._empty_message(self.center_scroll, "Select a candidature."), 0, wx.ALL, 12)
            self.smart_sidebar.render(None, [])
            return
        self.center_cards.add_hero(detail)
        self.center_cards.add_call_card(detail)
        self.center_cards.add_source_card(detail)
        self.center_cards.add_center_card("now", "Now", detail.get("prepare_first"), expanded_by_default=True, min_height=92)
        self.center_cards.add_center_card("later", "Later", detail.get("prepare_later"), expanded_by_default=False, min_height=92)
        self.center_cards.add_center_card("offer", "Offer", detail.get("offer_snapshot"), expanded_by_default=False, min_height=92)
        self._add_notes_band()
        self.center_scroll.Layout()
        self.center_scroll.FitInside()
        self.center_notes_panel.Layout()
        self._refresh_sidebars()
        bind_parent_wheel_scroll(self.center_scroll, self.center_scroll)

    def _add_notes_band(self) -> None:
        primary_note = self.projection.get("smart", {}).get("primary_note") or {}
        self.note_text = NotesBand(
            parent=self.center_notes_panel,
            target_sizer=self.center_notes_sizer,
            can_save=True,
            on_save=self._save_note_body,
        ).render(str(primary_note.get("body") or ""))

    def _save_note_body(self, body: str) -> None:
        if not self.selected_ref:
            return
        self.command_service.save_note(str(self.selected_ref), body)
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._mark_current_view_rendered()

    def _html_text_window(self, parent: wx.Window, text: str, *, min_height: int) -> wx.html.HtmlWindow:
        return self.keyword_linker.make_window(parent, text, min_height=min_height)

    def _known_terms(self) -> list[str]:
        values = {
            str(item.get("term") or "").strip()
            for item in self.projection.get("glossary", {}).get("terms") or []
            if len(str(item.get("term") or "").strip()) >= 2
        }
        detail = self._selected_detail() or {}
        values.update(str(term).strip() for term in detail.get("keywords") or [] if len(str(term).strip()) >= 2)
        return sorted(values, key=len, reverse=True)

    def _filtered_summaries(self) -> list[dict[str, Any]]:
        summaries = list(self.projection.get("smart", {}).get("candidature_summaries") or [])
        query = self.search_query.lower().strip()
        if not query:
            return summaries
        return [
            item
            for item in summaries
            if query
            in " ".join(
                [
                    str(item.get("company") or ""),
                    str(item.get("role") or ""),
                    str(item.get("status") or ""),
                    str(item.get("next_action") or ""),
                    str(item.get("call_signals") or ""),
                    str(item.get("source_excerpt") or ""),
                    " ".join(str(keyword) for keyword in item.get("keywords") or []),
                ]
            ).lower()
        ]

    def _on_overview_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.overview_search.GetValue()
        self.nav_search.SetValue(self.search_query)
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _on_nav_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.nav_search.GetValue()
        self.overview_search.SetValue(self.search_query)
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _on_clear_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = ""
        self.overview_search.SetValue("")
        self.nav_search.SetValue("")
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _on_select_nav(self, event: wx.CommandEvent) -> None:
        index = event.GetSelection()
        if 0 <= index < len(self._list_refs) and self._confirm_detail_navigation():
            self._select_ref(self._list_refs[index])

    def _go_overview(self) -> None:
        if not self._confirm_detail_navigation():
            return
        self.expanded_overview_ref = None
        self._show_overview()
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _select_keyword(self, term: str) -> None:
        self.selected_keyword = term
        self.layout_state.selected_keyword = term
        self._reload_projection()
        self._refresh_sidebars()
        self._mark_current_view_rendered()

    def _selected_detail(self) -> dict[str, Any] | None:
        if not self.selected_ref:
            return None
        detail = self.projection.get("smart", {}).get("selected_candidature_detail")
        if not isinstance(detail, dict) or str(detail.get("ref")) != str(self.selected_ref):
            return None
        enriched = dict(detail)
        smart = self.projection.get("smart", {})
        enriched["company_research"] = str((smart.get("company_research") or {}).get("body") or "")
        enriched["form_answers"] = str((smart.get("form_answers") or {}).get("body") or "")
        enriched["artifacts"] = list((smart.get("artifact_summary") or {}).get("items") or [])
        enriched["keyword_definitions"] = {
            str(item.get("term")): str(item.get("definition") or "")
            for item in self.projection.get("glossary", {}).get("terms") or []
            if isinstance(item, dict)
        }
        return enriched

    def _chips(self, detail: dict[str, Any]) -> str:
        parts = [
            str(detail.get("status") or ""),
            str(detail.get("priority") or ""),
            str(detail.get("location") or ""),
            str(detail.get("remote_mode") or ""),
        ]
        parts.extend(f"#{keyword}" for keyword in detail.get("keywords") or [])
        return "  ".join(part for part in parts if part)

    def _artifacts_text(self) -> str:
        artifacts = list((self.projection.get("smart", {}).get("artifact_summary") or {}).get("items") or [])
        return "\n".join(str(item.get("label") or item.get("artifact_type") or "Artifact") for item in artifacts if isinstance(item, dict)) or "No artifacts yet."
