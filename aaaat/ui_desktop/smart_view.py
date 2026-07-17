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
DEFAULT_FOCUS_RIGHT = 220
DEFAULT_WINDOW_SIZE = (1280, 780)
DEFAULT_CENTER_NOTES_HEIGHT = 150
_VIEW_TAB_INDEX = {"welcome": 0, "smart": 1, "detailed": 2, "user": 3}


class SmartViewMixin(OverviewBoardMixin):
    """Smart View behavior for the wx desktop frame."""

    def _init_smart_view_helpers(self) -> None:
        self.center_cards = CenterCardBuilder(self)
        self.keyword_linker = KeywordHtmlLinker(known_terms=self._known_terms, select_keyword=lambda term: self._select_keyword(term, refresh_center=False))

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
        if event.GetEventObject() is not self.view_book:
            if hasattr(event, "StopPropagation"):
                event.StopPropagation()
            event.Skip(False)
            return
        index = event.GetSelection()
        if index == _VIEW_TAB_INDEX["welcome"]:
            self._show_welcome()
        elif index == _VIEW_TAB_INDEX["detailed"]:
            self._go_detailed()
        elif index == _VIEW_TAB_INDEX["user"]:
            self._go_user()
        else:
            self._go_overview()
        event.Skip()

    def _view_cache_key(self, view: str) -> tuple[Any, ...]:
        detailed_columns = tuple(self.layout_state.detailed_columns.get("visible") or [])
        smart_surface = self._smart_surface if view == "smart" else ""
        return (view, smart_surface, str(self.selected_ref or ""), str(self.selected_keyword or ""), self.search_query, detailed_columns)

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
        if self.current_view == "welcome":
            self.title.SetLabel("AAAAT · Welcome")
        elif self.current_view == "user":
            self.title.SetLabel("AAAAT · User")
        elif self.current_view == "detailed":
            self.title.SetLabel("AAAAT · Detailed")
        else:
            self.title.SetLabel("AAAAT · Smart")

    def _layout_current_surface(self) -> None:
        if self.current_view == "welcome":
            self.welcome_panel.Layout()
        elif self.current_view == "smart":
            self.smart_panel.Layout()
            self.smart_sizer.Layout()
            if self._smart_surface == "overview":
                self.overview_panel.Layout()
                self.overview_scroll.Layout()
                self.overview_scroll.FitInside()
            else:
                self.focus_panel.Layout()
        elif self.current_view == "detailed":
            self.detailed_panel.Layout()
        elif self.current_view == "user":
            self.user_panel.Layout()
        self.view_book.Layout()
        self.root_sizer.Layout()
        self.root.Layout()
        self.Layout()

    def _show_overview(self) -> None:
        self.current_view = "smart"
        self._smart_surface = "overview"
        self.layout_state.selected_view = "smart"
        self.selected_ref = None
        self.overview_panel.Show()
        self.focus_panel.Hide()
        self._sync_view_tab()

    def _show_welcome(self) -> None:
        self.current_view = "welcome"
        self.layout_state.selected_view = "welcome"
        self._sync_view_tab()

    def _show_focus(self) -> None:
        self.current_view = "smart"
        self._smart_surface = "focus"
        self.layout_state.selected_view = "smart"
        self.overview_panel.Hide()
        self.focus_panel.Show()
        self._sync_view_tab()
        wx.CallAfter(self._apply_focus_layout, False)

    def _apply_focus_layout(self, force: bool) -> None:
        if not self.focus_panel.IsShown() or (self._focus_layout_applied and not force):
            return
        total_width = int(self.focus_panel.GetClientSize().GetWidth() or self.GetClientSize().GetWidth() or DEFAULT_WINDOW_SIZE[0])
        total_width = max(1, total_width)
        left = max(1, int(total_width * 0.18))
        right = max(1, int(total_width * 0.18))
        center = max(1, total_width - left - right)
        if self.focus_splitter.IsSplit():
            self.focus_splitter.SetSashPosition(left)
        if self.content_splitter.IsSplit():
            self.content_splitter.SetSashPosition(center)
        center_height = int(self.center_panel.GetClientSize().GetHeight() or self.GetClientSize().GetHeight() or DEFAULT_WINDOW_SIZE[1])
        center_height = max(1, center_height)
        notes_height = max(1, int(center_height * 0.20))
        if self.center_splitter.IsSplit():
            self.center_splitter.SetSashPosition(max(1, center_height - notes_height))
        self.focus_left_width = left
        self.focus_right_width = right
        self._focus_layout_applied = True
        self._layout_current_surface()

    def _refresh_all(self) -> None:
        self.Freeze()
        try:
            self._reload_projection()
            if self.current_view == "welcome":
                pass
            elif self.current_view == "user":
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
        view = self.current_view if self.current_view in {"welcome", "smart", "detailed", "user"} else "welcome"
        self.projection = build_dashboard_projection(
            payload,
            view=view,
            selected_application_id=self.selected_ref,
            selected_keyword=self.selected_keyword,
            search_query=self.search_query,
            layout_state=self.layout_state,
        )
        if self.selected_ref and not self._selected_detail() and not self._detailed_selected_row():
            self.selected_ref = None

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
        detail = self._selected_detail()
        if not detail:
            self.center_sizer.Add(self._empty_message(self.center_scroll, "Select a candidature."), 0, wx.ALL | wx.EXPAND, 12)
            self.center_scroll.Layout()
            self.smart_right_panel.render(self.projection, can_edit=True, view_name="smart")
            bind_parent_wheel_scroll(self.center_scroll, self.center_scroll)
            return

        self.center_cards.add_hero(detail)
        self.center_cards.add_key_details(detail)
        self.center_cards.add_interview_notes(detail)
        self.center_cards.add_source_card(detail)
        self._add_notes_band()
        self._refresh_right_context(detail)

        self.center_scroll.Layout()
        self.center_scroll.FitInside()
        self.center_notes_panel.Layout()
        bind_parent_wheel_scroll(self.center_scroll, self.center_scroll)

    def _add_notes_band(self) -> None:
        primary_note = self.projection["smart"].get("primary_note") or {}
        band = NotesBand(parent=self.center_notes_panel, target_sizer=self.center_notes_sizer, can_save=True, on_save=self._save_note_body)
        self.note_text = band.render(str(primary_note.get("body") or ""))

    def _save_note_body(self, body: str) -> None:
        if not self.selected_ref:
            return
        self.command_service.save_note(str(self.selected_ref), body)
        self._rendered_view_keys.clear()
        self._reload_projection()
        self.SetStatusText("Notes saved")
        self._mark_current_view_rendered()

    def _refresh_right_context(self, _detail: dict[str, Any]) -> None:
        self.smart_right_panel.render(self.projection, can_edit=True, view_name="smart")

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
        if not detail or self.selected_ref is None:
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
        self._refresh_current_if_needed()

    def _go_overview(self) -> None:
        self.expanded_overview_ref = None
        self.layout_state.selected_candidature_ref = None
        self._show_overview()
        self._refresh_current_if_needed()

    def _on_overview_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.overview_search.GetValue()
        self.expanded_overview_ref = None
        self.nav_search.SetValue(self.search_query)
        self._rendered_view_keys.pop("smart", None)
        self._refresh_all()

    def _on_nav_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.nav_search.GetValue()
        self.overview_search.SetValue(self.search_query)
        self._rendered_view_keys.pop("smart", None)
        self._refresh_all()

    def _on_clear_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = ""
        self.expanded_overview_ref = None
        self.overview_search.SetValue("")
        self.nav_search.SetValue("")
        self._rendered_view_keys.pop("smart", None)
        self._refresh_all()

    def _on_select_nav(self, event: wx.CommandEvent) -> None:
        index = event.GetSelection()
        if 0 <= index < len(self._list_refs):
            self._select_ref(self._list_refs[index])

    def _select_keyword(self, term: str, *, refresh_center: bool) -> None:
        self.selected_keyword = term
        self.layout_state.selected_keyword = term
        self._reload_projection()
        self._refresh_right_context(self._selected_detail() or {})
        self._mark_current_view_rendered()
        if refresh_center:
            self._refresh_focus_modules()

    def _save_candidature_panel_edits(self, ref: str, changes: dict[str, str]) -> None:
        if not ref or not changes:
            return
        self.command_service.update_candidature_fields(ref, changes)
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self._rendered_view_keys.clear()
        self._reload_projection()
        if self.current_view == "detailed":
            detailed = self.projection.get("detailed") or {}
            self.detail_table.render(detailed, selected_ref=self.selected_ref, visible_columns=self._visible_detailed_columns(detailed))
            self.detail_table.Layout()
        elif self.current_view == "smart":
            self._refresh_nav_list()
        self.SetStatusText("Saved")
        self._mark_current_view_rendered()

    def _on_candidature_panel_action(self, ref: str, action_id: str) -> None:
        if not ref:
            return
        task = self.command_service.queue_candidature_action(ref, action_id)
        if task:
            self.SetStatusText(f"Queued: {task.get('title')}")
            self._rendered_view_keys.clear()
            self._reload_projection()
            self._mark_current_view_rendered()

    def _add_keyword_to_candidature(self, ref: str, term: str, definition: str = "") -> None:
        if not ref or not term.strip():
            return
        self.command_service.add_keyword(ref, term, definition)
        self.selected_keyword = term.strip()
        self.layout_state.selected_keyword = self.selected_keyword
        self._rendered_view_keys.clear()
        self._reload_projection()
        if self.current_view == "detailed":
            self._refresh_detailed_view()
        else:
            self._refresh_right_context(self._selected_detail() or {})
        self.SetStatusText(f"Keyword added: {self.selected_keyword}")
        self._mark_current_view_rendered()

    def _save_keyword_definition(self, term: str, definition: str) -> None:
        if not term.strip():
            return
        self.command_service.save_keyword_definition(term, definition)
        self.selected_keyword = term.strip()
        self.layout_state.selected_keyword = self.selected_keyword
        self._rendered_view_keys.clear()
        self._reload_projection()
        if self.current_view == "detailed":
            self._refresh_detailed_view()
        else:
            self._refresh_right_context(self._selected_detail() or {})
        self.SetStatusText(f"Keyword definition saved: {self.selected_keyword}")
        self._mark_current_view_rendered()

    def _delete_candidature_from_panel(self, ref: str) -> None:
        if not ref:
            return
        label = ref
        row = self._detailed_selected_row() or self._selected_detail() or {}
        if row:
            label = " ".join(part for part in (str(row.get("company") or ""), str(row.get("role") or "")) if part).strip() or ref
        confirmed = wx.MessageBox(
            f"Delete candidature '{label}'?\n\nThis removes the local candidature record and its local intake/notes/artifact rows.",
            "Delete candidature",
            wx.YES_NO | wx.NO_DEFAULT | wx.ICON_WARNING,
            self,
        )
        if confirmed != wx.YES:
            return
        if not self.command_service.delete_candidature(ref):
            return
        self.selected_ref = None
        self.layout_state.selected_candidature_ref = None
        self._rendered_view_keys.clear()
        self._reload_projection()
        rows = (self.projection.get("detailed") or {}).get("rows") or []
        if rows:
            self.selected_ref = str(rows[0].get("ref") or "") or None
            self.layout_state.selected_candidature_ref = self.selected_ref
            self._reload_projection()
        self.SetStatusText("Candidature deleted")
        self._refresh_all()

    def _on_support_surface(self, _event: wx.Event) -> None:
        wx.MessageBox("Create candidatures from Welcome View or import source material into the current workspace.", "AAAAT Desktop")

    def _on_reset_layout(self, _event: wx.Event) -> None:
        current_view = self.current_view
        self.layout_state = self.layout_state.default()
        self.layout_state.selected_view = current_view
        self.center_card_state.reset()
        self.focus_left_width = DEFAULT_FOCUS_LEFT
        self.focus_right_width = DEFAULT_FOCUS_RIGHT
        self._focus_layout_applied = False
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _on_close(self, event: wx.CloseEvent) -> None:
        self.layout_state.selected_view = self.current_view
        self.layout_state.selected_candidature_ref = self.selected_ref
        self.layout_state.selected_keyword = self.selected_keyword
        self.layout_state.search_query = self.search_query
        if self.focus_splitter.IsSplit():
            self.layout_state.pane_layout.setdefault("smart", {})["left"] = self.focus_splitter.GetSashPosition()
        if self.content_splitter.IsSplit():
            total = max(1, self.content_splitter.GetClientSize().GetWidth())
            self.layout_state.pane_layout.setdefault("smart", {})["right"] = max(1, total - self.content_splitter.GetSashPosition())
        if hasattr(self, "detailed_splitter") and self.detailed_splitter.IsSplit():
            self.layout_state.pane_layout.setdefault("detailed", {})["left"] = max(1, self.detailed_splitter.GetSashPosition())
        if hasattr(self, "detailed_body_splitter") and self.detailed_body_splitter.IsSplit():
            total = max(1, self.detailed_body_splitter.GetClientSize().GetWidth())
            self.layout_state.pane_layout.setdefault("detailed", {})["right"] = max(1, total - self.detailed_body_splitter.GetSashPosition())
        self.layout_state.save(self.layout_path)
        event.Skip()
