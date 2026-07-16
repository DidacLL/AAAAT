from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .detail_fields import grouped_detail_fields
from .scrolling import bind_parent_wheel_scroll

FieldSaveCallback = Callable[[str, dict[str, str]], None]
ActionCallback = Callable[[str, str], None]
KeywordCallback = Callable[[str], None]
AddKeywordCallback = Callable[[str, str, str], None]
SaveKeywordDefinitionCallback = Callable[[str, str], None]
DeleteCallback = Callable[[str], None]

FIELD_ACTIONS: dict[str, tuple[str, str, str]] = {
    "company": ("infer_fields", "Infer", "Reinfer"),
    "role": ("infer_fields", "Infer", "Reinfer"),
    "source_url": ("infer_fields", "Infer", "Reinfer"),
    "location": ("infer_fields", "Infer", "Reinfer"),
    "remote_mode": ("infer_fields", "Infer", "Reinfer"),
    "salary_expectation": ("infer_fields", "Infer", "Reinfer"),
    "publication_date": ("infer_fields", "Infer", "Reinfer"),
    "application_date": ("infer_fields", "Infer", "Reinfer"),
    "description": ("infer_fields", "Infer", "Reinfer"),
    "offer_snapshot": ("infer_fields", "Infer", "Reinfer"),
    "candidature_evaluation": ("infer_fields", "Infer fit", "Refresh fit"),
    "strengths": ("infer_fields", "Infer", "Reinfer"),
    "risks_to_avoid": ("infer_fields", "Infer", "Reinfer"),
    "questions_to_ask": ("infer_fields", "Infer", "Reinfer"),
    "tech_stack": ("infer_fields", "Infer", "Reinfer"),
    "valuation": ("infer_fields", "Infer", "Reinfer"),
    "role_strategy": ("regenerate_strategy", "Draft", "Refresh"),
    "company_research": ("update_company_research", "Research", "Refresh"),
    "call_signals": ("infer_fields", "Infer", "Reinfer"),
    "pitch": ("infer_fields", "Draft", "Refresh"),
    "smart_question": ("infer_fields", "Draft", "Refresh"),
    "recruiter_material": ("prepare_recruiter_call", "Prepare", "Refresh"),
    "keywords": ("regenerate_keywords", "Extract", "Refresh"),
    "form_answers": ("prepare_form_answers", "Draft", "Refresh"),
    "cv_material": ("generate_cv", "Draft CV", "Refresh CV"),
    "cover_letter_material": ("generate_cover_letter", "Draft letter", "Refresh letter"),
}


