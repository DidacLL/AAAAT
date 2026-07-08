from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally and has two separate runtimes.

Dashboard runtime:
- local human UI;
- server-rendered HTML, static assets, fragments, and form actions;
- not an agent API.

Agent runtime:
- machine-facing capability adapter;
- no dashboard HTML, static assets, fragments, dashboard actions, generated API docs, or OpenAPI JSON;
- no broad list/search/profile/candidature/career-plan CRUD;
- no entity-ID mutation authority.

The agent runtime exposes only bounded capabilities:

1. get the next pending task and task handle;
2. fetch bounded task context by task handle;
3. submit one JSON result for that task handle;
4. request a bounded context bundle;
5. submit one bounded action packet.

A task handle is valid only for task context and result submission. In the MVP it may equal AAAAT's local task row identifier, but it is accepted only as a task endpoint handle. AAAAT owns applying results to internal records. Agents must not receive application IDs, candidature IDs, profile fact IDs, career plan IDs, artifact IDs, note IDs, todo IDs, blob IDs, task row IDs, file paths, or storage paths as mutation authority.

Agent-scoped profile facts use non-ID fact references such as `fact_ref: skill.python` and placeholders such as `{{ profile_fact.skill.python }}`. Do not treat those labels as profile CRUD handles.

Career plans are local first-class records exposed to agents only through bounded context bundles. Agent bundles use `plan_ref` labels and never career-plan row IDs.

The action-session protocol is not CRUD. An agent first requests a purpose-scoped context bundle such as `cv_generation`, `cover_letter`, `candidature_fit`, `recruiter_call`, `form_answers`, or `career_plan_review`, then submits one bounded action such as `create_candidature` from already-inferred fields, cover-letter body text, render inputs, or bounded future-task requests.

`create_candidature.payload` supports only `source_material`, `candidature`, `outputs`, `render`, and optional `requested_tasks`. `requested_tasks` lets the LLM ask AAAAT to queue bounded follow-up work after creating the candidature. Supported task types are `company_research`, `form_answers` or `draft_form_responses`, `cover_letter` or `draft_cover_letter`, `cv` or `draft_cv`, and `keyword_definition` when a keyword is supplied. AAAAT binds tasks internally and returns only `queued.count`; it must not return task IDs, application IDs, candidature IDs, artifact IDs, blob IDs, file paths, storage paths, or database row IDs in the acknowledgement.

LLM-originated work starts in the LLM app. AAAAT should not create extraction or duplicate drafting tasks for work already supplied by the LLM. If `company_research`, `form_answers`, `cover_letter_body` plus cover-letter rendering, `cv_positioning`, or CV rendering is already supplied, skip the matching requested follow-up task. AAAAT should not treat the agent as the user, should not ask the agent to write human notes, and should not accept final artifact files from the agent. AAAAT renders local templates for cover letters and CVs from stored data.

Agent HTTP routes:
- `GET /api/health`
- `GET /api/agent/tasks/next`
- `GET /api/agent/tasks/{task_handle}/context`
- `POST /api/agent/tasks/{task_handle}/result`
- `POST /api/agent/context-bundle`
- `POST /api/agent/actions`

Agents must not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
