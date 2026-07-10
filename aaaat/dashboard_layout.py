from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


DEFAULT_SMART_MODULES = ["candidature_list", "selected_candidature_summary", "primary_note", "keyword_context", "artifacts"]
DEFAULT_DETAILED_COLUMNS = ["company", "role", "status", "priority", "next_action", "artifacts_state"]


@dataclass
class DashboardLayoutState:
    """Persisted local desktop layout state.

    This object stores only UI arrangement and selection state. It must not store
    private professional values, raw offer text, notes, profile values, or
    generated artifact bodies.
    """

    selected_view: str = "smart"
    selected_candidature_ref: str | None = None
    selected_keyword: str | None = None
    pane_layout: dict[str, dict[str, int]] = field(
        default_factory=lambda: {
            "smart": {"left": 210, "right": 210},
            "detailed": {"left": 280, "right": 340},
        }
    )
    modules: dict[str, dict[str, Any]] = field(
        default_factory=lambda: {
            "smart": {"visible": list(DEFAULT_SMART_MODULES), "right_context": "primary_note"},
            "detailed": {"visible": ["detailed_toolbox", "detailed_table", "task_queue"]},
            "user": {"visible": ["profile_summary", "career_summary", "template_summary", "settings_summary"]},
            "welcome": {"visible": ["settings_summary"]},
        }
    )
    detailed_columns: dict[str, list[str]] = field(
        default_factory=lambda: {"visible": list(DEFAULT_DETAILED_COLUMNS), "order": list(DEFAULT_DETAILED_COLUMNS)}
    )

    @classmethod
    def default(cls) -> "DashboardLayoutState":
        return cls()

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "DashboardLayoutState":
        if not data:
            return cls.default()
        state = cls.default()
        state.selected_view = str(data.get("selected_view") or state.selected_view)
        state.selected_candidature_ref = _optional_str(data.get("selected_candidature_ref"))
        state.selected_keyword = _optional_str(data.get("selected_keyword"))
        state.pane_layout = _pane_layout(data.get("pane_layout"), state.pane_layout)
        state.modules = _modules(data.get("modules"), state.modules)
        state.detailed_columns = _detailed_columns(data.get("detailed_columns"), state.detailed_columns)
        return state

    @classmethod
    def from_json(cls, content: str) -> "DashboardLayoutState":
        if not content.strip():
            return cls.default()
        data = json.loads(content)
        if not isinstance(data, dict):
            raise ValueError("Dashboard layout JSON must contain an object")
        return cls.from_dict(data)

    @classmethod
    def load(cls, path: str | Path) -> "DashboardLayoutState":
        target = Path(path)
        if not target.exists():
            return cls.default()
        return cls.from_json(target.read_text(encoding="utf-8"))

    def to_dict(self) -> dict[str, Any]:
        return {
            "selected_view": self.selected_view,
            "selected_candidature_ref": self.selected_candidature_ref,
            "selected_keyword": self.selected_keyword,
            "pane_layout": self.pane_layout,
            "modules": self.modules,
            "detailed_columns": self.detailed_columns,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, sort_keys=True)

    def save(self, path: str | Path) -> Path:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.to_json() + "\n", encoding="utf-8")
        return target


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _pane_layout(value: Any, default: dict[str, dict[str, int]]) -> dict[str, dict[str, int]]:
    if not isinstance(value, dict):
        return default
    result: dict[str, dict[str, int]] = {}
    for view, panes in value.items():
        if not isinstance(panes, dict):
            continue
        clean_panes: dict[str, int] = {}
        for region, size in panes.items():
            try:
                number = int(size)
            except (TypeError, ValueError):
                continue
            if number > 0:
                clean_panes[str(region)] = number
        if clean_panes:
            result[str(view)] = clean_panes
    return result or default


def _modules(value: Any, default: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    if not isinstance(value, dict):
        return default
    result: dict[str, dict[str, Any]] = {}
    for view, config in value.items():
        if not isinstance(config, dict):
            continue
        clean_config: dict[str, Any] = {}
        visible = config.get("visible")
        if isinstance(visible, list):
            clean_config["visible"] = [str(item) for item in visible if str(item).strip()]
        right_context = _optional_str(config.get("right_context"))
        if right_context:
            clean_config["right_context"] = right_context
        if clean_config:
            result[str(view)] = clean_config
    return result or default


def _detailed_columns(value: Any, default: dict[str, list[str]]) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return default
    result: dict[str, list[str]] = {}
    for key in ("visible", "order"):
        columns = value.get(key)
        if isinstance(columns, list):
            result[key] = [str(item) for item in columns if str(item).strip()]
    return result or default


def layout_state_path(storage_path: str | Path) -> Path:
    base = Path(storage_path)
    if base.suffix:
        base = base.parent
    return base / "ui_state.json"


def layout_state_contains_private_values(state: DashboardLayoutState) -> bool:
    """Best-effort guard for tests and reviews.

    Layout state should store ids/selection/layout only. These words indicate a
    caller is trying to persist content that belongs in domain storage.
    """

    forbidden_fragments = ("raw_offer", "offer_text", "profile.", "email", "phone", "note_body", "cover_letter", "cv_body")
    encoded = state.to_json().lower()
    return any(fragment in encoded for fragment in forbidden_fragments)
