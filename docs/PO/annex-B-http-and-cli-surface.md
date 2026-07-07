# Annex B — HTTP and CLI Surface

## CLI: primary practical adapter

Implemented task capability:

```bash
python -m aaaat.cli agent tasks [--state queued]
python -m aaaat.cli agent context <task_id>
python -m aaaat.cli agent submit <task_id> --result-body "..."
python -m aaaat.cli agent submit <task_id> --result-file result.json
python -m aaaat.cli agent claim <task_id>
python -m aaaat.cli agent release <task_id>
```

Planned intake/proposal capability:

```bash
python -m aaaat.cli agent intake raw-offer --content "..."
python -m aaaat.cli agent intake raw-offer --file offer.txt
python -m aaaat.cli agent intake submit-extraction <intake_id_or_task_id> --result-file fields.json
```

The existing broad CLI commands may remain for human/local use. The `agent` subcommands are the recommended agent contract. They must be capability-scoped, schema-bound, and non-CRUD.

## HTTP: capability-scoped adapter

Implemented task routes:

```text
GET  /api/health
GET  /api/agent/tasks
GET  /api/agent/tasks/{task_id}/context
POST /api/agent/tasks/{task_id}/claim
POST /api/agent/tasks/{task_id}/result
POST /api/agent/tasks/{task_id}/release
```

Planned intake/proposal routes may be added under `/api/agent/*`:

```text
POST /api/agent/intake/raw-offer
POST /api/agent/intake/{intake_id}/extraction
```

All agent routes must call narrow service-layer functions. Do not expose generic object routes.

## Agent-only app/surface

Refactor app construction minimally:

```python
create_app(storage='.private', mode=Mode.FULL, surface='dashboard')
```

Allowed values:

- `surface='dashboard'`: current human dashboard behavior.
- `surface='agent'`: only `/api/health` and capability-scoped `/api/agent/*` routes.

In `surface='agent'`, the following must not be mounted:

```text
/
/legacy
/dashboard/fragments/*
/intake
/static/*
/api/dashboard-payload
/api/review-queue
/api/applications
/api/applications/{id}
/api/applications/{id}/context
/api/candidatures
/api/candidatures/{id}
/api/candidatures/{id}/context
/api/tasks
/api/tasks/{id}
/api/tasks/{id}/complete
/api/tasks/{id}/apply
/api/todos
/api/notes
/api/text-blobs
/api/keywords
/api/search
/api/variables
/api/variables/{key}
/api/profile/facts
/api/profile/context
/api/render/cv
/api/render/cover-letter
/api/artifacts
/api/export/static-demo
```

## CLI launch

Add:

```bash
python -m aaaat.cli launch --agent-api
```

Behavior:

- `launch`: existing dashboard mode.
- `launch --read-only`: existing read-only dashboard mode.
- `launch --agent-api`: HTTP agent surface only.

Do not make a combined dashboard+agent HTTP server the documented default.
