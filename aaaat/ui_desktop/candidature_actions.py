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
    CandidatureAction(
        "field_inference",
        "Refresh candidature analysis",
        "Extract offer facts, operational call material, strengths, risks, questions, stack, keywords and valuation.",
    ),
    CandidatureAction(
        "company_research",
        "Research company",
        "Prepare company context relevant to this role and application.",
    ),
    CandidatureAction(
        "career_plan_review",
        "Evaluate career fit",
        "Compare this opportunity with your saved career direction and priorities.",
    ),
    CandidatureAction(
        "draft_form_responses",
        "Prepare form answers",
        "Draft answers for the stored application form when one is present.",
    ),
    CandidatureAction(
        "draft_cv",
        "Prepare CV",
        "Prepare a role-specific CV only when this application needs one.",
    ),
    CandidatureAction(
        "draft_cover_letter",
        "Prepare cover letter",
        "Prepare a cover letter only when this application needs one.",
    ),
)


def add_candidature_actions(
    parent: wx.Window,
    target_sizer: wx.Sizer,
    on_action: Callable[[str], None],
    *,
    compact: bool = False,
) -> wx.Panel:
    """Render supplementary actions in the right-side candidature context."""

    panel = wx.Panel(parent)
    root = wx.BoxSizer(wx.VERTICAL)
    panel.SetSizer(root)

    heading = wx.StaticText(panel, label="Prepare or refresh")
    heading.SetFont(heading.GetFont().Bold().Larger())
    root.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 8)

    for action in ACTIONS:
        button = wx.Button(panel, label=action.label)
        button.SetToolTip(action.description)
        button.Bind(wx.EVT_BUTTON, lambda _event, key=action.key: on_action(key))
        root.Add(button, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)

    if not compact:
        note = wx.StaticText(
            panel,
            label="New offers are analyzed automatically. Use these actions only to rerun or prepare something additional.",
        )
        note.Wrap(260)
        root.Add(note, 0, wx.ALL | wx.EXPAND, 8)

    target_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)
    return panel
