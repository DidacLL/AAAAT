# HTTP Surface

AAAAT has two FastAPI surfaces:

- `surface='dashboard'`: server-rendered local human dashboard.
- `surface='agent'`: capability-scoped HTTP adapter for agents.

The server binds to `127.0.0.1` by default.

## Agent HTTP Contract

`aaaat launch --agent-api` exposes `GET /api/health` and capability-scoped routes under `/api/agent/*`.

Implemented task routes:

- `GET /api/agent/tasks`
- `GET /api/agent/tasks/{task_id}/context`
- `POST /api/agent/tasks/{task_id}/claim`
- `POST /api/agent/tasks/{task_id}/result`
- `POST /api/agent/tasks/{task_id}/release`

Task list responses return sanitized envelopes only. Task contexts are built by `aaaat.agent_access` and contain task-specific data, privacy notes, allowed actions, and task-scoped write-back links.

Future agent intake/proposal routes may be added under `/api/agent/*` when they are schema-bound capabilities. Raw-offer intake may create a placeholder candidature and extraction/enrichment tasks, but responses must be narrow acknowledgements plus opaque correlation ids/task envelopes. Structured extraction must accept finite documented JSON fields and route output through reviewable task results or deterministic apply logic. It must not become generic candidature CRUD.

Agent-facing HTTP does not expose all candidatures, dashboard payloads, review queues, arbitrary search, variables, profile facts, render routes, generic CRUD, notes, artifacts, todos, text blobs, or keyword collections.

## Dashboard Surface

The normal dashboard renders HTML from local SQLite through Python. It does not expose broad private JSON/data APIs.

Dashboard writes use narrow local action routes under `/dashboard/actions/*`. They are intended for server-rendered forms and htmx fragments, return redirects or HTML fragments, and are not reusable machine-readable object dumps. Examples include raw-offer intake, selected candidature edits, note/todo creation, task queue/apply actions, local document rendering, profile fact edits, and artifact state changes.

Read-only dashboard mode keeps rendering private local data but blocks dashboard actions with `403`.

## Risk Note

Docs are descriptive, not the enforcement mechanism. Route absence and narrow service functions enforce the agent surface. An agent with broader local system access is outside AAAAT's full control.
