from __future__ import annotations

from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from .candidature_right_panel import CandidatureOptionsPanel
from .services import DesktopCommandService

MATERIAL_TYPES = [
    ("CV", "cv"),
    ("Cover letter", "cover_letter"),
    ("Application answers", "form_answer"),
    ("Interview notes", "interview_guide"),
    ("Other", "other"),
]
MATERIAL_TYPE_LABELS = {value: label for label, value in MATERIAL_TYPES}
MATERIAL_STATE_LABELS = {"draft": "Draft", "reviewed": "Reviewed", "submitted": "Sent", "archived": "Older version"}


class ReleaseCandidatureOptionsPanel(CandidatureOptionsPanel):
    """Detailed View material inspection, rendering and editing rail."""

    def __init__(self, *args: Any, storage_path: str | Path, **kwargs: Any) -> None:
        self.storage_path = str(storage_path)
        self.command_service = DesktopCommandService(storage_path)
        super().__init__(*args, **kwargs)

    def render(self, projection: dict[str, Any], *, can_edit: bool, view_name: str) -> None:
        super().render(projection, can_edit=can_edit, view_name=view_name)
        if view_name != "detailed":
            return
        ref = str((projection.get("view_state") or {}).get("selected_candidature_ref") or "")
        if not ref:
            return
        self._current_ref = ref
        artifacts = self.command_service.list_candidature_artifacts(ref)
        self._add_material_workflow(artifacts)
        self.Layout()
        self.FitInside()

    def _add_material_workflow(self, artifacts: list[dict[str, Any]]) -> None:
        module = wx.CollapsiblePane(self, label=f"Application material · {len(artifacts)}")
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)

        render_label = wx.StaticText(pane, label="Create local material")
        render_label.SetFont(render_label.GetFont().Bold())
        sizer.Add(render_label, 0, wx.ALL | wx.EXPAND, 6)
        render_actions = wx.WrapSizer(wx.HORIZONTAL)
        render_cv = wx.Button(pane, label="Render tailored CV")
        render_letter = wx.Button(pane, label="Render cover letter")
        render_cv.Enable(self._can_edit)
        render_letter.Enable(self._can_edit)
        render_cv.Bind(wx.EVT_BUTTON, lambda _event: self._render_material("cv"))
        render_letter.Bind(wx.EVT_BUTTON, lambda _event: self._render_material("cover_letter"))
        render_actions.Add(render_cv, 0, wx.RIGHT | wx.BOTTOM, 4)
        render_actions.Add(render_letter, 0, wx.RIGHT | wx.BOTTOM, 4)
        sizer.Add(render_actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)

        attach = wx.Button(pane, label="Attach existing file…")
        attach.Bind(wx.EVT_BUTTON, self._attach_material)
        sizer.Add(attach, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 6)
        if not artifacts:
            empty = wx.StaticText(pane, label="No files attached or prepared yet.")
            empty.Wrap(self._wrap_width())
            sizer.Add(empty, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        for item in artifacts[:8]:
            self._add_material_item(pane, sizer, item)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_inside())
        self.sizer.Add(module, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

    def _add_material_item(self, pane: wx.Window, sizer: wx.BoxSizer, item: dict[str, Any]) -> None:
        artifact_id = str(item.get("id") or "")
        label = str(item.get("label") or item.get("artifact_type") or "Material")
        state = str(item.get("review_state") or "draft")
        material_type = MATERIAL_TYPE_LABELS.get(str(item.get("artifact_type") or ""), "Other material")
        heading = wx.StaticText(pane, label=f"{label} · {MATERIAL_STATE_LABELS.get(state, state)}")
        heading.SetFont(heading.GetFont().Bold())
        heading.Wrap(self._wrap_width())
        sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)

        origin = _material_origin(item)
        details = f"{material_type} · {origin}"
        created = str(item.get("created_at") or "").strip()
        if created:
            details += f" · {created}"
        metadata = wx.StaticText(pane, label=details)
        metadata.Wrap(self._wrap_width())
        sizer.Add(metadata, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)

        notes = str(item.get("notes") or "").strip()
        if notes:
            note = wx.StaticText(pane, label=notes)
            note.Wrap(self._wrap_width())
            sizer.Add(note, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)

        actions = wx.WrapSizer(wx.HORIZONTAL)
        buttons = [
            ("Open", lambda _event, target=artifact_id: self._open_artifact(target)),
            ("Edit details", lambda _event, target=item: self._edit_artifact_details(target)),
            ("Mark reviewed", lambda _event, target=artifact_id: self._set_artifact_state(target, "reviewed")),
            ("Mark sent", lambda _event, target=artifact_id: self._set_artifact_state(target, "submitted")),
            ("Older version", lambda _event, target=artifact_id: self._set_artifact_state(target, "archived")),
        ]
        for label_text, handler in buttons:
            button = wx.Button(pane, label=label_text)
            button.Bind(wx.EVT_BUTTON, handler)
            actions.Add(button, 0, wx.RIGHT | wx.BOTTOM, 4)
        sizer.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 6)

    def _render_material(self, artifact_type: str) -> None:
        try:
            result = self.command_service.render_candidature_artifact(self._current_ref, artifact_type)
        except (KeyError, OSError, ValueError) as exc:
            wx.MessageBox(str(exc), "Material could not be rendered", wx.OK | wx.ICON_WARNING, self)
            return
        path = str(result.get("path") or "")
        self._refresh_panel()
        if path:
            wx.MessageBox(f"Created local material:\n{path}", "Material created", wx.OK | wx.ICON_INFORMATION, self)

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
        self._refresh_panel()

    def _edit_artifact_details(self, item: dict[str, Any]) -> None:
        dialog = MaterialDetailsDialog(self, label=str(item.get("label") or ""), notes=str(item.get("notes") or ""))
        try:
            if dialog.ShowModal() != wx.ID_OK:
                return
            label, notes = dialog.values()
        finally:
            dialog.Destroy()
        self.command_service.update_artifact_details(str(item.get("id") or ""), label=label, notes=notes)
        self._refresh_panel()

    def _open_artifact(self, artifact_id: str) -> None:
        path = self.command_service.artifact_path(artifact_id)
        if not path or not Path(path).exists():
            wx.MessageBox("The local file is missing.", "Material unavailable", wx.OK | wx.ICON_WARNING, self)
            return
        wx.LaunchDefaultApplication(path)

    def _set_artifact_state(self, artifact_id: str, state: str) -> None:
        messages = {"reviewed": "Material marked as reviewed.", "submitted": "Material marked as sent.", "archived": "Material moved to older versions."}
        self.command_service.set_artifact_state(artifact_id, state, messages.get(state, "Material updated."))
        self._refresh_panel()

    def _refresh_panel(self) -> None:
        projection = getattr(self, "_projection", None)
        if isinstance(projection, dict):
            wx.CallAfter(self.render, projection, can_edit=self._can_edit, view_name=self._view_name)


