from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]


class OfferFirstDialog(wx.Dialog):
    """Create a candidature from retained source material plus optional hints."""

    def __init__(self, parent: wx.Window) -> None:
        super().__init__(parent, title="New candidature", size=(760, 680))
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        intro = wx.StaticText(self, label="Paste the original offer first. Company and role are optional; missing details can be completed later.")
        intro.Wrap(700)
        root.Add(intro, 0, wx.ALL | wx.EXPAND, 12)
        grid = wx.FlexGridSizer(cols=2, vgap=8, hgap=10)
        grid.AddGrowableCol(1, 1)
        self.company = self._row(grid, "Company", wx.TextCtrl(self))
        self.role = self._row(grid, "Role", wx.TextCtrl(self))
        self.source_url = self._row(grid, "Source URL", wx.TextCtrl(self))
        root.Add(grid, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)
        root.Add(wx.StaticText(self, label="Original job offer *"), 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.raw_offer = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        self.raw_offer.SetMinSize((-1, 230))
        root.Add(self.raw_offer, 1, wx.ALL | wx.EXPAND, 12)
        root.Add(wx.StaticText(self, label="Application form or questions"), 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.application_form = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        self.application_form.SetMinSize((-1, 110))
        root.Add(self.application_form, 0, wx.ALL | wx.EXPAND, 12)
        requests = wx.BoxSizer(wx.HORIZONTAL)
        self.request_cv = wx.CheckBox(self, label="Prepare a tailored CV when the application approach is ready")
        self.request_cover_letter = wx.CheckBox(self, label="Prepare a cover letter when the application approach is ready")
        requests.Add(self.request_cv, 0, wx.RIGHT, 16)
        requests.Add(self.request_cover_letter, 0)
        root.Add(requests, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)
        buttons = self.CreateSeparatedButtonSizer(wx.OK | wx.CANCEL)
        if buttons:
            root.Add(buttons, 0, wx.ALL | wx.EXPAND, 12)
        self.FindWindowById(wx.ID_OK).SetLabel("Create candidature")
        self.Bind(wx.EVT_BUTTON, self._on_ok, id=wx.ID_OK)

    def _row(self, grid: wx.FlexGridSizer, label: str, control: wx.TextCtrl) -> wx.TextCtrl:
        grid.Add(wx.StaticText(self, label=label), 0, wx.ALIGN_CENTER_VERTICAL)
        grid.Add(control, 1, wx.EXPAND)
        return control

    def _on_ok(self, _event: wx.CommandEvent) -> None:
        if not self.raw_offer.GetValue().strip():
            wx.MessageBox("Original job-offer text is required.", "Missing offer", wx.OK | wx.ICON_WARNING, self)
            self.raw_offer.SetFocus()
            return
        self.EndModal(wx.ID_OK)

    def values(self) -> dict[str, Any]:
        return {
            "raw_offer": self.raw_offer.GetValue().strip(),
            "company": self.company.GetValue().strip(),
            "role": self.role.GetValue().strip(),
            "source_url": self.source_url.GetValue().strip(),
            "application_form": self.application_form.GetValue().strip(),
            "request_cv": self.request_cv.GetValue(),
            "request_cover_letter": self.request_cover_letter.GetValue(),
        }
