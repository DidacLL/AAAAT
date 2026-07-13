from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .detail_fields import grouped_detail_fields
from .scrolling import bind_parent_wheel_scroll

FieldSaveCallback = Callable[[str, dict[str, str]], None]
ActionCallback = Callable[[str, str], None]
DeleteCallback = Callable[[str], None]

TAB_GROUPS = {
    "Overview": {"Overview", "Source"},
    "Evaluation & Strategy": {"Evaluation and strategy", "Recruiter call"},
    "Keywords": {"Keywords"},
    "Material": {"Material"},
    "Actions": set(),
}

PANEL_ACTIONS = (
    ("regenerate_evaluation", "Regenerate offer evaluation"),
    ("regenerate_strategy", "Regenerate role strategy"),
    ("update_company_research", "Update company research"),
    ("regenerate_keywords", "Regenerate keyword definitions"),
    ("prepare_form_answers", "Prepare form answers"),
    ("generate_cv", "Generate tailored CV"),
    ("generate_cover_letter", "Generate cover letter"),
    ("prepare_recruiter_call", "Generate recruiter-call material"),
)


class CandidatureRightPanel(wx.Panel):
    """Shared tabbed candidature panel for Smart and Detailed views."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: FieldSaveCallback,
        on_action: ActionCallback,
        on_delete: DeleteCallback,
        on_open_smart: Callable[[], None] | None = None,
    ) -> None:
        super().__init__(parent)
        self.on_save = on_save
        self.on_action = on_action
        self.on_delete = on_delete
        self.on_open_smart = on_open_smart or (lambda: None)
        self._current_ref = ""
        self._can_edit = False
        self._view_name = "smart"
        self._selected_keyword = ""
        self._glossary_terms: list[dict[str, Any]] = []
        self.root_sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.root_sizer)
        self.notebook = wx.Notebook(self)
        self.root_sizer.Add(self.notebook, 1, wx.EXPAND)

    def render(self, projection: dict[str, Any], *, can_edit: bool, view_name: str) -> None:
        self.Freeze()
        try:
            self._can_edit = can_edit
            self._view_name = view_name
            self._current_ref = _selected_ref(projection)
            self._selected_keyword = str((projection.get("view_state") or {}).get("selected_keyword") or "")
            self._glossary_terms = list((projection.get("glossary") or {}).get("terms") or [])
            self.notebook.DeleteAllPages()
            if not self._current_ref:
                self._add_empty_page()
            else:
                groups = grouped_detail_fields(projection)
                for tab_title, group_names in TAB_GROUPS.items():
                    if tab_title == "Actions":
                        self._add_actions_tab(projection)
                    else:
                        self._add_fields_tab(tab_title, groups, group_names)
            self.Layout()
        finally:
            self.Thaw()

    def _add_empty_page(self) -> None:
        page, sizer = self._new_page()
        title = wx.StaticText(page, label="No candidature selected")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(page, label="Select a candidature to inspect, edit and act on it.")
        body.Wrap(260)
        sizer.Add(title, 0, wx.ALL | wx.EXPAND, 10)
        sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)
        self._finalize_page(page, "Candidature")

    def _add_fields_tab(self, title: str, groups: list[dict[str, Any]], group_names: set[str]) -> None:
        page, sizer = self._new_page()
        found = False
        for group in groups:
            if str(group.get("title") or "") not in group_names:
                continue
            fields = [field for field in group.get("fields") or [] if _show_field_in_panel(field)]
            if not fields:
                continue
            found = True
            heading = wx.StaticText(page, label=str(group.get("title") or title))
            heading.SetFont(heading.GetFont().Bold().Larger())
            sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
            for field in fields:
                editor = InlineFieldEditor(page, field=field, can_edit=self._can_edit, on_save=self._save_field)
                sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        if title == "Keywords":
            self._add_keyword_definitions(page, sizer)
            found = True
        if not found:
            sizer.Add(wx.StaticText(page, label="No data yet."), 0, wx.ALL | wx.EXPAND, 10)
        self._finalize_page(page, title)

    def _add_keyword_definitions(self, page: wx.ScrolledWindow, sizer: wx.BoxSizer) -> None:
        terms = [term for term in self._glossary_terms if str(term.get("term") or "").strip()]
        if not terms:
            return
        heading = wx.StaticText(page, label="Definitions")
        heading.SetFont(heading.GetFont().Bold().Larger())
        sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        for term in terms[:12]:
            label = str(term.get("term") or "")
            body = str(term.get("definition") or "No definition yet.")
            text = wx.StaticText(page, label=f"{label}: {body}")
            text.Wrap(300)
            sizer.Add(text, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)

    def _add_actions_tab(self, projection: dict[str, Any]) -> None:
        page, sizer = self._new_page()
        title = wx.StaticText(page, label="Candidature actions")
        title.SetFont(title.GetFont().Bold().Larger())
        sizer.Add(title, 0, wx.ALL | wx.EXPAND, 10)
        for action_id, label in PANEL_ACTIONS:
            button = wx.Button(page, label=label)
            button.Enable(self._can_edit)
            button.Bind(wx.EVT_BUTTON, lambda _event, selected=action_id: self.on_action(self._current_ref, selected))
            sizer.Add(button, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        open_button = wx.Button(page, label="Open in Smart View")
        open_button.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_smart())
        sizer.Add(open_button, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        delete_button = wx.Button(page, label="Delete candidature")
        delete_button.Enable(self._can_edit)
        delete_button.Bind(wx.EVT_BUTTON, lambda _event: self.on_delete(self._current_ref))
        sizer.Add(delete_button, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 10)
        hint = wx.StaticText(page, label="Generation actions create bounded local tasks. Existing editable values remain authoritative until changed or regenerated.")
        hint.Wrap(300)
        sizer.Add(hint, 0, wx.ALL | wx.EXPAND, 10)
        self._finalize_page(page, "Actions")

    def _save_field(self, storage_key: str, value: str) -> None:
        if self._current_ref and storage_key:
            self.on_save(self._current_ref, {storage_key: value})

    def _new_page(self) -> tuple[wx.ScrolledWindow, wx.BoxSizer]:
        page = wx.ScrolledWindow(self.notebook)
        page.SetScrollRate(8, 12)
        sizer = wx.BoxSizer(wx.VERTICAL)
        page.SetSizer(sizer)
        return page, sizer

    def _finalize_page(self, page: wx.ScrolledWindow, title: str) -> None:
        page.Layout()
        page.FitInside()
        bind_parent_wheel_scroll(page, page)
        self.notebook.AddPage(page, title)


class InlineFieldEditor(wx.Panel):
    """One field, one edit control, one save/cancel cycle."""

    def __init__(self, parent: wx.Window, *, field: dict[str, Any], can_edit: bool, on_save: Callable[[str, str], None]) -> None:
        super().__init__(parent, style=wx.BORDER_SIMPLE)
        self.field = field
        self.can_edit = can_edit and bool(field.get("editable")) and bool(field.get("storage_key"))
        self.on_save = on_save
        self._value = str(field.get("value") or "")
        self._editing = False
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)
        self.Bind(wx.EVT_SIZE, self._on_size)
        self._render_view()

    def _render_view(self) -> None:
        self.sizer.Clear(delete_windows=True)
        header = wx.BoxSizer(wx.HORIZONTAL)
        label = wx.StaticText(self, label=str(self.field.get("label") or self.field.get("key") or "Field"))
        label.SetFont(label.GetFont().Bold())
        header.Add(label, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        if self.can_edit:
            edit = wx.Button(self, label="Edit", size=(58, -1))
            edit.Bind(wx.EVT_BUTTON, self._start_edit)
            header.Add(edit, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
        self.sizer.Add(header, 0, wx.EXPAND)
        body = wx.StaticText(self, label=self._value or "—")
        body.Wrap(self._wrap_width())
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        self.Layout()

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
                editor.SetMinSize((-1, max(96, min(190, 26 + len(self._value) // 4))))
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
        self._editing = True
        self._render_edit()

    def _save(self, _event: wx.CommandEvent) -> None:
        value = self._read_editor_value()
        self._value = value
        self._editing = False
        self.on_save(str(self.field.get("storage_key") or ""), value)

    def _cancel(self, _event: wx.CommandEvent) -> None:
        self._editing = False
        self._render_view()

    def _read_editor_value(self) -> str:
        editor = getattr(self, "_editor", None)
        if isinstance(editor, wx.Choice):
            return editor.GetStringSelection()
        if isinstance(editor, wx.TextCtrl):
            return editor.GetValue()
        return self._value

    def _wrap_width(self) -> int:
        return max(180, int(self.GetClientSize().GetWidth() or 300) - 24)

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


def _show_field_in_panel(field: dict[str, Any]) -> bool:
    key = str(field.get("key") or "")
    value = str(field.get("value") or "")
    return bool(field.get("editable")) or bool(value.strip()) or key in {"company", "role", "status", "role_strategy", "candidature_evaluation", "keywords"}
