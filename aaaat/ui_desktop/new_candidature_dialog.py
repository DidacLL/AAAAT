from __future__ import annotations

from typing import Callable

import wx  # type: ignore[import-not-found]

from aaaat.intake import IntakeService


class NewCandidatureDialog(wx.Dialog):
    """Simple intake surface: the offer is primary; metadata is optional."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        service: IntakeService,
        on_created: Callable[[dict], None],
    ) -> None:
        super().__init__(
            parent,
            title="Add job offer",
            size=(760, 700),
            style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER,
        )
        self.service = service
        self.on_created = on_created

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        heading = wx.StaticText(self, label="Paste the job offer")
        heading.SetFont(heading.GetFont().Bold().Larger().Larger())
        explanation = wx.StaticText(
            self,
            label="AAAAT saves it immediately and prepares the configured candidature analysis in the background.",
        )
        explanation.Wrap(700)
        root.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        root.Add(explanation, 0, wx.ALL | wx.EXPAND, 14)

        self.offer_text = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        self.offer_text.SetMinSize((-1, 360))
        root.Add(self.offer_text, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        optional = wx.CollapsiblePane(self, label="Optional details")
        panel = optional.GetPane()
        optional_sizer = wx.FlexGridSizer(cols=2, vgap=8, hgap=12)
        optional_sizer.AddGrowableCol(1, 1)
        panel.SetSizer(optional_sizer)
        self.company_text = wx.TextCtrl(panel)
        self.role_text = wx.TextCtrl(panel)
        self.form_text = wx.TextCtrl(panel, style=wx.TE_MULTILINE)
        self.form_text.SetMinSize((-1, 100))
        optional_sizer.Add(wx.StaticText(panel, label="Company"), 0, wx.ALIGN_CENTER_VERTICAL)
        optional_sizer.Add(self.company_text, 1, wx.EXPAND)
        optional_sizer.Add(wx.StaticText(panel, label="Role"), 0, wx.ALIGN_CENTER_VERTICAL)
        optional_sizer.Add(self.role_text, 1, wx.EXPAND)
        optional_sizer.Add(wx.StaticText(panel, label="Application form"), 0, wx.ALIGN_TOP)
        optional_sizer.Add(self.form_text, 1, wx.EXPAND)
        root.Add(optional, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        self.status = wx.StaticText(self, label="")
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        actions = wx.BoxSizer(wx.HORIZONTAL)
        actions.AddStretchSpacer(1)
        cancel = wx.Button(self, wx.ID_CANCEL, "Cancel")
        create = wx.Button(self, wx.ID_OK, "Add offer")
        create.SetDefault()
        actions.Add(cancel, 0, wx.RIGHT, 8)
        actions.Add(create, 0)
        root.Add(actions, 0, wx.ALL | wx.EXPAND, 14)
        create.Bind(wx.EVT_BUTTON, self._on_create)

    def _on_create(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.service.create_from_offer(
                self.offer_text.GetValue(),
                company=self.company_text.GetValue(),
                role=self.role_text.GetValue(),
                raw_application_form=self.form_text.GetValue(),
            )
        except (ValueError, OSError) as exc:
            self.status.SetLabel(str(exc))
            return
        self.on_created(result)
        self.EndModal(wx.ID_OK)
