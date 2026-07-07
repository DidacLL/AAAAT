# Annex A — Agent Protocol Contract

## Canonical operations
The task protocol is the canonical agent contract. Every adapter must implement the same conceptual operations.

Required operations:

```text
list_agent_task_envelopes(conn, *, state=None, limit=None) -> list[dict]
build_agent_task_context(conn, task_id) -> dict
submit_agent_task_result(conn, task_id, result_body, *, result_title='', agent_name='', agent_runtime='', model_provider='', artifact_id=None) -> dict
claim_agent_task(conn, task_id, *, agent_name='', agent_runtime='') -> dict
release_agent_task(conn, task_id) -> dict
```

Suggested module: `aaaat/agent_access.py`.

## Task envelope shape
Task list responses must return envelopes only.

Allowed fields:

```json
{
  "id": "task_...",
  "task_type": "field_inference",
  "title": "Infer missing fields",
  "state": "queued",
  "priority": "normal",
  "context_hint": "field:... or keyword:...",
  "created_at": "...",
  "updated_at": "...",
  "allowed_actions": ["context", "submit", "claim", "release"]
}
```

Do not include full candidature/application objects, notes, raw intake, full company/role collections, profile facts, variables, artifacts, text blobs, dashboard payload, search results, or unrelated candidature data.

If an opaque correlation key is needed, include `application_id`, but do not treat that as permission to include application details in the task list.

## Result submission
Agent result submission must:

- create or update a task result/text blob with provenance;
- preserve `agent_name`, `agent_runtime`, and `model_provider` when provided;
- not directly overwrite candidature/application/profile fields;
- not mark generated artifacts as submitted;
- leave deterministic apply/review to AAAAT service logic.

## Apply boundary
`apply_task_result` remains the deterministic mutation boundary. Agent adapters call submit/complete, not arbitrary update/patch routes.
