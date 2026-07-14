from __future__ import annotations

from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.db import connect
from aaaat.tasks import list_tasks

from .candidature_right_panel import CandidatureOptionsPanel


class ReleaseCandidatureOptionsPanel(CandidatureOptionsPanel):
    """Existing context rail plus compact, human-readable task visibility."""

    def __init__(self, *args: Any, storage_path: str | Path, **kwargs: Any) -> None:
        self.storage_path = str(storage_path)
        super().__init__(*args, **kwargs)

    def render(self, projection: dict[str, Any], *, can_edit: bool, view_name: str) -> None:
        super().render(projection, can_edit=can_edit, view_name=view_name)
        ref = str((projection.get("view_state") or {}).get("selected_candidature_ref") or "")
        tasks: list[dict[str, Any]] = []
        if ref:
            with connect(self.storage_path) as conn:
                tasks = list_tasks(conn, application_id=ref)
        if tasks:
            self._add_task_context(tasks)
            self.Layout()
            self.FitInside()

    def _add_task_context(self, tasks: list[dict[str, Any]]) -> None:
        state_order = {"in_progress": 0, "claimed": 1, "queued": 2, "blocked": 3, "failed": 4, "completed": 5, "cancelled": 6}
        ordered = sorted(tasks, key=lambda item: (state_order.get(str(item.get("state") or ""), 9), str(item.get("created_at") or "")))
        module = wx.CollapsiblePane(self, label=f"Preparation tasks · {len(ordered)}")
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)
        for item in ordered[:8]:
            state = str(item.get("state") or "waiting").replace("_", " ")
            title = str(item.get("title") or item.get("task_type") or "Preparation")
            row = wx.StaticText(pane, label=f"{state.upper()}  {title}")
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
