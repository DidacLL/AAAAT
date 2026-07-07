from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally and exposes capability-scoped operations to external agents.

The implemented capability is the task protocol: agents receive task envelopes and narrow task context, then submit task results. Future capabilities such as raw-offer intake or structured extraction must remain schema-bound and return only narrow acknowledgements, opaque correlation ids, or task envelopes.

Use the capability-scoped task protocol. Agents must not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.

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
