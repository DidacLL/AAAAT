# Agent-Agnostic Auto Application Tracker

AAAAT is a local-first desktop workspace for managing job applications, preparing recruiter conversations, and generating per-application text artifacts from local user data.

It is designed for one person running it on their own machine. Private job-search data stays in local storage by default. The wx desktop application is the only v1 human runtime.

## What AAAAT does

AAAAT provides a private operational workspace to:

- retain job opportunities and original offer/source text;
- navigate active candidatures quickly in Smart View;
- inspect and edit complete candidature records in Detailed View;
- maintain profile variables, reusable evidence, keywords, notes and todos;
- prepare recruiter, interview, CV, cover-letter and form material;
- render and track local artifacts with provenance;
- optionally receive bounded assistance from an external AI or agent host.

External intelligence is optional. AAAAT is not a provider SDK, LLM runtime, provider catalogue, general agent orchestrator, or broad CRUD API.

## Assisted architecture

```text
AAAAT creates bounded work
→ an external host connects to AAAAT
→ one call atomically claims one complete work item
→ that work item already contains purpose-scoped context, instructions, privacy notes and its response schema
→ the external host reasons in its own runtime
→ it reports optional progress and submits one structured result using a random attempt-scoped capability
→ AAAAT validates, applies, persists and renders locally
```

The random `task_capability` is not a task ID or database key. It authorizes only progress and result callbacks for one task attempt. It becomes unusable when that attempt is completed, cancelled or superseded.

All wrappers use the same queue and canonical result-ingestion path:

- `aaaat-mcp` — the standard operational MCP stdio server;
- bounded CLI commands;
- the browser native-messaging bridge;
- portable task/result archives;
- an explicit Advanced user-owned command.

No wrapper may expose SQLite, internal IDs, broad listing/search, arbitrary filesystem access, or a second mutation path.

## Assistance choices

- **Continue manually** — use the complete wx workspace without external intelligence.
- **Connect my AI** — configure the external host to start or connect to `aaaat-mcp`.
- **Use a browser or chat AI** — use the browser bridge where supported, otherwise transfer one grouped task archive and one result archive.
- **Advanced integration** — explicitly configure one user-owned command that receives a complete bounded work item on stdin and returns one JSON result on stdout.

AAAAT never installs, retains, activates, or executes generated connector packages in the standard flow. An external host may generate and own its own MCP/client configuration outside AAAAT.

## Installation

Requires Python 3.11 or newer.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install .[desktop]
```

Verify the installed commands:

```bash
aaaat --version
aaaat-mcp --help
aaaat-desktop --help
aaaat-upgrade --help
```

## Quick start

```bash
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat-desktop
```

Use another private storage path by placing `--storage` before a CLI subcommand or passing it to the desktop launcher:

```bash
aaaat --storage /path/to/private-aaaat init
aaaat-desktop --storage /path/to/private-aaaat
```

For an existing store:

```bash
python -m aaaat.cli --storage /path/to/private-aaaat backup
aaaat-upgrade --storage /path/to/private-aaaat
aaaat-desktop --storage /path/to/private-aaaat
```

## Connect an external host through MCP

Configure the external host to start:

```text
command: aaaat-mcp
arguments: --storage /path/to/private-aaaat
transport: stdio
```

The MCP server exposes only:

```text
get_next_agent_work
report_agent_task_progress
submit_agent_task_result
submit_agent_action
```

`get_next_agent_work` returns the complete bounded work item. There is no second context-fetch operation.

The provider, model, credentials, network policy and provider-specific interaction remain owned by the external host.

## CLI compatibility surface

```bash
aaaat --storage /path/to/private-aaaat agent next
aaaat --storage /path/to/private-aaaat agent submit <task_capability> --result-file result.json
aaaat --storage /path/to/private-aaaat agent action submit --input-file action.json
aaaat mcp-descriptor
aaaat mcp-validate
```

Local user-administration commands may use internal IDs because they are operated directly by the user. Agent-facing operations never accept those IDs as authority.

## Browser and chat fallback

For a browser/chat AI without an operational local bridge, AAAAT exports one archive containing every eligible complete work item for the selected candidature. The AI returns one result archive. AAAAT validates each result independently so one invalid section does not discard unrelated valid results.

## Local data and backup

AAAAT stores its SQLite database at `.private/aaaat.sqlite3` by default and generated artifacts under `.private/artifacts/`.

```bash
python -m aaaat.cli backup
```

Keep raw offers, recruiter notes, profile values, CV content, generated letters and backups out of source control.

## Demo data

```bash
aaaat-seed-desktop-demo --reset --count 24
aaaat-desktop
```

`--reset` replaces only demo-marked records.

## Artifact generation

```bash
aaaat render cv --output .private/artifacts/cv.tex
aaaat render cover-letter <application_id> --body "Draft body pending review." --output .private/artifacts/cover-letter.tex
```

Review generated documents before sending them.

## More documentation

- [V1 authoritative requirements](docs/requirements/v1-authoritative-requirements.md)
- [Release checklist](docs/release-checklist.md)
- [Local release validation](docs/local-release-validation.md)
- [Install](docs/install.md)
- [Local data and backup](docs/local-data.md)
- [Agent workflow](docs/agent-workflow.md)
- [CLI reference](docs/cli.md)
- [Security model](docs/security-model.md)
- [MCP](docs/mcp.md)
