from __future__ import annotations

from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.db import connect
from aaaat.tasks import list_tasks

from .candidature_right_panel import CandidatureOptionsPanel
from .services import DesktopCommandService

PREPARATION_STATE_LABELS = {
    "queued": "Waiting to start",
    "claimed": "Starting",
    "in_progress": "In preparation",
    "blocked": "Needs information",
    "failed": "Could not complete",
    "completed": "Ready",
    "cancelled": "Stopped",
}
MATERIAL_TYPES = [
    ("CV", "cv"),
    ("Cover letter", "cover_letter"),
    ("Application answers", "form_answer"),
    ("Interview notes", "interview_guide"),
    ("Other", "other"),
]


class ReleaseCandidatureOptionsPanel(CandidatureOptionsPanel):
    """Existing context rail plus compact preparation and material controls."""

    def __init__(self, *args: Any, storage_path: str | Path, **kwargs: Any) -> None:
        self.storage_path = str(storage_path)
        self.command_service = DesktopCommandService(storage_path)
        super().__init__(*args, **kwargs)

    def render(self, projection: dict[str, Any], *, can_edit: bool, view_name: str) -> None:
        super().render(projection, can_edit=can_edit, view_name=view_name)
        ref = str((projection.get("view_state") or {}).get("selected_candidature_ref") or "")
        if not ref:
            return
        self._current_ref = ref
        with connect(self.storage_path) as conn:
            preparation = list_tasks(conn, application_id=ref)
        artifacts = self.command_service.list_candidature_artifacts(ref)
        if preparation:
            self._add_preparation_context(preparation)
        self._add_material_workflow(artifacts)
        self.Layout()
        self.FitInside()

    def _add_preparation_context(self, items: list[dict[str, Any]]) -> None:
        state_order = {"in_progress": 0, "claimed": 1, "queued": 2, "blocked": 3, "failed": 4, "completed": 5, "cancelled": 6}
        ordered = sorted(items, key=lambda item: (state_order.get(str(item.get("state") or ""), 9), str(item.get("created_at") or "")))
        module = wx.CollapsiblePane(self, label=f"Preparation progress · {len(ordered)}")
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        for item in ordered[:8]:
            state = str(item.get("state") or "queued")
            status = PREPARATION_STATE_LABELS.get(state, "Pending")
            title = str(item.get("title") or "Application preparation")
            row = wx.StaticText(pane, label=f"{status} · {title}")
            row.SetFont(row.GetFont().Bold())
            row.Wrap(self._wrap_width())
            sizer.Add(row, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)
            notes = str(item.get("notes") or "").strip()
            if notes:
                detail = wx.StaticText(pane, label=notes)
                detail.Wrap(self._wrap_width())
                sizer.Add(detail, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_inside())
        self.sizer.Add(module, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

    def _add_material_workflow(self, artifacts: list[dict[str, Any]]) -> None:
        module = wx.CollapsiblePane(self, label=f"Application material · {len(artifacts)}")
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        attach = wx.Button(pane, label="Attach existing file…")
        attach.Bind(wx.EVT_BUTTON, self._attach_material)
        sizer.Add(attach, 0, wx.ALL, 6)
        if not artifacts:
            empty = wx.StaticText(pane, label="No files attached or prepared yet.")
            empty.Wrap(self._wrap_width())
            sizer.Add(empty, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        state_labels = {"draft": "Draft", "reviewed": "Reviewed", "submitted": "Sent", "archived": "Older version"}
        for item in artifacts[:8]:
            artifact_id = str(item.get("id") or "")
            label = str(item.get("label") or item.get("artifact_type") or "Material")
            state = str(item.get("review_state") or "draft")
            created = str(item.get("created_at") or "")
            heading = wx.StaticText(pane, label=f"{label} · {state_labels.get(state, state)}")
            heading.SetFont(heading.GetFont().Bold())
            heading.Wrap(self._wrap_width())
            sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)
            if created:
                sizer.Add(wx.StaticText(pane, label=created), 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
            actions = wx.WrapSizer(wx.HORIZONTAL)
            buttons = [
                ("Open", lambda _event, target=artifact_id: self._open_artifact(target)),
                ("Mark reviewed", lambda _event, target=artifact_id: self._set_artifact_state(target, "reviewed")),
                ("Mark sent", lambda _event, target=artifact_id: self._set_artifact_state(target, "submitted")),
                ("Older version", lambda _event, target=artifact_id: self._set_artifact_state(target, "archived")),
            ]
            for label_text, handler in buttons:
                button = wx.Button(pane, label=label_text)
                button.Bind(wx.EVT_BUTTON, handler)
                actions.Add(button, 0, wx.RIGHT | wx.BOTTOM, 4)
            sizer.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_inside())
        self.sizer.Add(module, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

    def _attach_material(self, _event: wx.CommandEvent) -> None:
        file_dialog = wx.FileDialog(self, "Attach existing application material", style=wx.FD_OPEN | wx.FD_FILE_MUST_EXIST)
        try:
            if file_dialog.ShowModal() != wx.ID_OK:
                return
            path = file_dialog.GetPath()
        finally:
            file_dialog.Destroy()
        choices = [label for label, _value in MATERIAL_TYPES]
        type_dialog = wx.SingleChoiceDialog(self, "What kind of material is this?", "Material type", choices)
        try:
            if type_dialog.ShowModal() != wx.ID_OK:
                return
            material_type = MATERIAL_TYPES[type_dialog.GetSelection()][1]
        finally:
            type_dialog.Destroy()
        label_dialog = wx.TextEntryDialog(self, "Name shown in AAAAT", "Material name", Path(path).stem)
        try:
            if label_dialog.ShowModal() != wx.ID_OK:
                return
            label = label_dialog.GetValue().strip()
        finally:
            label_dialog.Destroy()
        attached = self.command_service.attach_existing_material(self._current_ref, path, material_type, label)
        if not attached:
            wx.MessageBox("The file could not be attached.", "Attachment failed", wx.OK | wx.ICON_WARNING, self)
            return
        wx.MessageBox("The existing file is now linked to this candidature.", "Material attached", wx.OK | wx.ICON_INFORMATION, self)

    def _open_artifact(self, artifact_id: str) -> None:
        path = self.command_service.artifact_path(artifact_id)
        if not path or not Path(path).exists():
            wx.MessageBox("The local file is missing.", "Material unavailable", wx.OK | wx.ICON_WARNING, self)
            return
        wx.LaunchDefaultApplication(path)

    def _set_artifact_state(self, artifact_id: str, state: str) -> None:
        messages = {"reviewed": "Material marked as reviewed.", "submitted": "Material marked as sent.", "archived": "Material moved to older versions."}
        self.command_service.set_artifact_state(artifact_id, state, messages.get(state, "Material updated."))
        wx.MessageBox(messages.get(state, "Material updated."), "Material updated", wx.OK | wx.ICON_INFORMATION, self)
