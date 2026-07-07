# Annex A — Agent Capability Protocol Contract

## Canonical rule

The agent contract is capability-scoped, not generic CRUD.

The implemented capability is task work. Future capabilities may include raw-offer intake and structured extraction/proposal submission, but only if they use explicit input/output schemas and narrow reviewable write paths.

Agents must never receive broad candidature/application lists, dashboard payloads, arbitrary search, raw variable dumps, raw profile fact lists, generic object retrieval, or generic patch/update routes.

## Implemented task capability

Required task operations:

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

## Planned raw-offer intake capability

Agents should be able to start from a copied job offer without first listing existing records.

Planned operations:

```text
agent_intake_raw_offer(content, *, source_url='', agent_name='', agent_runtime='') -> dict
agent_submit_structured_extraction(correlation_id, fields_json, *, agent_name='', agent_runtime='', model_provider='') -> dict
```

Expected behavior:

- raw-offer intake creates a placeholder candidature and extraction/enrichment tasks;
- the response returns only a narrow acknowledgement, an opaque correlation id, and created task envelopes;
- structured extraction accepts only a documented finite JSON schema;
- existing approved/non-empty fields are not overwritten except through deterministic apply rules;
- conflicts are stored as reviewable task results or text blobs;
- no generic candidature CRUD is exposed.

## Result submission

Agent result submission must:

- create or update a task result/text blob with provenance;
- preserve `agent_name`, `agent_runtime`, and `model_provider` when provided;
- not directly overwrite candidature/application/profile fields;
- not mark generated artifacts as submitted;
- leave deterministic apply/review to AAAAT service logic.

## Apply boundary

`apply_task_result` remains the deterministic mutation boundary. Agent adapters call schema-bound capability operations and submit/complete operations, not arbitrary update/patch routes.
