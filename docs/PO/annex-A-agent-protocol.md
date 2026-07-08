# Annex A — Agent Capability Protocol Contract

## Canonical rule

The agent contract is capability-scoped, not generic CRUD.

The implemented capability is task work. The next valid capability is an action-session protocol for LLM-app-originated work.

Agents must not receive broad database browsing, dashboard payloads, arbitrary search, raw variable dumps, raw profile fact lists, generic object retrieval, or generic patch/update routes.

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

Task ids are part of the task protocol only. Do not generalize task ids into permission for generic object access.

## Planned action-session capability

LLM-app-originated work has a different direction from AAAAT-originated task work.

When work starts in the LLM app, the LLM already has the user conversation and raw offer context. It may ask AAAAT for the user's purpose-scoped writing/career context, then submit one bounded action. AAAAT stores data and renders locally; it does not create extraction tasks for work already completed by the LLM.

Planned operations:

```text
get_agent_context_bundle(purpose) -> dict
submit_agent_action(action, payload, *, agent_name='', agent_runtime='', model_provider='') -> dict
```

Context bundle behavior:

- map `purpose` to the existing `profile_context` purposes;
- return only purpose-scoped context under the existing exposure policy;
- do not return application/candidature collections.

Bounded action behavior:

- actions are selected from an explicit allowlist;
- examples include creating a candidature from already-inferred fields, storing company research/preparation fields, storing form answers, storing cover-letter body text as render input, requesting local rendering, or submitting an existing task result;
- responses are narrow acknowledgements and human-facing next steps;
- the contract should not depend on internal AAAAT object identifiers.

## Artifact boundary

Agents do not create final artifact files for AAAAT.

AAAAT owns local rendering:

```text
stored profile/application/render data -> local template -> TeX -> optional PDF -> generated artifact record
```

Agents may provide the data that fills templates, such as cover-letter body text. AAAAT renders and records the generated artifact locally.

## Result submission

Agent result submission must:

- create or update a task result/text blob with provenance;
- preserve `agent_name`, `agent_runtime`, and `model_provider` when provided;
- not directly overwrite candidature/application/profile fields;
- not mark generated artifacts as submitted;
- leave deterministic apply/review to AAAAT service logic.

## Apply boundary

`apply_task_result` remains the deterministic mutation boundary for AAAAT-originated tasks. Agent adapters call capability operations and submit/complete operations, not arbitrary update/patch routes.
