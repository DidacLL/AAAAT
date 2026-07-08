# HTTP Runtime Contract

AAAAT has two separate FastAPI runtimes, not two CRUD APIs and not a dashboard API for agents.

- `create_dashboard_app(storage, mode)`: local human dashboard runtime.
- `create_agent_app(storage, mode)`: machine-facing bounded capability adapter.

`create_app(storage, mode, surface=...)` remains only as a compatibility wrapper around the explicit builders.

The server binds to `127.0.0.1` by default.

## Agent runtime

`aaaat launch --agent-api` starts the agent runtime. It exposes only:

```text
GET  /api/health
GET  /api/agent/tasks/next
GET  /api/agent/tasks/{task_handle}/context
POST /api/agent/tasks/{task_handle}/result
POST /api/agent/context-bundle
POST /api/agent/actions
```

The agent runtime must not mount dashboard HTML, static dashboard assets, dashboard fragments, dashboard actions, generated API docs, OpenAPI JSON, broad CRUD/list/search/profile/candidature APIs, note/todo/blob APIs, artifact APIs, or entity-ID mutation routes.

`task_handle` is a bounded task handle for obtaining context and submitting one JSON result. In the MVP it may equal the local task row identifier, but it is still handle-scoped and accepted only by the task routes above. It is not generic authority over local records. AAAAT owns applying task results to internal records.

`POST /api/agent/context-bundle` returns purpose-scoped user/career/writing context using exposure policy. Agent-scoped profile facts expose `fact_ref` labels and non-ID placeholders, not profile-fact row IDs. Career plans appear only in these bundles under `career_plans`, with `plan_ref` labels and no career-plan row IDs.

Supported context-bundle purposes include `cover_letter`, `cv_generation`, `candidature_fit`, `market_research`, `recruiter_call`, `form_answers`, and `career_plan_review`.

`POST /api/agent/actions` accepts one bounded action packet containing source material and derived outputs. The first action is `create_candidature`.

`create_candidature.payload` supports these sections only: `source_material`, `candidature`, `outputs`, `render`, and optional `requested_tasks`.

`requested_tasks` is a list of small objects. Supported `task_type` values are `company_research`, `form_answers` or `draft_form_responses`, `cover_letter` or `draft_cover_letter`, `cv` or `draft_cv`, and `keyword_definition` with a `keyword`. AAAAT creates and binds accepted tasks internally to the new candidature. It skips follow-up tasks for outputs already supplied in the same action.

Example acknowledgement:

```json
{
  "status": "accepted",
  "action": "create_candidature",
  "created": true,
  "rendered": {"cover_letter": true},
  "queued": {"count": 1},
  "next": ["open_dashboard"]
}
```

Agent-facing task acknowledgements contain only status, task handle/state, and next hints. Agent-facing action acknowledgements must remain narrow. Neither acknowledgement shape may return application, candidature, profile-fact, career-plan, artifact, storage, file-path, note, todo, blob, or task row identifiers as mutation handles.

## Dashboard runtime

The dashboard runtime is the normal local human UI. It serves server-rendered HTML, static dashboard assets, htmx fragments, and local form actions under `/dashboard/actions/*`.

Dashboard HTML and form actions may contain private internal identifiers because this runtime is human-local and outside the agent contract.

Read-only dashboard mode keeps rendering private local data but blocks dashboard actions with `403`.

## Risk note

Docs are descriptive, not the enforcement mechanism. Route absence, explicit runtime builders, narrow service functions, and capability-scoped adapters enforce the agent boundary. An agent with broader filesystem, shell, code-modification, or arbitrary localhost access is outside AAAAT's full control.
