from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally and exposes task-scoped context to external agents.

Use the task protocol. Do not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.

Core commands:
- `aaaat agent tasks --state queued`
- `aaaat agent context <task_id>`
- `aaaat agent submit <task_id> --result-body "..."`
- `aaaat agent submit <task_id> --result-file result.json`
- `aaaat agent claim <task_id>`
- `aaaat agent release <task_id>`

Agents reason and draft. AAAAT validates, stores, renders, and separates public demo data from private data.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
