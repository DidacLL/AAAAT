from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.profile_facts import FACT_TYPES
from .services import DesktopCommandService


class ProfileFactsDialog(wx.Dialog):
    """Manage reusable professional facts without exposing storage internals."""

    def __init__(self, parent: wx.Window, *, service: DesktopCommandService) -> None:
        super().__init__(
            parent,
            title="Experience, skills and preferences",
            size=(860, 640),
            style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER,
        )
        self.service = service
        self.facts: list[dict[str, Any]] = []

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        body = wx.BoxSizer(wx.HORIZONTAL)
        root.Add(body, 1, wx.ALL | wx.EXPAND, 12)

        left = wx.BoxSizer(wx.VERTICAL)
        self.list = wx.ListBox(self)
        add = wx.Button(self, label="Add")
        archive = wx.Button(self, label="Archive")
        left.Add(self.list, 1, wx.BOTTOM | wx.EXPAND, 8)
        actions = wx.BoxSizer(wx.HORIZONTAL)
        actions.Add(add, 0, wx.RIGHT, 6)
        actions.Add(archive, 0)
        left.Add(actions, 0)
        body.Add(left, 1, wx.RIGHT | wx.EXPAND, 12)

        editor = wx.FlexGridSizer(cols=2, vgap=8, hgap=10)
        editor.AddGrowableCol(1, 1)
        editor.AddGrowableRow(2, 1)
        self.type_choice = wx.Choice(self, choices=sorted(FACT_TYPES))
        self.title_text = wx.TextCtrl(self)
        self.body_text = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        self.tags_text = wx.TextCtrl(self)
        self.use_cv = wx.CheckBox(self, label="CV")
        self.use_cover = wx.CheckBox(self, label="Cover letter")
        self.use_agent = wx.CheckBox(self, label="Candidature analysis")
        self.use_research = wx.CheckBox(self, label="Company research")
        for label, control in (
            ("Type", self.type_choice),
            ("Title", self.title_text),
            ("Details", self.body_text),
            ("Tags", self.tags_text),
        ):
            editor.Add(wx.StaticText(self, label=label), 0, wx.ALIGN_TOP)
            editor.Add(control, 1, wx.EXPAND)
        usage = wx.WrapSizer(wx.HORIZONTAL)
        for control in (self.use_cv, self.use_cover, self.use_agent, self.use_research):
            usage.Add(control, 0, wx.RIGHT | wx.BOTTOM, 8)
        editor.Add(wx.StaticText(self, label="Use for"), 0, wx.ALIGN_TOP)
        editor.Add(usage, 1, wx.EXPAND)
        body.Add(editor, 2, wx.EXPAND)

        footer = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(self, label="Save")
        close = wx.Button(self, wx.ID_CLOSE, "Close")
        footer.AddStretchSpacer(1)
        footer.Add(save, 0, wx.RIGHT, 8)
        footer.Add(close, 0)
        root.Add(footer, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        self.list.Bind(wx.EVT_LISTBOX, self._on_select)
        add.Bind(wx.EVT_BUTTON, self._on_add)
        archive.Bind(wx.EVT_BUTTON, self._on_archive)
        save.Bind(wx.EVT_BUTTON, self._on_save)
        close.Bind(wx.EVT_BUTTON, lambda _event: self.EndModal(wx.ID_CLOSE))
        self._reload()

    def _reload(self) -> None:
        self.facts = self.service.list_profile_facts()
        self.list.Set([
            f"{fact.get('fact_type', '').replace('_', ' ').title()} · {fact.get('title') or 'Untitled'}"
            + (" · archived" if fact.get("review_state") == "archived" else "")
            for fact in self.facts
        ])
        if self.facts:
            self.list.SetSelection(0)
            self._load_fact(self.facts[0])
        else:
            self._clear()

    def _selected(self) -> dict[str, Any] | None:
        index = self.list.GetSelection()
        return self.facts[index] if 0 <= index < len(self.facts) else None

    def _load_fact(self, fact: dict[str, Any]) -> None:
        choice = sorted(FACT_TYPES)
        self.type_choice.SetSelection(choice.index(str(fact.get("fact_type"))) if fact.get("fact_type") in choice else 0)
        self.title_text.SetValue(str(fact.get("title") or ""))
        self.body_text.SetValue(str(fact.get("body") or ""))
        self.tags_text.SetValue(", ".join(str(tag) for tag in fact.get("tags") or []))
        self.use_cv.SetValue(bool(fact.get("use_for_cv")))
        self.use_cover.SetValue(bool(fact.get("use_for_cover_letter")))
        self.use_agent.SetValue(bool(fact.get("use_for_agent_context")))
        self.use_research.SetValue(bool(fact.get("use_for_market_research")))

    def _clear(self) -> None:
        self.type_choice.SetSelection(0)
        self.title_text.SetValue("")
        self.body_text.SetValue("")
        self.tags_text.SetValue("")
        for control in (self.use_cv, self.use_cover, self.use_agent, self.use_research):
            control.SetValue(False)

    def _values(self) -> dict[str, Any]:
        return {
            "fact_type": sorted(FACT_TYPES)[self.type_choice.GetSelection()],
            "title": self.title_text.GetValue(),
            "body": self.body_text.GetValue(),
            "tags": self.tags_text.GetValue(),
            "use_for_cv": self.use_cv.GetValue(),
            "use_for_cover_letter": self.use_cover.GetValue(),
            "use_for_agent_context": self.use_agent.GetValue(),
            "use_for_market_research": self.use_research.GetValue(),
            "use_for_dashboard": True,
            "visibility": "private",
            "exposure": "summarized",
            "review_state": "active",
        }

    def _on_select(self, _event: wx.CommandEvent) -> None:
        fact = self._selected()
        if fact:
            self._load_fact(fact)

    def _on_add(self, _event: wx.CommandEvent) -> None:
        self.list.SetSelection(wx.NOT_FOUND)
        self._clear()

    def _on_save(self, _event: wx.CommandEvent) -> None:
        values = self._values()
        selected = self._selected()
        if selected:
            self.service.update_profile_fact(str(selected["id"]), values)
        else:
            self.service.create_profile_fact(values)
        self._reload()

    def _on_archive(self, _event: wx.CommandEvent) -> None:
        selected = self._selected()
        if selected:
            self.service.archive_profile_fact(str(selected["id"]))
            self._reload()
