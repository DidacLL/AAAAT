# REST API

Minimal local endpoints:

- `GET /api/health`
- `GET /api/dashboard-payload`
- `GET /api/applications`
- `POST /api/applications`
- `GET /api/applications/{id}/context`
- `POST /api/applications/{id}/raw-intake`
- `POST /api/export/static-demo`

M3 product endpoints:

- `GET /api/candidatures`
- `POST /api/candidatures`
- `GET /api/candidatures/{id}`
- `PATCH /api/candidatures/{id}`
- `GET /api/candidatures/{id}/context`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/{id}`
- `PATCH /api/tasks/{id}`
- `POST /api/tasks/{id}/complete`
- `POST /api/tasks/{id}/apply`
- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/{id}`
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/text-blobs`
- `POST /api/text-blobs`
- `PATCH /api/text-blobs/{id}`
- `GET /api/keywords`
- `POST /api/keywords`
- `POST /api/keywords/{term}/aliases`
- `POST /api/keywords/{term}/notes`
- `GET /api/variables`
- `GET /api/variables/{key}`
- `PUT /api/variables/{key}`
- `GET /api/search?q=...`
- `GET /api/agent/tasks`
- `GET /api/agent/tasks/{id}/context`

The server binds to `127.0.0.1` by default.

The production shell uses FastAPI behind the stable `aaaat launch` command. The compatibility routes above must preserve the previous JSON/form behavior, including `303` redirects for form submissions and server-side `403` write rejection in read-only mode.

Implementation status:
- M2 FastAPI compatibility shell is the active server path for `aaaat launch`.
- M3 Jinja/htmx dashboard is the default `/` renderer.
- Legacy rollback remains available through `GET /legacy` or `GET /?renderer=legacy`.
- FastAPI mounts `/static` for vendored browser assets, including the real pinned htmx build at `/static/htmx.min.js`.
- Agent task contexts resolve variables with the agent privacy scope. Suggestions must be written back through task completion or text blobs, not by directly overwriting approved candidature fields.
