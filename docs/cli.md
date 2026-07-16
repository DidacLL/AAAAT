# CLI

The CLI contains two categories:

- local/admin commands for the user and desktop maintenance;
- narrow agent-facing commands over the bounded queue and action services.

Local/admin commands may use internal IDs because they are explicit local user operations. Agent-facing commands must not.

## Local storage and desktop

```bash
aaaat init
aaaat backup
aaaat-upgrade --storage .private
aaaat-desktop --storage .private
```

Private data defaults to `.private/aaaat.sqlite3`; generated artifacts default to `.private/artifacts/`.

## Local candidature operations

```bash
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat app list
aaaat app show <application_id>
aaaat app update <application_id> --status active --keywords "Python, SQLite"
aaaat intake add <application_id> --content "..."
aaaat intake raw-offer --content "..."
```

These are local user/admin operations, not agent authority.

## Profile and career data

```bash
aaaat profile set display_name "Local User"
aaaat profile missing
aaaat profile fact add --type skill --title Python --body "Backend APIs" --use-for-cv --use-for-agent-context
aaaat profile fact list
aaaat career-plan add --body "Target local-first tooling roles" --target-roles "Backend Engineer"
aaaat career-plan list
```

Variables, profile facts, and career plans are exposed to agent work only through purpose-scoped work-item construction and configured exposure rules.

## Artifacts

```bash
aaaat render cv --output .private/artifacts/cv.tex
aaaat render cover-letter <application_id> --body "Draft body" --output .private/artifacts/cover-letter.tex
aaaat artifact list <application_id>
aaaat artifact update-state <artifact_id> --state reviewed
```

AAAAT renders and records local artifacts. External hosts submit structured data or draft text, not authoritative final files.

## Agent-facing work

Claim the next eligible task:

```bash
aaaat agent next
```

The command atomically claims one task and returns one complete bounded work item. The response contains the task purpose, instructions, scoped context, output contract, response schema, privacy notes, allowed actions, and random `task_capability`.

Submit a structured result:

```bash
aaaat agent submit <task_capability> --result-file result.json
aaaat agent submit <task_capability> --result-body '{"result":"..."}'
```

Submit a supported bounded action:

```bash
aaaat agent action submit --input-file action.json
aaaat agent action submit --input-body '{"action":"create_candidature","payload":{...}}'
```

There are no agent `context`, `packet`, `dispatch`, or `context-bundle` commands. Context is part of the claimed work item; transport dispatch belongs to the external host.

`task_capability` is attempt-scoped callback authority only. It is not an internal task ID or an entity mutation handle.

## MCP

```bash
aaaat mcp-descriptor
aaaat mcp-validate
aaaat-mcp --storage .private
```

`aaaat-mcp` is a dependency-free stdio MCP server. It maps its tools to the same acquisition, progress, result-ingestion, and bounded-action services as other adapters.

## Advanced user-owned command

A user may explicitly configure `argv_custom_command`. AAAAT writes one complete bounded work item to stdin and expects one JSON result on stdout. Stderr is diagnostics.

The command implementation may use any provider or runtime. AAAAT does not configure or name that provider in core behavior.

## Local maintenance

Additional local commands exist for tasks, notes, todos, blobs, glossary entries, variables, search, configuration, and backups. Run `aaaat <command> --help` for exact arguments. These commands are not automatically part of the agent contract.