class MaterialDetailsDialog(wx.Dialog):
    def __init__(self, parent: wx.Window, *, label: str, notes: str) -> None:
        super().__init__(parent, title="Material details", size=(520, 360))
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        root.Add(wx.StaticText(self, label="Name"), 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.label_editor = wx.TextCtrl(self, value=label)
        root.Add(self.label_editor, 0, wx.ALL | wx.EXPAND, 12)
        root.Add(wx.StaticText(self, label="Notes and version context"), 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.notes_editor = wx.TextCtrl(self, value=notes, style=wx.TE_MULTILINE)
        self.notes_editor.SetMinSize((-1, 150))
        root.Add(self.notes_editor, 1, wx.ALL | wx.EXPAND, 12)
        buttons = self.CreateSeparatedButtonSizer(wx.OK | wx.CANCEL)
        if buttons:
            root.Add(buttons, 0, wx.ALL | wx.EXPAND, 12)
        self.FindWindowById(wx.ID_OK).SetLabel("Save details")

    def values(self) -> tuple[str, str]:
        return self.label_editor.GetValue().strip(), self.notes_editor.GetValue().strip()


def _material_origin(item: dict[str, Any]) -> str:
    source = str(item.get("source_context") or "")
    if source == "desktop:attached":
        return "Existing local file"
    if item.get("agent_name") or item.get("agent_runtime") or item.get("model_provider"):
        return "Prepared with an integration"
    return "Prepared in AAAAT"
