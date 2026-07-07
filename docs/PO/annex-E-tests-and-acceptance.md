# Annex E — Tests and Acceptance

Tests verify behavior. They are not the security mechanism.

## Add tests

Suggested files:

```text
tests/test_agent_access.py
tests/test_agent_capability_contract.py
```

Required tests:

### Agent service

- `list_agent_task_envelopes` returns envelope fields only.
- Envelopes do not include raw intake, notes, profile facts, variables, artifacts, text blobs, dashboard payload, or full candidature data.
- `build_agent_task_context` is task-specific.
- Context does not include unrelated candidatures.
- Field inference context contains only allowed source material and target missing fields.
- Keyword definition context contains keyword/minimal hint only.
- CV/cover-letter contexts use privacy-filtered profile context.
- `submit_agent_task_result` stores provenance and does not directly mutate candidature/profile fields.

### Capability contract

- Agent-facing docs use capability-scoped wording.
- Tests allow future schema-bound raw-offer intake and structured extraction/proposal capabilities under `aaaat agent ...` and `/api/agent/*`.
- Tests still forbid broad CRUD, list-all, arbitrary search, profile dumps, variable dumps, and dashboard payload exposure.
- Future raw-offer intake tests should assert narrow response shape: acknowledgement, opaque correlation id, created task envelopes, and next allowed actions only.
- Future structured extraction tests should assert finite documented JSON fields, conflict preservation, and no direct overwrite outside deterministic apply rules.

### CLI

- `aaaat agent tasks` works.
- `aaaat agent context <id>` works.
- `aaaat agent submit <id> --result-body ...` works.
- `aaaat agent submit <id> --result-file ...` works.
- Future `aaaat agent intake raw-offer ...` works without broad list/show/search behavior.
- Future `aaaat agent intake submit-extraction ...` accepts only the documented schema.

### HTTP agent surface

- `surface='agent'` exposes `/api/agent/tasks`.
- `surface='agent'` exposes `/api/agent/tasks/{id}/context`.
- `surface='agent'` exposes `/api/agent/tasks/{id}/result`.
- Future `surface='agent'` may expose schema-bound `/api/agent/intake/*` routes.
- `surface='agent'` does not expose dashboard/private CRUD/search/profile/render routes listed in Annex B.

### Regression

- existing dashboard tests still pass;
- read-only dashboard still blocks writes;
- static demo remains fake-only and no-write;
- render/template/privacy tests still pass;
- MCP descriptor validation still passes.

## Commands to run

```bash
python -B -m unittest tests.test_agent_access
python -B -m unittest tests.test_agent_capability_contract
python -B -m unittest tests.test_fastapi_server
python -B -m unittest tests.test_domain_services
python -B -m unittest tests.test_profile_facts
python -B -m unittest tests.test_templates
python -B -m unittest tests.test_dashboard_views
python -B -m unittest tests.test_static_export
python -B -m aaaat.cli mcp-validate
python -B -m unittest discover -s tests
```

## Acceptance criteria

- A single `aaaat.agent_access` service layer owns task data shaping.
- Capability-scoped agent commands and HTTP routes use narrow service-layer functions.
- Agent task list is envelope-only.
- Agent task context is minimal and task-specific.
- Agent result submission is provenance-preserving and non-destructive.
- Future agent intake/proposal capabilities are allowed only as schema-bound non-CRUD operations.
- Agent-only HTTP surface does not mount broad private routes.
- Current dashboard remains usable.
- No heavy dependency or provider-specific assumption is introduced.
