# AAAAT Next Multi-Agent Run — Orchestrator Seed Prompt

You are the orchestrator for the next AAAAT development run.

Repository: `DidacLL/AAAAT`
Branch: `codex/aaaatmigrationII`
Latest known head to verify before coding: `adddb351cb71817c556aad9b724a66806fa17b94` (`Privacy Milestone`).

## Objective
Make AAAAT production-ready-asap by implementing a transport-agnostic, task-scoped agent protocol without rewriting the dashboard UI.

The current dashboard remains the human local UI. Do not replace it. Do not add a native app, Electron/Tauri, frontend framework, auth framework, cloud dependency, provider SDK, ORM, Alembic, Celery, Redis, or database server.

## Core decision
The canonical agent boundary is not HTTP, CLI, MCP, or docs. It is the AAAAT task protocol:

1. list task envelopes;
2. get one task's minimal context;
3. submit one task result;
4. optionally claim/release a task;
5. AAAAT stores provenance and applies/reviews deterministically.

Expose the same task protocol through thin adapters:

- CLI: primary/default for coding agents and local shells;
- HTTP: task-only adapter for agents that can call local URLs;
- MCP/OpenAPI/Markdown: descriptors/guides for the same task-only operations.

## Main implementation work
1. Add `aaaat/agent_access.py` as the single service layer for agent access.
2. Add CLI commands: `aaaat agent tasks`, `aaaat agent context <task_id>`, `aaaat agent submit <task_id>`, plus claim/release if small.
3. Add/complete task-only HTTP endpoints under `/api/agent/*` using `agent_access.py`.
4. Refactor current FastAPI route registration only enough to support an agent-only app/surface where dashboard/private CRUD routes are not mounted.
5. Update docs and MCP descriptor so agent-facing contracts no longer advertise broad application/candidature/dashboard/search/profile/variable CRUD.
6. Add focused tests for the agent protocol, data minimization, route absence in agent mode, and existing dashboard regression.

## Non-goals
Do not rewrite the dashboard. Do not remove the current human local dashboard routes in this run. Do not implement complex authentication. Do not build a real MCP server. Do not redesign storage. Do not rename database tables destructively. Do not broaden dependencies.

## Required split for sub-agents
- Agent A: implement `agent_access.py` and task-context minimization.
- Agent B: add CLI `agent` commands backed by `agent_access.py`.
- Agent C: add task-only HTTP surface/app mode backed by `agent_access.py`.
- Agent D: update docs/MCP/OpenAPI to expose only task protocol for agents.
- Agent E: add regression and privacy tests; keep dashboard/static/read-only/render tests passing.

Read the annex files before coding:

- `annex-A-agent-protocol.md`
- `annex-B-http-and-cli-surface.md`
- `annex-C-context-minimization.md`
- `annex-D-docs-and-mcp-contract.md`
- `annex-E-tests-and-acceptance.md`
- `annex-F-non-goals-and-risk-limits.md`

Acceptance summary:
AAAAT keeps the dashboard usable, but agents get a task-scoped protocol through CLI and task-only HTTP. No agent-facing surface returns all candidatures, dashboard payload, arbitrary search, raw profile facts, raw variables, or generic object CRUD. All agent outputs land as reviewable/provenance-preserving task results; deterministic apply/review remains owned by AAAAT.
