# Agent Guide

Agents interact with AAAAT through capability-scoped operations, not generic CRUD. A task is the primary implemented capability, but the contract also allows future narrow capabilities such as raw-offer intake and structured extraction proposals.

Agents must not browse, list, search, or patch the user's candidature database.

## Implemented task capability

```bash
python -m aaaat.cli agent tasks --state queued
python -m aaaat.cli agent context <task_id>
python -m aaaat.cli agent submit <task_id> --result-file result.json
python -m aaaat.cli agent claim <task_id>
python -m aaaat.cli agent release <task_id>
```

The optional HTTP adapter exposes equivalent task operations under `/api/agent/*`. `aaaat launch --agent-api` starts an agent HTTP surface with `/api/health` and capability-scoped `/api/agent/*` routes.

Task contexts are minimized by `aaaat.agent_access`. They include a sanitized task envelope, task-specific context, privacy notes, and task-scoped write-back links. They do not include dashboard payloads, all candidatures, arbitrary search results, raw variable dumps, raw profile fact lists, or unrelated notes/artifacts/text blobs.

Submit results back to the task. AAAAT stores provenance and deterministic apply/review remains owned by AAAAT. Agent output must not directly overwrite approved candidature, application, or profile fields.

## Planned intake/proposal capability

Agent-side raw-offer workflows are valid if implemented as narrow capabilities, not CRUD. The intended shape is:

```bash
python -m aaaat.cli agent intake raw-offer --content "..."
python -m aaaat.cli agent intake raw-offer --file offer.txt
python -m aaaat.cli agent intake submit-extraction <intake_id_or_task_id> --result-file fields.json
```

Expected behavior:

- raw-offer intake creates a placeholder candidature and extraction/enrichment tasks;
- the response returns only a narrow acknowledgement, opaque correlation id, and created task envelopes;
- structured extraction accepts only a documented finite JSON schema;
- existing approved/non-empty fields are not overwritten except through deterministic apply rules;
- conflicts are stored as reviewable task results or text blobs.

The same capability may later be mirrored under `/api/agent/intake/*`.

## Forbidden agent access

Do not expose or use these as agent operations:

- broad application/candidature list or show commands;
- arbitrary search;
- raw profile fact or variable dumps;
- dashboard payloads;
- generic PATCH/PUT object routes;
- direct database paths.

The browser dashboard is a local human UI. Its action routes are form/htmx-oriented internals and are not an agent contract.

Docs do not enforce security by themselves. Route absence, narrow service functions, and capability-scoped adapters reduce accidental over-exposure. If an agent has direct `.private/`, shell, code modification, or arbitrary localhost access while the dashboard server is running, AAAAT cannot fully constrain it.

Aggregate candidature lists are private behavioral data.
