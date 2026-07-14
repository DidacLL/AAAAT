# AAAAT Next Multi-Agent Run — Orchestrator Seed Prompt

You are the orchestrator for the next AAAAT development run.

Repository: `DidacLL/AAAAT`
Branch: continue from the current v1 release rebuild branch unless the maintainer instructs otherwise.

## Objective

Make AAAAT production-ready-asap by keeping the capability-scoped agent protocol precise without rewriting the wx desktop UI.

The wx desktop remains the human local UI. Do not replace it. Do not add Electron/Tauri, a frontend framework, auth framework, cloud dependency, provider SDK, ORM, Alembic, Celery, Redis, or database server.

## Core decision

The canonical agent boundary is AAAAT's capability-scoped agent protocol, exposed through thin local adapters.

The implemented capability is task work:

1. list task envelopes;
2. get one task's minimal context;
3. build/dispatch one task packet;
4. submit one task result;
5. AAAAT stores provenance and applies/reviews deterministically.

The next valid capability is an action-session protocol for LLM-app-originated work.

## Actor split

AAAAT-originated work:

```text
AAAAT creates task -> AAAAT builds packet -> LLM returns task result -> AAAAT stores/applies locally
```

LLM-app-originated work:

```text
LLM app reads offer/conversation -> LLM requests purpose context from AAAAT -> LLM submits one bounded action -> AAAAT stores/renders locally
```

The LLM is the intelligent layer when the work starts in the LLM app. AAAAT does not create extraction tasks for work already completed by the LLM. AAAAT validates shape, stores local data, and renders local templates.

The LLM is not the user. It should not write human notes. It should not submit final artifact files. For cover letters and CVs, the LLM supplies data/render inputs; AAAAT renders local TeX/PDF artifacts from templates and stored data.

## Future action-session capability

Planned operations:

```text
get_agent_context_bundle(purpose) -> dict
submit_agent_action(action, payload, *, agent_name='', agent_runtime='', model_provider='') -> dict
```

Examples:

```bash
python -m aaaat.cli agent context-bundle --purpose cover_letter
python -m aaaat.cli agent action submit --input-file action.json
```

Allowed action examples:

- create candidature from already-inferred fields;
- store company research/preparation fields already written by the LLM;
- store form answers already written by the LLM;
- store cover-letter body text as local render input;
- request local rendering from AAAAT templates;
- submit an existing AAAAT task result.

Action responses should be narrow acknowledgements and human-facing next signals. The LLM contract should not depend on internal AAAAT object identifiers.

## Thin adapters

Expose capabilities through thin adapters:

- CLI: primary/default for coding agents and local shells;
- descriptor/Markdown guide: compatibility documentation for the same capability operations.

## Main implementation work for the next feature run

1. Keep `aaaat/agent_access.py` as the single service layer for task access.
2. Keep `aaaat/agent_actions.py` as a small service for purpose context bundles and bounded actions.
3. Harden CLI commands: `aaaat agent context-bundle --purpose ...` and `aaaat agent action submit ...`.
4. Ensure responses are narrow acknowledgements and do not require internal object ids in the LLM contract.
5. Store cover-letter body as render input, not as a generated artifact file.
6. Use existing local rendering to produce artifacts from templates/data.
7. Add focused tests for context bundles, bounded actions, no duplicate tasks for completed work, local rendering, and wx/dispatch regressions.

## Non-goals

Do not rewrite the desktop. Do not implement complex authentication. Do not build a real MCP server. Do not redesign storage. Do not rename database tables destructively. Do not broaden dependencies.

Do not implement generic create/update/list/show/search. Do not ask the LLM to provide generated artifact files.

## Required split for sub-agents

- Agent A: harden `agent_actions` service layer and action schema validation.
- Agent B: harden CLI `agent context-bundle` and `agent action submit` commands.
- Agent C: update docs/MCP/Markdown to expose capability-scoped action-session operations.
- Agent D: add regression and privacy tests; keep wx desktop/render/dispatch tests passing.

Read the annex files before coding:

- `annex-A-agent-protocol.md`
- `annex-B-http-and-cli-surface.md`
- `annex-C-context-minimization.md`
- `annex-D-docs-and-mcp-contract.md`
- `annex-E-tests-and-acceptance.md`
- `annex-F-non-goals-and-risk-limits.md`

Acceptance summary:

AAAAT keeps the wx desktop usable, agents get capability-scoped operations through CLI and descriptors, and LLM-app-originated work uses purpose-scoped context plus bounded actions. No agent-facing surface returns all candidatures, dashboard payload, arbitrary search, raw profile facts, raw variables, generic object CRUD, or final artifact file ingestion. All generated artifacts remain local AAAAT template renders.
