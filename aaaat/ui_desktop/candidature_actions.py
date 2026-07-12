from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import wx  # type: ignore[import-not-found]


@dataclass(frozen=True)
class CandidatureAction:
    key: str
    label: str
    description: str


ACTIONS = (
    CandidatureAction("company_research", "Research company", "Fill the company research for this candidature."),
    CandidatureAction("field_inference", "Complete details", "Suggest missing candidature information."),
    CandidatureAction("draft_cover_letter", "Draft cover letter", "Create a cover letter for this candidature."),
)


def add_candidature_actions(
    parent: wx.Window,
    target_sizer: wx.Sizer,
    on_action: Callable[[str], None],
    *,
    compact: bool = False,
) -> wx.Panel:
    """Render user-facing actions in the candidature that they affect."""

    panel = wx.Panel(parent)
    root = wx.BoxSizer(wx.VERTICAL)
    panel.SetSizer(root)

    heading = wx.StaticText(panel, label="AI assistance")
    heading.SetFont(heading.GetFont().Bold().Larger())
    root.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 8)

    row = wx.BoxSizer(wx.HORIZONTAL)
    for action in ACTIONS:
        button = wx.Button(panel, label=action.label)
        button.SetToolTip(action.description)
        button.Bind(wx.EVT_BUTTON, lambda _event, key=action.key: on_action(key))
        row.Add(button, 0, wx.ALL, 4)
    root.Add(row, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)

    if not compact:
        note = wx.StaticText(panel, label="Choose what you want AAAAT to prepare for this candidature.")
        note.Wrap(560)
        root.Add(note, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 8)

    target_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)
    return panel
