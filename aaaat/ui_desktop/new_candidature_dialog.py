from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .intake_automation import IntakeAutomationService


class NewCandidatureDialog(wx.Dialog):
    """Create a candidature from the job offer and run its configured generation bundle."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        service: IntakeAutomationService,
        on_created: Callable[[dict[str, Any]], None],
    ) -> None:
        super().__init__(
            parent,
            title="New application",
            size=(760, 650),
            style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER,
        )
        self.service = service
        self.on_created = on_created
        self.created: dict[str, Any] | None = None

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        title = wx.StaticText(self, label="Paste the job offer")
        title.SetFont(title.GetFont().Bold().Larger().Larger())
        note = wx.StaticText(
            self,
            label=(
                "AAAAT will create the application and prepare the configured research, details and documents. "
                "Company and role are optional; they can be identified from the offer."
            ),
        )
        note.Wrap(700)
        root.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        root.Add(note, 0, wx.ALL | wx.EXPAND, 14)

        optional = wx.BoxSizer(wx.HORIZONTAL)
        self.company_text = wx.TextCtrl(self)
        self.company_text.SetHint("Company, optional")
        self.role_text = wx.TextCtrl(self)
        self.role_text.SetHint("Role, optional")
        optional.Add(self.company_text, 1, wx.RIGHT | wx.EXPAND, 8)
        optional.Add(self.role_text, 1, wx.EXPAND)
        root.Add(optional, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        self.offer_text = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        self.offer_text.SetHint("Paste the complete job offer here")
        root.Add(self.offer_text, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        self.status = wx.StaticText(self, label="")
        self.status.Wrap(700)
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        actions = wx.BoxSizer(wx.HORIZONTAL)
        self.create_button = wx.Button(self, label="Create and prepare")
        self.create_button.SetDefault()
        cancel = wx.Button(self, wx.ID_CANCEL, "Cancel")
        actions.Add(self.create_button, 0, wx.RIGHT, 8)
        actions.Add(cancel, 0)
        root.Add(actions, 0, wx.ALL | wx.ALIGN_RIGHT, 14)

        self.create_button.Bind(wx.EVT_BUTTON, self._on_create)

    def _on_create(self, _event: wx.CommandEvent) -> None:
        self.create_button.Enable(False)
        self.status.SetLabel("Creating the application and preparing its configured content…")
        wx.YieldIfNeeded()
        try:
            result = self.service.create_from_offer(
                self.offer_text.GetValue(),
                company=self.company_text.GetValue(),
                role=self.role_text.GetValue(),
            )
        except (ValueError, KeyError, OSError) as exc:
            self.status.SetLabel(str(exc))
            self.create_button.Enable(True)
            return

        self.created = result
        completed = len(result.get("completed") or [])
        pending = len(result.get("pending") or [])
        failed = len(result.get("failed") or {})
        if result.get("connection_configured"):
            message = f"Application created. Prepared: {completed}. Pending: {pending}. Failed: {failed}."
        else:
            message = (
                "Application created. The configured work is ready to run after connecting your preferred AI."
            )
        self.status.SetLabel(message)
        self.on_created(result)
        self.EndModal(wx.ID_OK)
