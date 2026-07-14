# Annex B — CLI and agent surface

## CLI: primary practical adapter

Implemented task capability:

```bash
python -m aaaat.cli agent next
python -m aaaat.cli agent context <task_handle>
python -m aaaat.cli agent packet <task_handle>
python -m aaaat.cli agent submit <task_handle> --result-body "..."
python -m aaaat.cli agent submit <task_handle> --result-file result.json
```

The existing broad CLI commands may remain for human/local use. The `agent` subcommands are the recommended agent contract. They must be capability-scoped, schema-bound, and non-CRUD.

## Desktop launch

The canonical human runtime is the wx desktop app:

```bash
aaaat-desktop
```

The desktop is local and editable. Do not document or implement a separate read-only desktop/runtime mode.

## Agent-compatible descriptor

AAAAT currently provides descriptor/tool-schema compatibility through CLI commands:

```bash
python -m aaaat.cli mcp-descriptor
python -m aaaat.cli mcp-validate
```

This is descriptor/tool-schema compatibility for local adapters. It is not a full MCP server transport and does not create a broad HTTP CRUD surface.

## Agent boundary

All agent-facing work must call narrow service-layer functions. Do not expose generic object routes or broad database browsing.

Agent-facing surfaces must not expose dashboard/private CRUD/search/profile/render routes, dashboard payloads, arbitrary local IDs as mutation authority, raw variables, raw profile facts, or local storage paths.
