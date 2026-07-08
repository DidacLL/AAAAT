# Agent Guide

AAAAT has two separate runtimes. They are not two CRUD APIs, and the dashboard is not an agent API.

## Dashboard runtime

The dashboard runtime is the local human UI. It serves server-rendered HTML, static dashboard assets, fragments, and local form actions. It may expose private application, candidature, profile-fact, artifact, note, todo, or task identifiers inside HTML or form action URLs because it is a human-local interface.

Dashboard routes are outside the agent contract. Agents must not treat dashboard HTML, dashboard fragments, htmx endpoints, or `/dashboard/actions/*` form handlers as supported machine interfaces.

## Agent runtime

The agent runtime is a machine-facing capability adapter. It exposes only bounded operations. It must not serve dashboard HTML, dashboard static assets, dashboard fragments, dashboard actions, broad entity lists, broad search, profile dumps, candidature CRUD, application CRUD, note/todo/blob CRUD, artifact CRUD, or identifier-based mutation endpoints.

The supported agent contract is capability-scoped:

1. obtain the next pending task and its task handle;
2. fetch bounded context for that task handle;
3. submit one JSON result for that task handle;
4. obtain bounded user, style, career, and writing context, including CareerPlan where relevant;
5. create a new candidature from user conversation or source material;
6. request bounded future tasks when work is deferred;
7. perform LLM-owned reasoning using bounded context.

A task handle is allowed only as an agent-session handle for fetching bounded task context and submitting that task result. It is not authority to mutate arbitrary local state. AAAAT owns mapping task results back to local records.

The LLM must not receive `application_id`, `candidature_id`, `profile_fact_id`, `artifact_id`, note IDs, todo IDs, blob IDs, storage paths, or task-related internal IDs as authority to mutate arbitrary state. Action acknowledgements should be narrow status packets and human-facing next-action hints, not object handles.

## AAAAT-originated work

When work starts inside AAAAT, AAAAT creates or selects a pending task. The agent obtains one pending task, receives bounded task context, completes reasoning externally, and submits a JSON result. AAAAT stores provenance and applies results only through deterministic local ownership and review/apply flows.

The intended task HTTP shape is:

```text
GET  /api/agent/tasks/next
GET  /api/agent/tasks/{task_handle}/context
POST /api/agent/tasks/{task_handle}/result
```

Generated adapters and tests should use task-handle terminology. Legacy route names or generated guardrails that imply broad task enumeration or entity-ID mutation authority should be updated when they conflict with this architecture.

## LLM-app-originated work

When work starts in the LLM app, the LLM may already have raw offer text, form copy, user conversation, inferred candidature fields, draft form answers, cover-letter body text, or completed research. The LLM first asks AAAAT for a purpose-scoped context bundle, then submits one bounded action packet.

Supported context purposes should map to bounded local data such as `cv_generation`, `cover_letter`, `candidature_fit`, `market_research`, `recruiter_call`, `form_answers`, and `career_plan_review`. Context bundles must include only purpose-relevant profile facts, writing/style/career preferences, and CareerPlan where relevant.

The first bounded action is `create_candidature`. It may create a new candidature from source material and already-derived outputs, request local rendering, and request bounded future tasks for work not completed during the conversation. It does not edit an existing candidature and does not return internal object identifiers.

## Artifact boundary

Agents do not create final artifact files for AAAAT. AAAAT renders artifacts locally from templates and stored data.

For cover letters, the LLM may supply the body text that fills the local `artifact.cover_letter.body` template variable. AAAAT renders the `.tex` file and optional PDF locally, then stores the generated artifact record.

For CVs, the LLM should supply or improve bounded data used by the CV template, not submit a generated CV file.

## Human/user boundary

The agent is not the user. Agent-supplied text should land in explicit candidature fields, task results, form answers, research/preparation fields, render inputs, or bounded future-task requests. Human notes remain a dashboard-local user concept unless a future bounded action explicitly defines agent-authored machine notes separately.

Docs do not enforce security by themselves. Runtime separation, route absence, narrow service functions, and capability-scoped adapters reduce accidental over-exposure. If an agent has direct `.private/`, shell, code modification, or arbitrary localhost access while the dashboard runtime is running, AAAAT cannot fully constrain it.
