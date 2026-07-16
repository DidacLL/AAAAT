from __future__ import annotations

from pathlib import Path
from typing import Callable

import wx  # type: ignore[import-not-found]


FIRST_RUN_TITLE = "Welcome to AAAAT"
FIRST_RUN_EXPLANATION = (
    "AAAAT keeps your professional profile, opportunities, notes, and documents in a private workspace "
    "on this computer. The workspace stays separate from the AAAAT application and from folders shared "
    "with an AI."
)
FIRST_RUN_RECOMMENDED_LABEL = "Use the recommended private location"
FIRST_RUN_CUSTOM_LABEL = "Choose another private location"


class FirstRunWorkspaceDialog(wx.Dialog):
    def __init__(
        self,
        parent: wx.Window | None,
        *,
        suggested_workspace: Path,
        save_workspace: Callable[[str | Path], Path],
    ) -> None:
        super().__init__(parent, title=FIRST_RUN_TITLE, style=wx.DEFAULT_DIALOG_STYLE)
        self._suggested_workspace = suggested_workspace
        self._save_workspace = save_workspace
        self.selected_workspace: Path | None = None

        root = wx.BoxSizer(wx.VERTICAL)

        heading = wx.StaticText(self, label=FIRST_RUN_TITLE)
        heading.SetFont(heading.GetFont().Bold().Larger())
        root.Add(heading, 0, wx.ALL | wx.EXPAND, 16)

        explanation = wx.StaticText(self, label=FIRST_RUN_EXPLANATION)
        explanation.Wrap(600)
        root.Add(explanation, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 16)

        self.recommended_choice = wx.RadioButton(
            self,
            label=FIRST_RUN_RECOMMENDED_LABEL,
            style=wx.RB_GROUP,
        )
        self.recommended_choice.SetValue(True)
        self.recommended_choice.Bind(wx.EVT_RADIOBUTTON, self._on_choice_changed)
        root.Add(self.recommended_choice, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 16)

        recommended_path = wx.TextCtrl(self, value=str(suggested_workspace), style=wx.TE_READONLY)
        root.Add(recommended_path, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 16)

        self.custom_choice = wx.RadioButton(self, label=FIRST_RUN_CUSTOM_LABEL)
        self.custom_choice.Bind(wx.EVT_RADIOBUTTON, self._on_choice_changed)
        root.Add(self.custom_choice, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 16)

        custom_row = wx.BoxSizer(wx.HORIZONTAL)
        self.custom_path = wx.TextCtrl(self, value="", style=wx.TE_READONLY)
        self.browse_button = wx.Button(self, label="Choose folder…")
        self.browse_button.Bind(wx.EVT_BUTTON, self._choose_folder)
        custom_row.Add(self.custom_path, 1, wx.RIGHT | wx.EXPAND, 8)
        custom_row.Add(self.browse_button, 0)
        root.Add(custom_row, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 16)

        note = wx.StaticText(
            self,
            label=(
                "You can use AAAAT without connecting an AI. Your workspace choice is remembered and "
                "is not removed when the application is updated."
            ),
        )
        note.Wrap(600)
        root.Add(note, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 16)

        buttons = wx.StdDialogButtonSizer()
        cancel = wx.Button(self, wx.ID_CANCEL, "Cancel")
        continue_button = wx.Button(self, wx.ID_OK, "Continue")
        continue_button.SetDefault()
        continue_button.Bind(wx.EVT_BUTTON, self._continue)
        buttons.AddButton(cancel)
        buttons.AddButton(continue_button)
        buttons.Realize()
        root.Add(buttons, 0, wx.ALL | wx.ALIGN_RIGHT, 16)

        self.SetSizerAndFit(root)
        self.SetMinSize((660, self.GetSize().height))
        self._on_choice_changed(None)
        self.CentreOnParent()

    def _on_choice_changed(self, _event: wx.CommandEvent | None) -> None:
        enabled = self.custom_choice.GetValue()
        self.custom_path.Enable(enabled)
        self.browse_button.Enable(enabled)

    def _choose_folder(self, _event: wx.CommandEvent) -> None:
        with wx.DirDialog(
            self,
            "Choose a private workspace folder",
            defaultPath=str(self._suggested_workspace.parent),
            style=wx.DD_DEFAULT_STYLE | wx.DD_NEW_DIR_BUTTON,
        ) as dialog:
            if dialog.ShowModal() != wx.ID_OK:
                return
            self.custom_choice.SetValue(True)
            self.custom_path.SetValue(dialog.GetPath())
            self._on_choice_changed(None)

    def _continue(self, _event: wx.CommandEvent) -> None:
        candidate: str | Path
        if self.recommended_choice.GetValue():
            candidate = self._suggested_workspace
        else:
            candidate = self.custom_path.GetValue().strip()
            if not candidate:
                wx.MessageBox(
                    "Choose a private workspace folder before continuing.",
                    FIRST_RUN_TITLE,
                    wx.OK | wx.ICON_INFORMATION,
                    self,
                )
                return
        try:
            self.selected_workspace = self._save_workspace(candidate)
        except (OSError, ValueError) as exc:
            wx.MessageBox(str(exc), "Choose another location", wx.OK | wx.ICON_WARNING, self)
            return
        self.EndModal(wx.ID_OK)


def select_first_run_workspace(
    parent: wx.Window | None,
    *,
    suggested_workspace: Path,
    save_workspace: Callable[[str | Path], Path],
) -> Path | None:
    with FirstRunWorkspaceDialog(
        parent,
        suggested_workspace=suggested_workspace,
        save_workspace=save_workspace,
    ) as dialog:
        if dialog.ShowModal() != wx.ID_OK:
            return None
        return dialog.selected_workspace
