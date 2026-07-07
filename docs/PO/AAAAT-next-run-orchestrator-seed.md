# AAAAT Next Multi-Agent Run — Orchestrator Seed Prompt

You are the orchestrator for the next AAAAT development run.

Repository: `DidacLL/AAAAT`
Branch: `codex/aaaatmigrationII`
Latest known head to verify before coding: PR #11 head after the task-scoped privacy milestone.

## Objective

Make AAAAT production-ready-asap by implementing a capability-scoped agent protocol without rewriting the dashboard UI.

The current dashboard remains the human local UI. Do not replace it. Do not add a native app, Electron/Tauri, frontend framework, auth framework, cloud dependency, provider SDK, ORM, Alembic, Celery, Redis, or database server.

## Core decision

The canonical agent boundary is not HTTP, CLI, MCP, or docs. It is AAAAT's capability-scoped agent protocol.

The implemented capability is task work:

1. list task envelopes;
2. get one task's minimal context;
3. submit one task result;
4. optionally claim/release a task;
5. AAAAT stores provenance and applies/reviews deterministically.

The next valid capability is raw-offer intake plus structured extraction/proposal submission:

1. an agent can submit copied raw offer text without listing existing candidatures;
2. AAAAT creates a placeholder candidature and extraction/enrichment tasks;
3. AAAAT returns only a narrow acknowledgement, opaque correlation id, created task envelopes, and next allowed actions;
4. the agent can submit structured JSON extraction for that intake/task;
5. AAAAT validates the finite schema and stores reviewable output without generic patch access.

Expose capabilities through thin adapters:

- CLI: primary/default for coding agents and local shells;
- HTTP: capability-scoped `/api/agent/*` adapter for agents that can call local URLs;
- MCP/OpenAPI/Markdown: descriptors/guides for the same capability operations.

## Main implementation work

1. Keep `aaaat/agent_access.py` as the single service layer for task access.
2. Add a narrow agent intake service for raw-offer intake and structured extraction/proposal submission.
3. Add CLI commands: `aaaat agent intake raw-offer --content ...`, `aaaat agent intake raw-offer --file ...`, and `aaaat agent intake submit-extraction ...`.
4. Add matching `/api/agent/intake/*` routes if HTTP agent mode is enabled.
5. Ensure responses contain only acknowledgements, opaque correlation ids, task envelopes, and next allowed actions.
6. Update MCP/OpenAPI/docs to say capability-scoped, not generic REST and not task-only.
7. Add focused tests for intake capability, schema validation, conflict preservation, route absence, and existing dashboard regression.

## Non-goals

Do not rewrite the dashboard. Do not remove the current human local dashboard routes. Do not implement complex authentication. Do not build a real MCP server. Do not redesign storage. Do not rename database tables destructively. Do not broaden dependencies.

## Required split for sub-agents

- Agent A: implement the intake/proposal service layer and JSON schema validation.
- Agent B: add CLI `agent intake ...` commands.
- Agent C: add capability-scoped HTTP `/api/agent/intake/*` routes.
- Agent D: update docs/MCP/OpenAPI to expose capability-scoped operations.
- Agent E: add regression and privacy tests; keep dashboard/static/read-only/render tests passing.

Read the annex files before coding:

- `annex-A-agent-protocol.md`
- `annex-B-http-and-cli-surface.md`
- `annex-C-context-minimization.md`
- `annex-D-docs-and-mcp-contract.md`
- `annex-E-tests-and-acceptance.md`
- `annex-F-non-goals-and-risk-limits.md`

Acceptance summary:

AAAAT keeps the dashboard usable, but agents get capability-scoped operations through CLI and optional HTTP. No agent-facing surface returns all candidatures, dashboard payload, arbitrary search, raw profile facts, raw variables, or generic object CRUD. All agent outputs land as reviewable/provenance-preserving results; deterministic apply/review remains owned by AAAAT.
