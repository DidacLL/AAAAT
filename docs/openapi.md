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
- `POST /api/render/cv`
- `POST /api/render/cover-letter`
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
- `GET /api/profile/facts`
- `POST /api/profile/facts`
- `GET /api/profile/facts/{id}`
- `PATCH /api/profile/facts/{id}`
- `POST /api/profile/facts/{id}/archive`
- `GET /api/profile/context?purpose=cv_generation`
- `GET /api/search?q=...`
- `GET /api/agent/tasks`
- `GET /api/agent/tasks/{id}/context`

The server binds to `127.0.0.1` by default.

The production shell uses FastAPI behind the stable `aaaat launch` command. The compatibility routes above must preserve the previous JSON/form behavior, including `303` redirects for form submissions and server-side `403` write rejection in read-only mode.

Render routes are local write routes. They accept JSON or form data with `application_id`, optional `compile_pdf`, optional `save_version`, and optional `output_path` constrained under the local artifact directory. JSON responses use this stable shape:

```json
{
  "artifact": {},
  "artifact_id": "artifact_...",
  "artifact_type": "cv",
  "path": ".private/artifacts/app_.../cv.tex",
  "tex_path": ".private/artifacts/app_.../cv.tex",
  "pdf_path": null,
  "pdf_status": "not_requested",
  "log_path": null
}
```

`pdf_status` is one of `not_requested`, `unavailable`, `success`, `failed`, or `timeout`. Failed or skipped PDF compilation keeps the generated `.tex` artifact.

REST variable/profile context routes are agent-safe only. `GET /api/variables`, `GET /api/variables/{key}`, and `GET /api/profile/context` reject local/dashboard scopes over HTTP; dashboard rendering and document rendering resolve local private values through internal Python calls.

Implementation status:
- M2 FastAPI compatibility shell is the active server path for `aaaat launch`.
- M3 Jinja/htmx dashboard is the default `/` renderer.
- Legacy rollback remains available through `GET /legacy` or `GET /?renderer=legacy`.
- FastAPI mounts `/static` for vendored browser assets, including the real pinned htmx build at `/static/htmx.min.js`.
- Agent task contexts resolve variables with the agent privacy scope. Suggestions must be written back through task completion or text blobs, not by directly overwriting approved candidature fields.
- `variables` are scalar template placeholders; `profile_facts` are structured professional/CV facts with editable visibility, exposure, and usage flags.
- Profile context routes filter facts by purpose. Market research should use anonymized or summarized facts by default.
- Local render routes resolve variables with the local render scope internally, escape scalar TeX values, write `.tex`, optionally compile with `pdflatex` when available and requested, and reuse the current draft artifact unless `save_version=true`.
- Task result apply supports field inference, company research, keyword definitions, form answers, and CV/cover-letter artifact provenance. It fills empty destinations by default, records skipped conflicts, and keeps conflicting/plain text output as reviewable text blobs.
