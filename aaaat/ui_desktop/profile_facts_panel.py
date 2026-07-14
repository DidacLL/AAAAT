from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

FactListCallback = Callable[[], list[dict[str, Any]]]
FactCreateCallback = Callable[[dict[str, Any]], list[dict[str, Any]]]
FactUpdateCallback = Callable[[str, dict[str, Any]], list[dict[str, Any]]]
FactArchiveCallback = Callable[[str], list[dict[str, Any]]]

FACT_TYPES = [
    ("Achievement", "achievement"),
    ("Experience", "experience"),
    ("Skill", "skill"),
    ("Project or work sample", "project"),
    ("Education", "education"),
    ("Qualification or certification", "certification"),
    ("Language", "language"),
    ("Role preference", "preference"),
    ("Constraint", "constraint"),
]
FACT_TYPE_LABELS = {value: label for label, value in FACT_TYPES}


class ProfileFactsPanel(wx.Panel):
    """Structured reusable evidence for applications and preparation material."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        facts: list[dict[str, Any]],
        can_edit: bool,
        on_create: FactCreateCallback,
        on_update: FactUpdateCallback,
        on_archive: FactArchiveCallback,
        on_geometry_changed: Callable[[], None],
    ) -> None:
        super().__init__(parent, style=wx.BORDER_SIMPLE)
        self.facts = list(facts)
        self.can_edit = can_edit
        self.on_create = on_create
        self.on_update = on_update
        self.on_archive = on_archive
        self.on_geometry_changed = on_geometry_changed
        self.root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.root)
        self._render()

    def _render(self) -> None:
        self.Freeze()
        try:
            self.root.Clear(delete_windows=True)
            header = wx.BoxSizer(wx.HORIZONTAL)
            title = wx.StaticText(self, label="Reusable evidence")
            title.SetFont(title.GetFont().Bold().Larger())
            add = wx.Button(self, label="Add evidence…")
            add.Enable(self.can_edit)
            add.Bind(wx.EVT_BUTTON, self._add)
            header.Add(title, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 8)
            header.Add(add, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
            self.root.Add(header, 0, wx.EXPAND)

            helper = wx.StaticText(
                self,
                label="Keep achievements, experience, qualifications and other evidence as reusable records. Choose where each record may be used.",
            )
            helper.Wrap(760)
            self.root.Add(helper, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

            if not self.facts:
                empty = wx.StaticText(self, label="No reusable evidence has been added yet.")
                self.root.Add(empty, 0, wx.ALL | wx.EXPAND, 8)
            for fact in self.facts:
                self._add_fact_card(fact)
            self.Layout()
        finally:
            self.Thaw()
        wx.CallAfter(self.on_geometry_changed)

    def _add_fact_card(self, fact: dict[str, Any]) -> None:
        card = wx.Panel(self, style=wx.BORDER_SIMPLE)
        root = wx.BoxSizer(wx.VERTICAL)
        card.SetSizer(root)
        title = str(fact.get("title") or "Untitled evidence")
        fact_type = FACT_TYPE_LABELS.get(str(fact.get("fact_type") or ""), "Evidence")
        heading = wx.StaticText(card, label=f"{title} · {fact_type}")
        heading.SetFont(heading.GetFont().Bold())
        heading.Wrap(720)
        root.Add(heading, 0, wx.ALL | wx.EXPAND, 8)

        body = wx.StaticText(card, label=str(fact.get("body") or "No details provided."))
        body.Wrap(720)
        root.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        uses = []
        if fact.get("use_for_cv"):
            uses.append("CV")
        if fact.get("use_for_cover_letter"):
            uses.append("cover letters")
        if fact.get("use_for_agent_context"):
            uses.append("application preparation")
        usage = wx.StaticText(card, label="May be used for: " + (", ".join(uses) if uses else "desktop reference only"))
        usage.Wrap(720)
        root.Add(usage, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        actions = wx.BoxSizer(wx.HORIZONTAL)
        actions.AddStretchSpacer(1)
        edit = wx.Button(card, label="Edit…")
        archive = wx.Button(card, label="Archive")
        edit.Enable(self.can_edit)
        archive.Enable(self.can_edit)
        edit.Bind(wx.EVT_BUTTON, lambda _event, item=fact: self._edit(item))
        archive.Bind(wx.EVT_BUTTON, lambda _event, item=fact: self._archive(item))
        actions.Add(edit, 0, wx.RIGHT, 6)
        actions.Add(archive, 0)
        root.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        self.root.Add(card, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _add(self, _event: wx.CommandEvent) -> None:
        dialog = ProfileFactDialog(self)
        try:
            if dialog.ShowModal() != wx.ID_OK:
                return
            values = dialog.values()
        finally:
            dialog.Destroy()
        self.facts = self.on_create(values)
        self._render()

    def _edit(self, fact: dict[str, Any]) -> None:
        dialog = ProfileFactDialog(self, fact=fact)
        try:
            if dialog.ShowModal() != wx.ID_OK:
                return
            values = dialog.values()
        finally:
            dialog.Destroy()
        self.facts = self.on_update(str(fact.get("id") or ""), values)
        self._render()

    def _archive(self, fact: dict[str, Any]) -> None:
        if wx.MessageBox("Move this evidence record to the archive?", "Archive evidence", wx.YES_NO | wx.NO_DEFAULT | wx.ICON_QUESTION, self) != wx.YES:
            return
        self.facts = self.on_archive(str(fact.get("id") or ""))
        self._render()


class ProfileFactDialog(wx.Dialog):
    def __init__(self, parent: wx.Window, *, fact: dict[str, Any] | None = None) -> None:
        fact = fact or {}
        super().__init__(parent, title="Reusable evidence", size=(620, 620))
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        root.Add(wx.StaticText(self, label="Type"), 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.type_choice = wx.Choice(self, choices=[label for label, _value in FACT_TYPES])
        current_type = str(fact.get("fact_type") or "experience")
        self.type_choice.SetSelection(next((i for i, (_label, value) in enumerate(FACT_TYPES) if value == current_type), 1))
        root.Add(self.type_choice, 0, wx.ALL | wx.EXPAND, 12)

        root.Add(wx.StaticText(self, label="Title"), 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.title_editor = wx.TextCtrl(self, value=str(fact.get("title") or ""))
        root.Add(self.title_editor, 0, wx.ALL | wx.EXPAND, 12)

        root.Add(wx.StaticText(self, label="Details"), 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.body_editor = wx.TextCtrl(self, value=str(fact.get("body") or ""), style=wx.TE_MULTILINE)
        self.body_editor.SetMinSize((-1, 180))
        root.Add(self.body_editor, 1, wx.ALL | wx.EXPAND, 12)

        root.Add(wx.StaticText(self, label="Tags, separated by commas"), 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.tags_editor = wx.TextCtrl(self, value=", ".join(fact.get("tags") or []))
        root.Add(self.tags_editor, 0, wx.ALL | wx.EXPAND, 12)

        self.use_cv = wx.CheckBox(self, label="May be used in CV material")
        self.use_letter = wx.CheckBox(self, label="May be used in cover letters")
        self.use_context = wx.CheckBox(self, label="May be used while preparing applications")
        self.use_cv.SetValue(bool(fact.get("use_for_cv")))
        self.use_letter.SetValue(bool(fact.get("use_for_cover_letter")))
        self.use_context.SetValue(bool(fact.get("use_for_agent_context")))
        for control in (self.use_cv, self.use_letter, self.use_context):
            root.Add(control, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)

        buttons = self.CreateSeparatedButtonSizer(wx.OK | wx.CANCEL)
        if buttons:
            root.Add(buttons, 0, wx.ALL | wx.EXPAND, 12)
        self.FindWindowById(wx.ID_OK).SetLabel("Save evidence")
        self.Bind(wx.EVT_BUTTON, self._on_ok, id=wx.ID_OK)

    def _on_ok(self, _event: wx.CommandEvent) -> None:
        if not self.title_editor.GetValue().strip() or not self.body_editor.GetValue().strip():
            wx.MessageBox("A title and details are required.", "Missing evidence details", wx.OK | wx.ICON_WARNING, self)
            return
        self.EndModal(wx.ID_OK)

    def values(self) -> dict[str, Any]:
        index = max(0, self.type_choice.GetSelection())
        return {
            "fact_type": FACT_TYPES[index][1],
            "title": self.title_editor.GetValue().strip(),
            "body": self.body_editor.GetValue().strip(),
            "tags": [tag.strip() for tag in self.tags_editor.GetValue().split(",") if tag.strip()],
            "visibility": "private",
            "exposure": "summarized",
            "use_for_cv": self.use_cv.GetValue(),
            "use_for_cover_letter": self.use_letter.GetValue(),
            "use_for_agent_context": self.use_context.GetValue(),
            "use_for_market_research": False,
            "use_for_desktop": True,
            "source": "user",
        }
