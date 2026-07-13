from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .detail_fields import grouped_detail_fields
from .scrolling import bind_parent_wheel_scroll

FieldSaveCallback = Callable[[str, dict[str, str]], None]
ActionCallback = Callable[[str, str], None]
KeywordCallback = Callable[[str], None]
DeleteCallback = Callable[[str], None]

FIELD_ACTIONS: dict[str, tuple[str, str, str]] = {
    "candidature_evaluation": ("regenerate_evaluation", "Generate", "Regenerate"),
    "role_strategy": ("regenerate_strategy", "Generate", "Regenerate"),
    "company_research": ("update_company_research", "Research", "Refresh"),
    "keywords": ("regenerate_keywords", "Generate", "Regenerate"),
    "form_answers": ("prepare_form_answers", "Generate", "Regenerate"),
    "cv_material": ("generate_cv", "Generate CV", "Regenerate CV"),
    "cover_letter_material": ("generate_cover_letter", "Generate letter", "Regenerate letter"),
    "recruiter_material": ("prepare_recruiter_call", "Generate prep", "Regenerate prep"),
}

RAIL_ACTIONS = (
    ("regenerate_evaluation", "Evaluation"),
    ("regenerate_strategy", "Strategy"),
    ("update_company_research", "Company research"),
    ("regenerate_keywords", "Keywords"),
    ("prepare_form_answers", "Form answers"),
    ("generate_cv", "CV material"),
    ("generate_cover_letter", "Cover letter"),
    ("prepare_recruiter_call", "Call prep"),
)


