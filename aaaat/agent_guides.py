from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job-application data locally. In v1, the only human runtime is the wx desktop application.

AAAAT is not an LLM provider wrapper, provider SDK, browser API, or agent orchestrator. External agents interact through bounded local task packets, descriptor-only MCP metadata, and CLI commands. HTTP/browser serving is removed from v1.

Agent capabilities:

1. get the next pending task and opaque task handle;
2. fetch bounded task context by task handle;
3. submit one JSON result for that task handle;
4. request a bounded context bundle;
5. submit one bounded action packet.

A task handle is valid only for task context and result submission. It is an opaque callback handle, not AAAAT's local task row identifier. AAAAT owns applying results to internal records. Agents must not receive application IDs, candidature IDs, profile fact IDs, career plan IDs, artifact IDs, note IDs, todo IDs, blob IDs, task row IDs, file paths, or storage paths as mutation authority.

Each agent task context/packet is self-contained for supported AAAAT task types. It includes `task_handle`, `task_type`, `title`, `instructions`, `purpose`, `input_context`, `output_contract`, `response_format`, `allowed_actions`, and `privacy_notes`. The agent should return JSON matching the response format and should not include internal entity IDs.

Supported local task types are `field_inference`, `company_research`, `keyword_definition`, `draft_form_responses`, `draft_cv`, `draft_cover_letter`, and `career_plan_review`.

Generated values become current when AAAAT can apply them safely. If a result is stale against existing user/current content, AAAAT keeps the result as non-current history instead of using a Use/Discard review queue.

Agent-scoped profile facts use non-ID fact references such as `fact_ref: skill.python` and placeholders such as `{{ profile_fact.skill.python }}`. Do not treat those labels as profile CRUD handles.

Career plans are local first-class records exposed to agents only through bounded context bundles. Agent bundles use `plan_ref` labels and never career-plan row IDs.

The action-session protocol is not CRUD. An agent first requests a purpose-scoped context bundle such as `cv_generation`, `cover_letter`, `candidature_fit`, `recruiter_call`, `form_answers`, or `career_plan_review`, then submits one bounded action such as `create_candidature` from already-inferred fields, cover-letter body text, render inputs, or bounded future-task requests.

`create_candidature.payload` supports only `source_material`, `candidature`, `outputs`, `render`, and optional `requested_tasks`. `requested_tasks` lets the LLM ask AAAAT to queue bounded follow-up work after creating the candidature. AAAAT binds tasks internally and returns only `queued.count`; it must not return task IDs, application IDs, candidature IDs, artifact IDs, blob IDs, file paths, storage paths, or database row IDs in the acknowledgement.

LLM-originated work starts in the LLM app. AAAAT should not create extraction or duplicate drafting tasks for work already supplied by the LLM. AAAAT should not treat the agent as the user, should not ask the agent to write human notes, and should not accept final artifact files from the agent. AAAAT renders local templates for cover letters and CVs from stored data.

Descriptor-only MCP compatibility is available through:

- `python -m aaaat.cli mcp-descriptor`
- `python -m aaaat.cli mcp-validate`

Local agent/task CLI examples:

- `python -m aaaat.cli agent next`
- `python -m aaaat.cli agent context <task_handle>`
- `python -m aaaat.cli agent packet <task_handle>`
- `python -m aaaat.cli agent submit <task_handle> --result-file result.json`

Agents must not browse, list, search, or patch the user's candidature database. Do not copy private data into public demo files, templates, or docs.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
