# REST API

Minimal local endpoints:

- `GET /api/health`
- `GET /api/dashboard-payload`
- `GET /api/applications`
- `POST /api/applications`
- `GET /api/applications/{id}/context`
- `POST /api/applications/{id}/raw-intake`
- `POST /api/export/static-demo`

The server binds to `127.0.0.1` by default.

The production shell uses FastAPI behind the stable `aaaat launch` command. The compatibility routes above must preserve the previous JSON/form behavior, including `303` redirects for form submissions and server-side `403` write rejection in read-only mode.

Implementation status:
- M2 FastAPI compatibility shell is the active server path for `aaaat launch`.
- M3 Jinja/htmx dashboard work is scaffolded, but `/` still renders through the legacy dashboard renderer until the Jinja view reaches parity.
- FastAPI mounts `/static` for vendored browser assets, including the real pinned htmx build at `/static/htmx.min.js`.
