from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally. It has two separate runtimes:

- Dashboard runtime: local human UI, server-rendered HTML, static assets, fragments, and form actions. It is not the agent contract and may expose private internal IDs in local HTML.
- Agent runtime: machine-facing capability adapter. It exposes only bounded task, context, and action operations.

Agents must not use dashboard HTML, dashboard fragments, htmx endpoints, or `/dashboard/actions/*` as a machine API.

Agent capabilities are limited to:

1. obtain the next pending task and task handle;
2. fetch bounded context for that task handle;
3. submit a JSON result for that task handle;
4. request bounded user/style/career context, including CareerPlan where relevant;
5. create a new candidature from user conversation or source material;
6. request bounded future tasks for deferred work;
7. perform LLM-owned reasoning using bounded context.

A task handle is valid only for task context and task result submission. It is not authority to mutate arbitrary local state. AAAAT applies task results to internal records.

The LLM must not receive application IDs, candidature IDs, profile fact IDs, artifact IDs, note IDs, todo IDs, blob IDs, storage paths, or task-related internal IDs as entity mutation authority.

Intended agent commands:

- `aaaat agent next`
- `aaaat agent context <task_handle>`
- `aaaat agent submit <task_handle> --result-file result.json`
- `aaaat agent context-bundle --purpose cover_letter`
- `aaaat agent action submit --input-file action.json`

The action-session protocol is not CRUD. An agent requests a purpose-scoped context bundle such as `cv_generation`, `cover_letter`, `candidature_fit`, `market_research`, `recruiter_call`, `form_answers`, or `career_plan_review`, then submits one bounded action such as `create_candidature`.

LLM-originated `create_candidature` work starts in the LLM app. In that flow the LLM may already have read the offer, interpreted the user conversation, inferred fields, drafted form answers, drafted cover-letter body text, or completed research before calling AAAAT. AAAAT should not create extraction tasks for work already supplied by the LLM.

AAAAT should not treat the agent as the user, should not ask the agent to write human notes, should not accept final artifact files from the agent, and should not return internal identifiers in acknowledgements. AAAAT renders local templates for cover letters and CVs from stored data.

Agents must not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
