from __future__ import annotations

from typing import Any

DEFAULT_DETAILED_VISIBLE_COLUMNS = ["company", "role", "status", "priority", "next_action", "artifacts_state"]


def available_column_ids(available_columns: list[dict[str, Any]]) -> list[str]:
    return [str(column.get("id")) for column in available_columns if str(column.get("id") or "").strip()]


def normalize_visible_columns(available_columns: list[dict[str, Any]], selected_columns: list[str] | None) -> list[str]:
    available = available_column_ids(available_columns)
    selected = [str(column_id) for column_id in (selected_columns or []) if str(column_id) in available]
    if selected:
        return selected
    defaults = [column_id for column_id in DEFAULT_DETAILED_VISIBLE_COLUMNS if column_id in available]
    return defaults or available[:1]


def column_title(available_columns: list[dict[str, Any]], column_id: str) -> str:
    for column in available_columns:
        if str(column.get("id")) == str(column_id):
            return str(column.get("title") or column_id.replace("_", " ").title())
    return column_id.replace("_", " ").title()
