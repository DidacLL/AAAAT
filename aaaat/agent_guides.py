from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally and exposes capability-scoped operations to external agents.

The implemented capability set includes the task protocol and the action-session protocol. For tasks, agents receive task envelopes and narrow task context, then submit task results. For LLM-app-originated action sessions, agents request purpose-scoped context and submit one bounded action packet.

The action-session protocol is not CRUD: an agent first requests a purpose-scoped context bundle such as `cv_generation`, `cover_letter`, `candidature_fit`, `recruiter_call`, or `form_answers`, then submits one bounded action such as creating a candidature from already-inferred fields, storing a cover-letter body as render input, or requesting a local render.

LLM-originated work starts in the LLM app. In that flow the LLM already read the offer and produced the useful data before calling AAAAT. AAAAT should not create extraction tasks for work already supplied by the LLM. AAAAT should not treat the agent as the user, should not ask the agent to write human notes, and should not accept final artifact files from the agent. AAAAT renders local templates for cover letters and CVs from stored data.

Core commands:
- `aaaat agent tasks --state queued`
- `aaaat agent context <task_id>`
- `aaaat agent submit <task_id> --result-body "..."`
- `aaaat agent submit <task_id> --result-file result.json`
- `aaaat agent claim <task_id>`
- `aaaat agent release <task_id>`
- `aaaat agent context-bundle --purpose cover_letter`
- `aaaat agent action submit --input-file action.json`

Agents must not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
