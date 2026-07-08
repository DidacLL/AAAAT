# Agent Guide

AAAAT has two separate runtimes. They are not two CRUD APIs, and the dashboard is not an agent API.

## Dashboard runtime

The dashboard runtime is the local human UI. It serves server-rendered HTML, static dashboard assets, fragments, and local form actions. It may expose private internal identifiers inside HTML or form action URLs because it is a human-local interface.

Dashboard routes are outside the agent contract. Agents must not treat dashboard HTML, dashboard fragments, htmx endpoints, or `/dashboard/actions/*` form handlers as supported machine interfaces.

## Agent runtime

The agent runtime is a machine-facing capability adapter. It exposes only bounded operations. It must not serve dashboard HTML, dashboard static assets, dashboard fragments, dashboard actions, generated API docs, OpenAPI JSON, broad entity lists, broad search, profile dumps, candidature CRUD, application CRUD, note/todo/blob CRUD, artifact CRUD, or identifier-based mutation endpoints.

The supported agent HTTP routes are:

```text
GET  /api/health
GET  /api/agent/tasks/next
GET  /api/agent/tasks/{task_handle}/context
POST /api/agent/tasks/{task_handle}/result
POST /api/agent/context-bundle
POST /api/agent/actions
```

A task handle is an opaque agent-session callback handle for fetching bounded task context and submitting that task result. It is not the local task row identifier and is not authority to mutate arbitrary local state. AAAAT owns mapping task results back to local records through internal task binding.

Agent task contexts, packets, and acknowledgements must not expose application IDs, candidature IDs, artifact IDs, profile fact IDs, note IDs, todo IDs, blob IDs, file paths, or storage paths as mutation handles. Agent-scoped profile facts use `fact_ref` labels and placeholders such as `{{ profile_fact.skill.python }}`, not profile-fact row IDs.

Career plans are local first-class records. Agents receive career plan material only through bounded context bundles, under `career_plans`, using non-ID `plan_ref` labels. Agents must not receive career plan row IDs or a career-plan CRUD surface.

## AAAAT-originated work

When work starts inside AAAAT, AAAAT creates or selects a pending task. The agent obtains the next pending task, receives bounded task context, completes reasoning externally, and submits a JSON result. AAAAT stores provenance and applies results only through deterministic local ownership and review/apply flows.

Task contexts are minimized by `aaaat.agent_access`. They include `task_handle`, `task_type`, `title`, `instructions`, `purpose`, `input_context`, `output_contract`, `response_format`, `allowed_actions`, and `privacy_notes`. They do not include dashboard payloads or private database browsing surfaces.

Supported task types include:

- `field_inference`
- `company_research`
- `keyword_definition`
- `draft_form_responses`
- `draft_cv`
- `draft_cover_letter`
- `career_plan_review`

The response format is part of the task context or packet. The agent should submit JSON matching that response format and should not include internal entity IDs. AAAAT applies the result internally using the task binding.

## LLM-app-originated work

When work starts in the LLM app, the LLM may already have raw offer text, form copy, user conversation, inferred candidature fields, draft form answers, cover-letter body text, or completed research. The LLM first asks AAAAT for a purpose-scoped context bundle, then submits one bounded action packet.

Context bundles may include profile facts and career plans for `cover_letter`, `cv_generation`, `candidature_fit`, `market_research`, `recruiter_call`, `form_answers`, and `career_plan_review`. The bundle is a read context, not an edit channel.

The first bounded action is `create_candidature`. It may create a new candidature from source material and already-derived outputs, request local rendering, and optionally request bounded follow-up tasks in `requested_tasks`. It does not edit an existing candidature and does not return internal object identifiers.

`requested_tasks` is allowed only inside a `create_candidature` action payload. Each item is a small object with `task_type`, optional `priority`, optional `reason`, and `keyword` only for `keyword_definition`.

Supported requested task types are `company_research`, `form_answers` or `draft_form_responses`, `cover_letter` or `draft_cover_letter`, `cv` or `draft_cv`, and `keyword_definition` when a keyword is supplied. AAAAT binds created tasks internally to the new candidature and returns only `queued.count`. It skips duplicate follow-up tasks when the corresponding output or render was already supplied, such as `company_research`, `form_answers`, rendered cover letters, or CV positioning/rendering.

Example action fragment:

```json
{
  "requested_tasks": [
    {
      "task_type": "company_research",
      "priority": "low",
      "reason": "Research was not completed during the conversation."
    }
  ]
}
```

## Artifact boundary

Agents do not create final artifact files for AAAAT. AAAAT renders artifacts locally from templates and stored data.

For cover letters, the LLM may supply the body text that fills the local `artifact.cover_letter.body` template variable. AAAAT renders the `.tex` file and optional PDF locally, then stores the generated artifact record.

For CVs, the LLM should supply or improve bounded data used by the CV template, not submit a generated CV file.

## Human/user boundary

The agent is not the user. Agent-supplied text should land in explicit candidature fields, task results, form answers, research/preparation fields, render inputs, or bounded future-task requests. Human notes remain a dashboard-local user concept unless a future bounded action explicitly defines agent-authored machine notes separately.

Docs do not enforce security by themselves. Runtime separation, route absence, narrow service functions, and capability-scoped adapters reduce accidental over-exposure. If an agent has direct `.private/`, shell, code modification, or arbitrary localhost access while the dashboard runtime is running, AAAAT cannot fully constrain it.
