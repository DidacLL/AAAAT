from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally and has two separate runtimes.

Dashboard runtime:
- local human UI;
- server-rendered HTML, static assets, fragments, and form actions;
- not an agent API.

Agent runtime:
- machine-facing capability adapter;
- no dashboard HTML, static assets, fragments, or dashboard actions;
- no broad list/search/profile/candidature CRUD;
- no entity-ID mutation authority.

The agent runtime exposes only bounded capabilities:

1. get the next pending task and task handle;
2. fetch bounded task context by task handle;
3. submit one JSON result for that task handle;
4. request a bounded context bundle;
5. submit one bounded action packet.

A task handle is valid only for task context and result submission. In the MVP it may equal AAAAT's local task row identifier, but it is accepted only as a task endpoint handle. AAAAT owns applying results to internal records. Agents must not receive application IDs, candidature IDs, profile fact IDs, artifact IDs, note IDs, todo IDs, blob IDs, file paths, or storage paths as mutation authority.

Agent-scoped profile facts use non-ID fact references such as `fact_ref: skill.python` and placeholders such as `{{ profile_fact.skill.python }}`. Do not treat those labels as profile CRUD handles.

The action-session protocol is not CRUD. An agent first requests a purpose-scoped context bundle such as `cv_generation`, `cover_letter`, `candidature_fit`, `recruiter_call`, or `form_answers`, then submits one bounded action such as `create_candidature` from already-inferred fields, cover-letter body text, or render inputs.

LLM-originated work starts in the LLM app. AAAAT should not create extraction tasks for work already supplied by the LLM. AAAAT should not treat the agent as the user, should not ask the agent to write human notes, and should not accept final artifact files from the agent. AAAAT renders local templates for cover letters and CVs from stored data.

Agent HTTP routes:
- `GET /api/agent/tasks/next`
- `GET /api/agent/tasks/{task_handle}/context`
- `POST /api/agent/tasks/{task_handle}/result`
- `POST /api/agent/context-bundle`
- `POST /api/agent/actions`

Agents must not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
