from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally and exposes capability-scoped operations to external agents.

The implemented capability is the task protocol: agents receive task envelopes and narrow task context, then submit task results. Agents reason and draft; AAAAT validates shape, stores local data, renders local templates, and applies results only through deterministic local flows.

The next agent-facing capability should be an action-session protocol, not CRUD: an agent first requests a purpose-scoped context bundle such as `cv_generation`, `cover_letter`, `candidature_fit`, `recruiter_call`, or `form_answers`, then submits one bounded action such as creating a candidature from already-inferred fields, storing a cover-letter body as render input, requesting a local render, or submitting an existing task result.

LLM-originated work starts in the LLM app. In that flow the LLM already read the offer and produced the useful data before calling AAAAT. AAAAT should not create extraction tasks for work already supplied by the LLM. AAAAT should not treat the agent as the user, should not ask the agent to write human notes, and should not accept final artifact files from the agent. Cover letters and CVs are rendered locally from AAAAT templates and stored data.

Core commands:
- `aaaat agent tasks --state queued`
- `aaaat agent context <task_id>`
- `aaaat agent submit <task_id> --result-body "..."`
- `aaaat agent submit <task_id> --result-file result.json`
- `aaaat agent claim <task_id>`
- `aaaat agent release <task_id>`

Future action-session commands should stay capability-scoped, for example:
- `aaaat agent context-bundle --purpose cover_letter`
- `aaaat agent action submit --input-file action.json`

Agents must not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
