# HTTP Runtime Contract

AAAAT has two separate HTTP runtimes:

- Dashboard runtime: a local human UI that serves server-rendered HTML, dashboard static assets, dashboard fragments, and local form actions.
- Agent runtime: a machine-facing capability adapter that exposes only bounded agent operations.

The local server binds to `127.0.0.1` by default.

## Agent runtime

The intended agent HTTP contract is capability-scoped:

```text
GET  /api/health
GET  /api/agent/tasks/next
GET  /api/agent/tasks/{task_handle}/context
POST /api/agent/tasks/{task_handle}/result
POST /api/agent/context-bundle
POST /api/agent/actions
```

`task_handle` is an agent-session handle, not an internal database identifier. It is valid only for bounded task context retrieval and JSON result submission. AAAAT owns applying the result to internal records.

`POST /api/agent/context-bundle` returns bounded user/style/career context for a declared purpose such as `cv_generation`, `cover_letter`, `candidature_fit`, `market_research`, `recruiter_call`, `form_answers`, or `career_plan_review`. The bundle should include only purpose-relevant profile facts, writing/style/career preferences, and CareerPlan where relevant.

`POST /api/agent/actions` accepts one bounded action packet. The first action is `create_candidature`, which creates a new candidature from user conversation/source material and already-derived outputs. The action may request local rendering and bounded future tasks. It does not edit an existing candidature.

A narrow acknowledgement shape is preferred:

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

Agent-facing responses must not return `application_id`, `candidature_id`, `profile_fact_id`, `artifact_id`, note IDs, todo IDs, blob IDs, storage paths, or task-related internal IDs as authority to mutate arbitrary state.

The agent runtime must not expose dashboard HTML, static dashboard assets, dashboard fragments, dashboard actions, dashboard payloads, broad list/search/profile/candidature CRUD, note/todo/blob CRUD, artifact CRUD, or entity-ID mutation endpoints.

## Dashboard runtime

The dashboard runtime renders local private HTML from SQLite through Python. It is for human-local use and may expose private IDs in rendered HTML or form action URLs.

Dashboard writes use local form routes under `/dashboard/actions/*`. They may return redirects or HTML fragments and are not a reusable machine-facing JSON API. Examples include raw-offer intake, selected candidature edits, user-authored notes/todos, task queue/apply actions, local document rendering, profile fact edits, and artifact state changes.

Read-only dashboard mode keeps rendering private local data but blocks dashboard write actions with `403`.

## Compatibility note

Older generated docs, descriptors, or tests may use a conceptual `surface` switch, broad task lists, or task/entity IDs in agent-facing examples. Those are transitional implementation details, not the intended contract. Generated guardrails should be updated when they conflict with the runtime split described here.
