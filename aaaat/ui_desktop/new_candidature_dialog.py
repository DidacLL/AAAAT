from __future__ import annotations

from typing import Callable

import wx  # type: ignore[import-not-found]

from aaaat.intake import IntakeService


class NewCandidatureDialog(wx.Dialog):
    def __init__(self, parent: wx.Window, *, service: IntakeService, on_created: Callable[[dict], None]) -> None:
        super().__init__(parent, title="Add job offer", size=(760, 680), style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER)
        self.service = service
        self.on_created = on_created
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        title = wx.StaticText(self, label="Paste the job offer")
        title.SetFont(title.GetFont().Bold().Larger().Larger())
        description = wx.StaticText(self, label="AAAAT creates the candidature immediately and queues the configured preparation.")
        root.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        root.Add(description, 0, wx.ALL | wx.EXPAND, 14)
        self.offer = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        self.offer.SetMinSize((-1, 360))
        root.Add(self.offer, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)
        optional = wx.CollapsiblePane(self, label="Optional details")
        pane = optional.GetPane()
        grid = wx.FlexGridSizer(cols=2, vgap=8, hgap=12)
        grid.AddGrowableCol(1, 1)
        pane.SetSizer(grid)
        self.company = wx.TextCtrl(pane)
        self.role = wx.TextCtrl(pane)
        self.form = wx.TextCtrl(pane, style=wx.TE_MULTILINE)
        self.form.SetMinSize((-1, 100))
        for label, control in (("Company", self.company), ("Role", self.role), ("Application form", self.form)):
            grid.Add(wx.StaticText(pane, label=label), 0, wx.ALIGN_TOP)
            grid.Add(control, 1, wx.EXPAND)
        root.Add(optional, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)
        self.error = wx.StaticText(self, label="")
        root.Add(self.error, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)
        buttons = self.CreateSeparatedButtonSizer(wx.OK | wx.CANCEL)
        root.Add(buttons, 0, wx.ALL | wx.EXPAND, 14)
        ok = self.FindWindowById(wx.ID_OK)
        if ok:
            ok.SetLabel("Add offer")
            ok.Bind(wx.EVT_BUTTON, self._create)

    def _create(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.service.create_from_offer(
                self.offer.GetValue(),
                company=self.company.GetValue(),
                role=self.role.GetValue(),
                raw_application_form=self.form.GetValue(),
            )
        except (ValueError, OSError) as exc:
            self.error.SetLabel(str(exc))
            return
        self.EndModal(wx.ID_OK)
        wx.CallAfter(self.on_created, result)
