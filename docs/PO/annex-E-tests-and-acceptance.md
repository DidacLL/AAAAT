# Annex E — Tests and Acceptance

Tests verify behavior. They are not the security mechanism.

## Add tests

Suggested files:

```text
tests/test_agent_access.py
tests/test_agent_capability_contract.py
tests/test_agent_actions.py
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
- Docs distinguish AAAAT-originated task work from LLM-app-originated bounded actions.
- Docs state that LLM apps first request purpose-scoped context, then submit one bounded action.
- Docs state that AAAAT renders generated artifacts locally from templates/data.
- Docs state that the LLM supplies render data, not final artifact files.
- Docs state that the agent is not the user and should not write human notes.
- Tests still forbid broad CRUD, list-all, arbitrary search, profile dumps, variable dumps, and dashboard payload exposure.

### Future action-session capability

Future tests should assert:

- `context-bundle` returns only purpose-scoped profile/career/writing context through existing exposure policy;
- bounded action submission accepts explicit action names only;
- create-candidature action stores already-inferred fields without requiring the LLM to use internal object ids;
- supplied research/form-answer/cover-letter body data is stored directly;
- AAAAT does not create duplicate tasks for work already supplied by the LLM;
- cover-letter body is treated as local render input and AAAAT performs the render;
- responses are narrow acknowledgements.

### CLI

- `aaaat agent next` works.
- `aaaat agent context <task_handle>` works.
- `aaaat agent packet <task_handle>` works.
- `aaaat agent submit <task_handle> --result-body ...` works.
- `aaaat agent submit <task_handle> --result-file ...` works.
- Future `aaaat agent context-bundle --purpose ...` returns purpose-scoped context.
- Future `aaaat agent action submit ...` accepts bounded actions only.

### Regression

- wx desktop launch remains usable.
- local editable candidature flows remain usable.
- render/template/privacy tests still pass.
- MCP descriptor validation still passes.

## Commands to run

```bash
python -B -m unittest tests.test_agent_access
python -B -m unittest tests.test_cli_mcp
python -B -m unittest tests.test_domain_services
python -B -m unittest tests.test_profile_facts
python -B -m unittest tests.test_templates
python -B -m aaaat.cli mcp-validate
python -B -m unittest discover -s tests
```

## Acceptance criteria

- A single `aaaat.agent_access` service layer owns task data shaping.
- Capability-scoped agent commands use narrow service-layer functions.
- Agent task list is envelope-only.
- Agent task context is minimal and task-specific.
- Agent result submission is provenance-preserving and non-destructive.
- Future action-session capabilities are allowed only as schema-bound non-CRUD operations.
- Future action-session capabilities use purpose-scoped context before bounded actions.
- The current wx desktop remains usable.
- No heavy dependency or provider-specific assumption is introduced.