class CandidatureDetailBodyPanel(wx.ScrolledWindow):
    """Central Detailed View body: all candidature fields, grouped and editable."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: FieldSaveCallback,
        on_action: ActionCallback,
        on_keyword_select: KeywordCallback | None = None,
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_save = on_save
        self.on_action = on_action
        self.on_keyword_select = on_keyword_select or (lambda _term: None)
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
                    for field in fields:
                        editor = InlineFieldEditor(
                            self,
                            field=field,
                            can_edit=self._can_edit,
                            allow_action=True,
                            on_save=self._save_field,
                            on_action=self._queue_field_action,
                            on_begin_edit=self._begin_field_edit,
                            on_keyword_select=self.on_keyword_select,
                        )
                        self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

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

    def _begin_field_edit(self, editor: "InlineFieldEditor") -> None:
        if self._active_editor is not None and self._active_editor is not editor:
            self._active_editor.close_editor()
        self._active_editor = editor

    def _wrap_width(self) -> int:
        return max(260, int(self.GetClientSize().GetWidth() or 640) - 36)


class CandidatureOptionsPanel(wx.ScrolledWindow):
    """Right-side working options rail for selected candidature context and actions."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_action: ActionCallback,
        on_delete: DeleteCallback,
        on_open_smart: Callable[[], None] | None = None,
        on_keyword_select: KeywordCallback | None = None,
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_action = on_action
        self.on_delete = on_delete
        self.on_open_smart = on_open_smart or (lambda: None)
        self.on_keyword_select = on_keyword_select or (lambda _term: None)
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
            self.sizer.Clear(delete_windows=True)
            if not self._current_ref:
                self._add_empty()
            else:
                self._add_selection_summary(projection)
                self._add_keyword_context(projection)
                self._add_actions()
            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="Options")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="Select a candidature to see context and actions.")
        body.Wrap(self._wrap_width())
        self.sizer.Add(title, 0, wx.ALL | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _add_selection_summary(self, projection: dict[str, Any]) -> None:
        detail = _selected_detail(projection)
        title = wx.StaticText(self, label="Selected")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="\n".join(part for part in (str(detail.get("company") or ""), str(detail.get("role") or ""), str(detail.get("next_action") or "")) if part))
        body.Wrap(self._wrap_width())
        self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)
        if self._view_name == "detailed":
            open_button = wx.Button(self, label="Open in Smart")
            open_button.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_smart())
            delete_button = wx.Button(self, label="Delete candidature")
            delete_button.Enable(self._can_edit)
            delete_button.Bind(wx.EVT_BUTTON, lambda _event: self.on_delete(self._current_ref))
            self.sizer.Add(open_button, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
            self.sizer.Add(delete_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _add_keyword_context(self, projection: dict[str, Any]) -> None:
        detail = _selected_detail(projection)
        terms = _keyword_terms(detail.get("keywords"))
        selected = str((projection.get("view_state") or {}).get("selected_keyword") or "").strip() or (terms[0] if terms else "")
        definition = _keyword_definition(projection, selected)
        heading = wx.StaticText(self, label="Keyword context")
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        selected_label = wx.StaticText(self, label=selected or "No keyword selected")
        selected_label.SetFont(selected_label.GetFont().Bold())
        body = wx.StaticText(self, label=str(definition.get("definition") or "Click a highlighted term or keyword chip to inspect it here."))
        selected_label.Wrap(self._wrap_width())
        body.Wrap(self._wrap_width())
        self.sizer.Add(selected_label, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)
        if terms:
            chips_panel = wx.Panel(self)
            chips = wx.WrapSizer(wx.HORIZONTAL)
            chips_panel.SetSizer(chips)
            for term in terms:
                button = wx.Button(chips_panel, label=term, size=(-1, 26))
                button.Bind(wx.EVT_BUTTON, lambda _event, selected_term=term: self.on_keyword_select(selected_term))
                chips.Add(button, 0, wx.ALL, 2)
            self.sizer.Add(chips_panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _add_actions(self) -> None:
        heading = wx.StaticText(self, label="Actions")
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        for action_id, label in RAIL_ACTIONS:
            button = wx.Button(self, label=label)
            button.Enable(self._can_edit)
            button.Bind(wx.EVT_BUTTON, lambda _event, selected=action_id: self.on_action(self._current_ref, selected))
            self.sizer.Add(button, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)

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
    ) -> None:
        super().__init__(parent, style=wx.BORDER_SIMPLE)
        self.field = field
        self.can_edit = bool(can_edit and field.get("editable") and field.get("storage_key"))
        self.action_spec = FIELD_ACTIONS.get(str(field.get("key") or "")) if allow_action else None
        self.on_save = on_save
        self.on_action = on_action
        self.on_begin_edit = on_begin_edit
        self.on_keyword_select = on_keyword_select or (lambda _term: None)
        self._value = str(field.get("value") or "")
        self._status = ""
        self._editing = False
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
        self.sizer.Clear(delete_windows=True)
        header = wx.BoxSizer(wx.HORIZONTAL)
        label = wx.StaticText(self, label=str(self.field.get("label") or self.field.get("key") or "Field"))
        label.SetFont(label.GetFont().Bold())
        header.Add(label, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        if self.action_spec:
            _action_id, empty_label, filled_label = self.action_spec
            action = wx.Button(self, label=filled_label if self._value.strip() else empty_label, size=(112, -1))
            action.Bind(wx.EVT_BUTTON, self._queue_action)
            header.Add(action, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
        if self.can_edit:
            edit = wx.Button(self, label="Edit", size=(58, -1))
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
        self.Layout()

    def _add_keyword_chips(self) -> None:
        terms = _keyword_terms(self._value)
        if not terms:
            self.sizer.Add(wx.StaticText(self, label="—"), 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
            return
        chips_panel = wx.Panel(self)
        chips = wx.WrapSizer(wx.HORIZONTAL)
        chips_panel.SetSizer(chips)
        for term in terms:
            button = wx.Button(chips_panel, label=term, size=(-1, 26))
            button.Bind(wx.EVT_BUTTON, lambda _event, selected_term=term: self.on_keyword_select(selected_term))
            chips.Add(button, 0, wx.ALL, 2)
        self.sizer.Add(chips_panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _render_edit(self) -> None:
        self.sizer.Clear(delete_windows=True)
        label = wx.StaticText(self, label=str(self.field.get("label") or self.field.get("key") or "Field"))
        label.SetFont(label.GetFont().Bold())
        self.sizer.Add(label, 0, wx.ALL | wx.EXPAND, 6)
        choices = [str(item) for item in self.field.get("choices") or []]
        if choices:
            editor: wx.Control = wx.Choice(self, choices=choices)
            try:
                editor.SetStringSelection(self._value)
            except Exception:
                pass
        else:
            style = wx.TE_MULTILINE if self.field.get("multiline") else 0
            editor = wx.TextCtrl(self, value=self._value, style=style)
            if self.field.get("multiline"):
                editor.SetMinSize((-1, max(96, min(220, 48 + len(self._value) // 5))))
        self._editor = editor
        self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        buttons = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(self, label="Save")
        cancel = wx.Button(self, label="Cancel")
        save.Bind(wx.EVT_BUTTON, self._save)
        cancel.Bind(wx.EVT_BUTTON, self._cancel)
        buttons.AddStretchSpacer(1)
        buttons.Add(save, 0, wx.ALL, 4)
        buttons.Add(cancel, 0, wx.ALL, 4)
        self.sizer.Add(buttons, 0, wx.EXPAND)
        self.Layout()

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
        self._status = "Edit cancelled."
        self._render_view()

    def _queue_action(self, _event: wx.CommandEvent) -> None:
        if not self.action_spec:
            return
        self.on_action(self.action_spec[0])
        self._status = "Queued."
        self._render_view()

    def _read_editor_value(self) -> str:
        editor = getattr(self, "_editor", None)
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

    def _wrap_width(self) -> int:
        return max(220, int(self.GetClientSize().GetWidth() or 520) - 24)

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
    key = str(field.get("key") or "")
    value = str(field.get("value") or "")
    return bool(field.get("editable")) or bool(value.strip()) or key in {"company", "role", "status", "role_strategy", "candidature_evaluation", "keywords"}


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