class CandidatureDetailBodyPanel(wx.ScrolledWindow):
    """Central Detailed View body: grouped candidature fields with inline edit/generate controls."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: FieldSaveCallback,
        on_action: ActionCallback,
        on_keyword_select: KeywordCallback | None = None,
        on_add_keyword: AddKeywordCallback | None = None,
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_save = on_save
        self.on_action = on_action
        self.on_keyword_select = on_keyword_select or (lambda _term: None)
        self.on_add_keyword = on_add_keyword or (lambda _ref, _term, _definition: None)
        self._current_ref = ""
        self._can_edit = False
        self._active_editor: InlineFieldEditor | None = None
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)

    def render(self, projection: dict[str, Any], *, can_edit: bool) -> None:
        self.Freeze()
        try:
            self._can_edit = bool(can_edit)
            self._current_ref = _selected_ref(projection)
            self._active_editor = None
            self.sizer.Clear(delete_windows=True)
            if not self._current_ref:
                self._add_empty()
            else:
                self._add_header(projection)
                for group in grouped_detail_fields(projection):
                    fields = [field for field in group.get("fields") or [] if _show_field_in_body(field)]
                    if not fields:
                        continue
                    heading = wx.StaticText(self, label=str(group.get("title") or "Candidature"))
                    heading.SetFont(heading.GetFont().Bold().Larger())
                    self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
                    field_panel = wx.Panel(self)
                    field_sizer = wx.WrapSizer(wx.HORIZONTAL)
                    field_panel.SetSizer(field_sizer)
                    for field in fields:
                        editor = InlineFieldEditor(
                            field_panel,
                            field=field,
                            can_edit=self._can_edit,
                            allow_action=True,
                            on_save=self._save_field,
                            on_action=self._queue_field_action,
                            on_begin_edit=self._begin_field_edit,
                            on_keyword_select=self.on_keyword_select,
                            on_add_keyword=self._add_keyword,
                        )
                        editor.SetMinSize((self._field_card_width(), -1))
                        field_sizer.Add(editor, 0, wx.ALL, 6)
                    self.sizer.Add(field_panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)
            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()
        wx.CallAfter(self._refresh_after_layout)

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="Select a candidature")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="Use the list on the left to inspect and edit a candidature.")
        body.Wrap(self._wrap_width())
        self.sizer.Add(title, 0, wx.ALL | wx.EXPAND, 12)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

    def _add_header(self, projection: dict[str, Any]) -> None:
        detail = _selected_detail(projection)
        company = str(detail.get("company") or "Untitled company")
        role = str(detail.get("role") or "Untitled role")
        title = wx.StaticText(self, label=company)
        title.SetFont(title.GetFont().Bold().Larger().Larger())
        subtitle = wx.StaticText(self, label=role)
        subtitle.SetFont(subtitle.GetFont().Larger())
        chips = wx.StaticText(self, label="  ".join(str(detail.get(key) or "") for key in ("status", "priority", "location", "remote_mode") if str(detail.get(key) or "").strip()))
        for control in (title, subtitle, chips):
            control.Wrap(self._wrap_width())
            self.sizer.Add(control, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)

    def _save_field(self, storage_key: str, value: str) -> None:
        if self._current_ref and storage_key:
            self.on_save(self._current_ref, {storage_key: value})

    def _queue_field_action(self, action_id: str) -> None:
        if self._current_ref and action_id:
            self.on_action(self._current_ref, action_id)

    def _add_keyword(self, term: str, definition: str) -> None:
        if self._current_ref and term.strip():
            self.on_add_keyword(self._current_ref, term, definition)

    def _begin_field_edit(self, editor: "InlineFieldEditor") -> None:
        if self._active_editor is not None and self._active_editor is not editor:
            self._active_editor.close_editor()
        self._active_editor = editor

    def _refresh_after_layout(self) -> None:
        try:
            self.Layout()
            self.FitInside()
            self.Refresh(eraseBackground=True)
            self.Update()
        except RuntimeError:
            pass

    def _wrap_width(self) -> int:
        return max(260, int(self.GetClientSize().GetWidth() or 640) - 36)

    def _field_card_width(self) -> int:
        width = int(self.GetClientSize().GetWidth() or 720)
        if width >= 1180:
            return max(320, int((width - 70) / 3))
        if width >= 760:
            return max(340, int((width - 54) / 2))
        return max(280, width - 36)


class CandidatureOptionsPanel(wx.ScrolledWindow):
    """View-specific right rail: Smart keyword context or Detailed record controls."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_action: ActionCallback,
        on_delete: DeleteCallback,
        on_keyword_select: KeywordCallback | None = None,
        on_add_keyword: AddKeywordCallback | None = None,
        on_save_keyword_definition: SaveKeywordDefinitionCallback | None = None,
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_action = on_action
        self.on_delete = on_delete
        self.on_keyword_select = on_keyword_select or (lambda _term: None)
        self.on_add_keyword = on_add_keyword or (lambda _ref, _term, _definition: None)
        self.on_save_keyword_definition = on_save_keyword_definition or (lambda _term, _definition: None)
        self._current_ref = ""
        self._can_edit = False
        self._view_name = "smart"
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)

    def render(self, projection: dict[str, Any], *, can_edit: bool, view_name: str) -> None:
        self.Freeze()
        try:
            self._current_ref = _selected_ref(projection)
            self._can_edit = bool(can_edit)
            self._view_name = view_name
            self._projection = projection
            self.sizer.Clear(delete_windows=True)
            if not self._current_ref:
                self._add_empty()
            elif view_name == "smart":
                self._add_keyword_context(projection, editable=False)
            else:
                self._add_selection_summary(projection)
                self._add_record_options()
            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="Context")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="Select a candidature to see keyword and material context.")
        body.Wrap(self._wrap_width())
        self.sizer.Add(title, 0, wx.ALL | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _add_selection_summary(self, projection: dict[str, Any]) -> None:
        detail = _selected_detail(projection)
        title = wx.StaticText(self, label="Selected")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="\n".join(part for part in (str(detail.get("company") or ""), str(detail.get("role") or "")) if part))
        body.Wrap(self._wrap_width())
        self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _add_keyword_context(self, projection: dict[str, Any], *, editable: bool) -> None:
        detail = _selected_detail(projection)
        terms = _keyword_terms(detail.get("keywords"))
        selected = str((projection.get("view_state") or {}).get("selected_keyword") or "").strip() or (terms[0] if terms else "")
        definition = _keyword_definition(projection, selected)
        label = f"Keyword · {selected}" if selected else "Keyword"
        module = wx.CollapsiblePane(self, label=label)
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        title = wx.StaticText(pane, label=selected or "No keyword selected")
        title.SetFont(title.GetFont().Bold())
        body = wx.StaticText(pane, label=str(definition.get("definition") or "Click a highlighted term or keyword chip to inspect it here."))
        title.Wrap(self._wrap_width())
        body.Wrap(self._wrap_width())
        sizer.Add(title, 0, wx.ALL | wx.EXPAND, 6)
        sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        if terms:
            chips_panel = wx.Panel(pane)
            chips = wx.WrapSizer(wx.HORIZONTAL)
            chips_panel.SetSizer(chips)
            for term in terms:
                button = wx.Button(chips_panel, label=term)
                button.Bind(wx.EVT_BUTTON, lambda _event, selected_term=term: self.on_keyword_select(selected_term))
                chips.Add(button, 0, wx.ALL, 2)
            sizer.Add(chips_panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)
        if editable and self._can_edit:
            controls = wx.BoxSizer(wx.HORIZONTAL)
            add = wx.Button(pane, label="Add keyword")
            edit = wx.Button(pane, label="Edit definition")
            edit.Enable(bool(selected))
            add.Bind(wx.EVT_BUTTON, lambda _event: self._dialog_add_keyword())
            edit.Bind(wx.EVT_BUTTON, lambda _event, selected_term=selected, current=str(definition.get("definition") or ""): self._dialog_edit_definition(selected_term, current))
            controls.Add(add, 0, wx.ALL, 3)
            controls.Add(edit, 0, wx.ALL, 3)
            sizer.Add(controls, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 3)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_inside())
        self.sizer.Add(module, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

    def _add_artifact_context(self, projection: dict[str, Any]) -> None:
        summary = (projection.get("smart") or {}).get("artifact_summary") or {}
        items = summary.get("items") or []
        text = "No material yet."
        if items:
            rows = []
            for item in items[:5]:
                if isinstance(item, dict):
                    rows.append(" · ".join(str(part) for part in (item.get("artifact_type"), item.get("label"), item.get("review_state")) if part))
                else:
                    rows.append(str(item))
            text = "\n".join(rows)
        module = wx.CollapsiblePane(self, label="Material")
        module.Collapse(True)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        body = wx.StaticText(pane, label=text)
        body.Wrap(self._wrap_width())
        sizer.Add(body, 0, wx.ALL | wx.EXPAND, 6)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_inside())
        self.sizer.Add(module, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

    def _add_record_options(self) -> None:
        label = wx.StaticText(self, label="Record")
        label.SetFont(label.GetFont().Bold().Larger())
        delete_button = wx.Button(self, label="Delete")
        delete_button.Enable(self._can_edit)
        delete_button.Bind(wx.EVT_BUTTON, lambda _event: self.on_delete(self._current_ref))
        self.sizer.Add(label, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(delete_button, 0, wx.LEFT | wx.RIGHT | wx.TOP, 10)

    def _dialog_add_keyword(self) -> None:
        if not self._current_ref:
            return
        term_dialog = wx.TextEntryDialog(self, "Keyword", "Add keyword")
        try:
            if term_dialog.ShowModal() != wx.ID_OK:
                return
            term = term_dialog.GetValue().strip()
        finally:
            term_dialog.Destroy()
        if not term:
            return
        definition_dialog = wx.TextEntryDialog(self, "Definition text shown when this keyword appears.", "Keyword definition", "")
        try:
            definition = definition_dialog.GetValue() if definition_dialog.ShowModal() == wx.ID_OK else ""
        finally:
            definition_dialog.Destroy()
        self.on_add_keyword(self._current_ref, term, definition)

    def _dialog_edit_definition(self, term: str, current: str) -> None:
        if not term:
            return
        dialog = wx.TextEntryDialog(self, "Definition text shown when this keyword appears.", f"Define {term}", current)
        try:
            if dialog.ShowModal() != wx.ID_OK:
                return
            definition = dialog.GetValue()
        finally:
            dialog.Destroy()
        self.on_save_keyword_definition(term, definition)

    def _fit_inside(self) -> None:
        self.Layout()
        self.FitInside()

    def _wrap_width(self) -> int:
        return max(180, int(self.GetClientSize().GetWidth() or 300) - 24)


class InlineFieldEditor(wx.Panel):
    """One field, one inline edit lifecycle."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        field: dict[str, Any],
        can_edit: bool,
        allow_action: bool,
        on_save: Callable[[str, str], None],
        on_action: Callable[[str], None],
        on_begin_edit: Callable[["InlineFieldEditor"], None],
        on_keyword_select: KeywordCallback | None = None,
        on_add_keyword: Callable[[str, str], None] | None = None,
    ) -> None:
        super().__init__(parent, style=wx.BORDER_SIMPLE)
        self.SetBackgroundStyle(wx.BG_STYLE_SYSTEM)
        self.field = field
        self.can_edit = bool(can_edit and field.get("editable") and field.get("storage_key"))
        self.action_spec = FIELD_ACTIONS.get(str(field.get("key") or "")) if allow_action else None
        self.on_save = on_save
        self.on_action = on_action
        self.on_begin_edit = on_begin_edit
        self.on_keyword_select = on_keyword_select or (lambda _term: None)
        self.on_add_keyword = on_add_keyword or (lambda _term, _definition: None)
        self._value = str(field.get("value") or "")
        self._status = ""
        self._editing = False
        self._editor: wx.Control | None = None
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)
        self.Bind(wx.EVT_SIZE, self._on_size)
        self._render_view()

    def close_editor(self) -> None:
        if self._editing:
            self._editing = False
            self._status = ""
            self._render_view()

    def _render_view(self) -> None:
        self.Freeze()
        try:
            self._editor = None
            self.sizer.Clear(delete_windows=True)
            header = wx.BoxSizer(wx.HORIZONTAL)
            label = wx.StaticText(self, label=str(self.field.get("label") or self.field.get("key") or "Field"))
            label.SetFont(label.GetFont().Bold())
            header.Add(label, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
            if self.action_spec:
                _action_id, empty_label, filled_label = self.action_spec
                action = wx.Button(self, label=filled_label if self._value.strip() else empty_label)
                action.Bind(wx.EVT_BUTTON, self._queue_action)
                header.Add(action, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
            if str(self.field.get("key") or "") == "keywords" and self.can_edit:
                add = wx.Button(self, label="Add")
                add.Bind(wx.EVT_BUTTON, self._dialog_add_keyword)
                header.Add(add, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
            if self.can_edit:
                edit = wx.Button(self, label="Edit")
                edit.Bind(wx.EVT_BUTTON, self._start_edit)
                header.Add(edit, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
            self.sizer.Add(header, 0, wx.EXPAND)
            if str(self.field.get("key") or "") == "keywords":
                self._add_keyword_chips()
            else:
                display = self._display_value()
                body = wx.StaticText(self, label=display or "—")
                body.Wrap(self._wrap_width())
                self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
            if self._status:
                status = wx.StaticText(self, label=self._status)
                status.Wrap(self._wrap_width())
                self.sizer.Add(status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        finally:
            self.Thaw()
        self._finish_render()

    def _add_keyword_chips(self) -> None:
        terms = _keyword_terms(self._value)
        if not terms:
            self.sizer.Add(wx.StaticText(self, label="—"), 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
            return
        chips_panel = wx.Panel(self)
        chips = wx.WrapSizer(wx.HORIZONTAL)
        chips_panel.SetSizer(chips)
        for term in terms:
            button = wx.Button(chips_panel, label=term)
            button.Bind(wx.EVT_BUTTON, lambda _event, selected_term=term: self.on_keyword_select(selected_term))
            chips.Add(button, 0, wx.ALL, 2)
        self.sizer.Add(chips_panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _render_edit(self) -> None:
        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            header = wx.BoxSizer(wx.HORIZONTAL)
            label = wx.StaticText(self, label=str(self.field.get("label") or self.field.get("key") or "Field"))
            label.SetFont(label.GetFont().Bold())
            header.Add(label, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
            save = wx.Button(self, label="Save")
            cancel = wx.Button(self, label="Cancel")
            save.Bind(wx.EVT_BUTTON, self._save)
            cancel.Bind(wx.EVT_BUTTON, self._cancel)
            header.Add(save, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
            header.Add(cancel, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
            self.sizer.Add(header, 0, wx.EXPAND)

            choices = [str(item) for item in self.field.get("choices") or []]
            if choices:
                editor: wx.Control = wx.Choice(self, choices=choices)
                try:
                    editor.SetStringSelection(self._value)
                except Exception:
                    pass
            else:
                long_text = bool(self.field.get("multiline") or "\n" in self._value or len(self._value) > 80)
                style = wx.TE_MULTILINE if long_text else 0
                editor = wx.TextCtrl(self, value=self._value, style=style)
                if long_text:
                    editor.SetMinSize((self._editor_width(), self._editor_height()))
                else:
                    editor.SetMinSize((min(420, self._editor_width()), -1))
            self._editor = editor
            self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        finally:
            self.Thaw()
        self._finish_render()

    def _start_edit(self, _event: wx.CommandEvent) -> None:
        self.on_begin_edit(self)
        self._editing = True
        self._status = ""
        self._render_edit()

    def _save(self, _event: wx.CommandEvent) -> None:
        value = self._read_editor_value()
        self.on_save(str(self.field.get("storage_key") or ""), value)
        self._value = value
        self._editing = False
        self._status = "Saved."
        self._render_view()

    def _cancel(self, _event: wx.CommandEvent) -> None:
        self._editing = False
        self._status = ""
        self._render_view()

    def _queue_action(self, _event: wx.CommandEvent) -> None:
        if not self.action_spec:
            return
        self.on_action(self.action_spec[0])
        self._status = "Queued."
        self._render_view()

    def _dialog_add_keyword(self, _event: wx.CommandEvent) -> None:
        term_dialog = wx.TextEntryDialog(self, "Keyword", "Add keyword")
        try:
            if term_dialog.ShowModal() != wx.ID_OK:
                return
            term = term_dialog.GetValue().strip()
        finally:
            term_dialog.Destroy()
        if not term:
            return
        definition_dialog = wx.TextEntryDialog(self, "Definition text shown when this keyword appears.", "Keyword definition", "")
        try:
            definition = definition_dialog.GetValue() if definition_dialog.ShowModal() == wx.ID_OK else ""
        finally:
            definition_dialog.Destroy()
        self.on_add_keyword(term, definition)
        self._status = f"Added keyword: {term}"
        self._render_view()

    def _read_editor_value(self) -> str:
        editor = self._editor
        if isinstance(editor, wx.Choice):
            return editor.GetStringSelection()
        if isinstance(editor, wx.TextCtrl):
            return editor.GetValue()
        return self._value

    def _display_value(self) -> str:
        text = self._value
        if len(text) <= 1200:
            return text
        return text[:1200].rstrip() + "…"

    def _finish_render(self) -> None:
        self.Layout()
        parent = self.GetParent()
        if isinstance(parent, wx.Window):
            parent.Layout()
        scroller = parent.GetParent() if isinstance(parent, wx.Window) else None
        if isinstance(scroller, wx.ScrolledWindow):
            scroller.Layout()
            scroller.FitInside()
        self.Refresh(eraseBackground=True)
        wx.CallAfter(self._refresh_after_render)

    def _refresh_after_render(self) -> None:
        try:
            self.Layout()
            parent = self.GetParent()
            if isinstance(parent, wx.Window):
                parent.Layout()
            scroller = parent.GetParent() if isinstance(parent, wx.Window) else None
            if isinstance(scroller, wx.ScrolledWindow):
                scroller.Layout()
                scroller.FitInside()
                scroller.Refresh(eraseBackground=True)
            self.Refresh(eraseBackground=True)
            self.Update()
        except RuntimeError:
            pass

    def _wrap_width(self) -> int:
        return max(220, int(self.GetClientSize().GetWidth() or 520) - 24)

    def _editor_width(self) -> int:
        return max(280, min(680, self._wrap_width()))

    def _editor_height(self) -> int:
        return max(132, min(300, 96 + len(self._value) // 6))

    def _on_size(self, event: wx.SizeEvent) -> None:
        if not self._editing:
            for child in self.GetChildren():
                if isinstance(child, wx.StaticText):
                    child.Wrap(self._wrap_width())
        event.Skip()


def _selected_ref(projection: dict[str, Any]) -> str:
    detail = (projection.get("smart") or {}).get("selected_candidature_detail") or {}
    row = (projection.get("detailed") or {}).get("selected_row") or {}
    return str(detail.get("ref") or row.get("ref") or "")


def _selected_detail(projection: dict[str, Any]) -> dict[str, Any]:
    detail = (projection.get("smart") or {}).get("selected_candidature_detail") or {}
    row = (projection.get("detailed") or {}).get("selected_row") or {}
    result = dict(row)
    result.update(detail)
    return result


def _show_field_in_body(field: dict[str, Any]) -> bool:
    return bool(field.get("editable"))


def _keyword_terms(value: Any) -> list[str]:
    if isinstance(value, list):
        raw = value
    else:
        raw = str(value or "").replace("\n", ",").split(",")
    terms: list[str] = []
    for item in raw:
        term = str(item).strip()
        if term and term not in terms:
            terms.append(term)
    return terms


def _keyword_definition(projection: dict[str, Any], selected: str) -> dict[str, Any]:
    selected_definition = (projection.get("glossary") or {}).get("selected") or {}
    if selected and str(selected_definition.get("term") or "") == selected:
        return selected_definition
    for item in (projection.get("glossary") or {}).get("terms") or []:
        if str(item.get("term") or "") == selected:
            return item
    return {"term": selected, "definition": "", "category": ""}


# Backwards-compatible name for older imports. New code should choose the body
# or options class explicitly.
CandidatureRightPanel = CandidatureOptionsPanel
