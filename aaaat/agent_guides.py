from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally and exposes capability-scoped operations to external agents.

The implemented capabilities are the task protocol and schema-bound intake protocol. Agents receive task envelopes and narrow task context, submit task results, create raw-offer intake acknowledgements, and submit structured extraction proposals.

Each implemented capability is schema-bound and returns only narrow acknowledgements, opaque correlation ids, task envelopes, or reviewable result references.

When work starts in the LLM app, use the action-session capability. The LLM app may request a purpose-scoped context bundle and submit one bounded action. AAAAT stores local data and renders artifacts locally from templates; the LLM app supplies render data, not generated files.

Use the capability-scoped task protocol. Agents must not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.

Core commands:
- `aaaat agent tasks --state queued`
- `aaaat agent context <task_id>`
- `aaaat agent submit <task_id> --result-body "..."`
- `aaaat agent submit <task_id> --result-file result.json`
- `aaaat agent claim <task_id>`
- `aaaat agent release <task_id>`
- `aaaat agent context-bundle --purpose cover_letter`
- `aaaat agent action submit --input-body '{"action":"create_candidature","payload":{...}}'`
- `aaaat agent action submit --input-file action.json`
- `aaaat agent intake raw-offer --content "..."`
- `aaaat agent intake raw-offer --file offer.txt`
- `aaaat agent intake submit-extraction <intake_id_or_task_id> --result-file fields.json`

Intake responses return only acknowledgements, opaque correlation ids, created task envelopes, and next allowed actions. Structured extraction accepts a finite JSON schema and stores reviewable output without generic patch access.

Agents reason and draft. AAAAT validates, stores, renders, and separates public demo data from private data.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
