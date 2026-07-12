from __future__ import annotations

import json
import sqlite3
from typing import Iterable

from .db import profile_variables, set_profile_variable

DEFAULT_GENERATION_TASKS = (
    "field_inference",
    "company_research",
    "draft_cv",
    "draft_cover_letter",
)
SUPPORTED_GENERATION_TASKS = DEFAULT_GENERATION_TASKS
PROFILE_KEY = "agent.default_generation_tasks"


def default_generation_tasks(conn: sqlite3.Connection) -> list[str]:
    raw = str(profile_variables(conn).get(PROFILE_KEY) or "").strip()
    if not raw:
        return list(DEFAULT_GENERATION_TASKS)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = [item.strip() for item in raw.split(",") if item.strip()]
    if not isinstance(parsed, list):
        return list(DEFAULT_GENERATION_TASKS)
    result: list[str] = []
    for item in parsed:
        task_type = str(item)
        if task_type in SUPPORTED_GENERATION_TASKS and task_type not in result:
            result.append(task_type)
    return result


def save_default_generation_tasks(conn: sqlite3.Connection, task_types: Iterable[str]) -> list[str]:
    selected: list[str] = []
    for item in task_types:
        task_type = str(item)
        if task_type not in SUPPORTED_GENERATION_TASKS:
            raise ValueError(f"Unsupported automatic generation task: {task_type}")
        if task_type not in selected:
            selected.append(task_type)
    set_profile_variable(conn, PROFILE_KEY, json.dumps(selected))
    return selected
