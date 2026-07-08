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

LLM-app integration uses an action-session shape under `/api/agent/*`:

- `POST /api/agent/context-bundle`: the agent requests purpose-scoped user/career/writing context using the existing profile exposure model.
- `POST /api/agent/actions`: the agent submits one bounded action packet containing source material and derived outputs.

This action-session surface is not object CRUD. The contract does not require the LLM to know internal AAAAT object identifiers. Responses are narrow acknowledgements and human-facing next-action hints; they do not return internal object identifiers.

Agents do not submit generated cover-letter or CV files. AAAAT renders local artifacts from templates, application/profile data, and explicit render inputs.

Agent-facing HTTP exposes capability routes only. It does not expose database browsing, machine-readable dashboard payloads, arbitrary search, profile/variable dumping, or generic object mutation.

## Dashboard Surface

The normal dashboard renders HTML from local SQLite through Python. It does not expose broad private JSON/data APIs.

Dashboard writes use narrow local action routes under `/dashboard/actions/*`. They are intended for server-rendered forms and htmx fragments, return redirects or HTML fragments, and are not reusable machine-readable object dumps. Examples include raw-offer intake, selected candidature edits, user-authored notes/todos, task queue/apply actions, local document rendering, profile fact edits, and artifact state changes.

Read-only dashboard mode keeps rendering private local data but blocks dashboard actions with `403`.

## Risk Note

Docs are descriptive, not the enforcement mechanism. Route absence and narrow service functions enforce the agent surface. An agent with broader local system access is outside AAAAT's full control.
