# Agent-Agnostic Auto Application Tracker

AAAAT is a local-first desktop workspace for managing job applications, preparing recruiter conversations, and generating per-application text artifacts from local user data.

It is built for one person running it on their own machine. Private job-search data stays in local storage by default. The wx desktop application is the only v1 human runtime.

## What AAAAT does

AAAAT gives you a private operational workspace for your job search:

- store job opportunities and retained raw offer/source text;
- inspect active candidatures quickly in Smart View during calls or low-attention review;
- edit candidature fields in Detailed View;
- maintain keywords with definitions so known terms can be linked and explained in context;
- keep profile variables and reusable career facts for CVs and cover letters;
- render local CV and cover-letter artifacts from templates;
- use external intelligence through optional bounded task/result connections.

External intelligence is optional. AAAAT is not a provider SDK, general agent orchestrator, or broad CRUD API. Historical browser dashboards, mandatory application servers, static-export products and runtime-mode products are not supported v1 human surfaces.

## AI assistance choices

The standard assisted direction is:

```text
AAAAT creates bounded work
→ the external AI connects to AAAAT
→ the external AI obtains one eligible task and its bounded context
→ the external AI reasons in its own runtime
→ the external AI submits progress and a structured result
→ AAAAT validates, applies and renders locally
```

MCP, CLI, generated connectors, browser bridges, files and portable bundles wrap the same existing bounded task queue and commands. They do not implement a second queue or make AAAAT an LLM runtime.

The desktop presents these choices:

- **Continue manually** — use the complete workspace without an AI connection.
- **Connect my AI** — generate and validate a bounded connector for the AI you already use.
- **Use a browser or chat AI** — export one candidature task file and import one returned result file.
- **Advanced integration** — configure a user-owned command, macro or script that may trigger an LLM and must return one bounded result.

The Advanced command option is explicit, optional and user-controlled. It is not the standard architecture.

Every communication path may carry only purpose-specific bounded tasks, task-scoped progress and validated results. It may not expose arbitrary candidature/profile searches, storage paths, internal IDs as mutation authority, or a broad AAAAT data API.

## Local-first privacy

Private data defaults to `.private/`.

Typical local layout:

```text
.private/
  aaaat.sqlite3
  artifacts/
```

Keep real job-search data in private local storage: raw offers, recruiter notes, profile values, CV content, generated letters, and backups.

## Installation

Requires Python 3.11 or newer.

Linux/macOS:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install .[desktop]
```

Windows PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install .[desktop]
```

Check the commands:

```bash
aaaat --version
aaaat-desktop --help
aaaat-upgrade --help
```

## Quick start

Initialize local storage, add one opportunity, and open the desktop app:

```bash
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat-desktop
```

To use another private storage path, put `--storage` before the CLI command or pass it to the desktop launcher:

```bash
aaaat --storage /path/to/private-aaaat init
aaaat-desktop --storage /path/to/private-aaaat
```

For an existing store, create a backup and apply the supported v1 compatibility upgrades before launching:

```bash
python -m aaaat.cli --storage /path/to/private-aaaat backup
aaaat-upgrade --storage /path/to/private-aaaat
aaaat-desktop --storage /path/to/private-aaaat
```

The desktop launcher also applies supported idempotent v1 compatibility upgrades before loading the selected store. The explicit upgrade command remains useful for preflight verification and release maintenance.

## Demo data

For local UI validation with fake candidatures:

```bash
aaaat-seed-desktop-demo --reset --count 24
aaaat-desktop
```

The demo seed writes local fake data to the selected storage path. `--reset` replaces only records previously created by the demo seeder; it does not delete unrelated user candidatures. Demo data is for local validation, not a separate browser/static export surface.

## Desktop

Start the editable local desktop workspace:

```bash
aaaat-desktop
```

## Local data and backup

AAAAT stores its SQLite database at `.private/aaaat.sqlite3` by default and generated artifacts under `.private/artifacts/`.

Create a local backup before upgrades or risky maintenance:

```bash
python -m aaaat.cli backup
```

The backup command creates a timestamped zip under `.private/backups/` containing the SQLite database and artifact files. See `docs/local-data.md` for restore notes and custom backup output behavior.

## Agent/task commands

Agent-facing work is task-handle scoped and descriptor-oriented. Useful commands:

```bash
aaaat agent next
aaaat agent context <task_handle>
aaaat agent packet <task_handle>
aaaat agent submit <task_handle> --result-file result.json
aaaat agent context-bundle --purpose cover_letter
aaaat agent action submit --input-file action.json
aaaat mcp-descriptor
aaaat mcp-validate
```

AAAAT currently provides descriptor/tool-schema compatibility only. It does not ship a full MCP server transport.

## Artifact generation

Render a CV:

```bash
aaaat render cv --output .private/artifacts/cv.tex
```

Render a cover letter for an application:

```bash
aaaat render cover-letter <application_id> --body "Draft body pending review." --output .private/artifacts/cover-letter.tex
```

Track an artifact:

```bash
aaaat artifact save --application-id <application_id> --type cover_letter --path .private/artifacts/cover-letter.tex --label "Cover letter draft"
aaaat artifact list <application_id>
aaaat artifact update-state <artifact_id> --state reviewed --notes "Ready to use"
```

These ID-based commands are local user administration commands. Agent-facing contracts use opaque task handles and bounded action packets instead.

Review generated documents before sending them.

## More docs

- [V1 release and upgrade notes](docs/release-notes-v1.md)
- [Local release validation](docs/local-release-validation.md)
- [Install](docs/install.md)
- [Local data and backup](docs/local-data.md)
- [Agent workflow](docs/agent-workflow.md)
- [CLI reference](docs/cli.md)
- [Security model](docs/security-model.md)
- [MCP descriptor compatibility](docs/mcp.md)
