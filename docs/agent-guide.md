# Agent Guide

Agents interact with AAAAT through task envelopes, task-specific context, and task result submission. Agents must not browse, list, search, or patch the user's candidature database.

Use the task protocol:

```bash
python -m aaaat.cli agent tasks --state queued
python -m aaaat.cli agent context <task_id>
python -m aaaat.cli agent submit <task_id> --result-file result.json
python -m aaaat.cli agent claim <task_id>
python -m aaaat.cli agent release <task_id>
```

The optional HTTP adapter exposes the same protocol under `/api/agent/*`. `aaaat launch --agent-api` starts a task-only HTTP surface with `/api/health` and `/api/agent/*` routes.

Task contexts are minimized by `aaaat.agent_access`. They include a sanitized task envelope, task-specific context, privacy notes, and task-scoped write-back links. They do not include dashboard payloads, all candidatures, arbitrary search results, raw variable dumps, raw profile fact lists, or unrelated notes/artifacts/text blobs.

Submit results back to the task. AAAAT stores provenance and deterministic apply/review remains owned by AAAAT. Agent output must not directly overwrite approved candidature, application, or profile fields.

The browser dashboard is a local human UI. Its action routes are form/htmx-oriented internals and are not an agent contract.

Docs do not enforce security by themselves. Route absence, narrow service functions, and the task-only adapters reduce accidental over-exposure. If an agent has direct `.private/`, shell, code modification, or arbitrary localhost access while the dashboard server is running, AAAAT cannot fully constrain it.

Aggregate candidature lists are private behavioral data.
