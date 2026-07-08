# AAAAT

AAAAT is a local-first job application tracker and artifact generator for a single user. It helps you keep job opportunities, raw offer text, application notes, preparation material, tasks, generated artifacts, and reusable profile data in one private local workspace.

The production target is personal local production: one user, one local machine, private storage, a dashboard bound to localhost by default, and optional bounded agent-compatible task surfaces. It is not a SaaS product and it is not designed for public network hosting.

Product visual assets belong in [`aaaat/templates-ui/assets/`](aaaat/templates-ui/assets/). Keep only private-safe logo and screenshot assets there. Release screenshots should be generated from fake/demo data, not from a real `.private/` workspace.

## What AAAAT is

AAAAT is the local control layer for a job search. It stores candidatures and related material, renders a compact dashboard for review and recruiter-call preparation, tracks generated documents as artifacts, and exposes constrained task/context interfaces for external tools or agents when the user chooses to use them.

AAAAT can be used manually from the dashboard and CLI. Agent-compatible workflows are optional. AAAAT owns deterministic local operations such as storage, validation, task creation, local template rendering, artifact records, and review/application of results.

## What AAAAT is not

AAAAT is not:

- a SaaS job-search platform;
- a multi-user or team application;
- a public web service;
- a remote deployment target;
- an authentication or account-management system;
- a provider SDK wrapper;
- an agent runtime or orchestration framework;
- a broad CRUD API for agents;
- a CRM clone;
- a replacement for reviewing applications before submission.

Do not expose AAAAT to a public network. The supported production shape is local single-user use.

## Local-first privacy

Private data defaults to `.private/`. For the default storage path, the SQLite database is `.private/aaaat.sqlite3`. Generated local artifacts normally live under `.private/artifacts/` unless you choose another local output path.

The repository ignores `.private/`, common local database files, `outputs/`, `local/`, and temporary files. Keep real CV data, recruiter messages, raw offers, rendered letters, notes, and backups out of tracked repository paths.

The dashboard binds to `127.0.0.1` by default. This reduces accidental network exposure, but it is not a sandbox. AAAAT cannot protect private data from a process that can read `.private/`, inspect your local filesystem, modify the code, or access the running dashboard with your local permissions.

Static demos must use fake data only. The built-in static demo export reads `examples/demo_payload.json`, not your private database.

## Installation

Requirements:

- Python 3.11 or newer.
- A local checkout of this repository.
- A virtual environment is recommended.

From a fresh checkout:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .
```

On Windows PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e .
```

After installation, both forms are valid:

```bash
aaaat --version
python -m aaaat.cli --version
```

More detail: [docs/install.md](docs/install.md).

## Quick start

Initialize private local storage, add one example candidature, and open the dashboard:

```bash
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat launch
```

Open the printed local URL, normally:

```text
http://127.0.0.1:8765
```

A raw-offer intake flow is also available:

```bash
aaaat intake raw-offer --content "Paste a job offer here"
```

Use `--storage` before the subcommand to place private data somewhere else:

```bash
aaaat --storage /path/to/private-aaaat init
aaaat --storage /path/to/private-aaaat launch
```

## Dashboard mode

Dashboard mode is the normal local human UI:

```bash
aaaat launch
```

It runs the dashboard surface, binds to `127.0.0.1` by default, and starts in full local mode. Full local mode supports local write actions such as creating candidatures, editing fields, adding raw offer intake, creating tasks, saving notes, and rendering artifacts.

The dashboard is for the user. It may show internal local identifiers and rich private context because it is the local working surface, not the machine-facing agent contract.

## Read-only mode

Read-only mode shows the same local dashboard without write controls:

```bash
aaaat launch --read-only
```

Use it for review sessions, recruiter calls, or any situation where you want to inspect local data without accidentally editing it. Write routes are blocked in this mode.

## Agent mode

Agent mode starts the bounded machine-facing runtime instead of the dashboard:

```bash
aaaat launch --agent-api
```

The agent runtime exposes task/context/action capabilities only. It does not expose dashboard HTML, broad application lists, broad search, profile dumps, arbitrary CRUD, or entity-ID mutation routes.

Useful CLI commands:

```bash
aaaat agent tasks --state queued
aaaat agent next
aaaat agent context <task_handle>
aaaat agent packet <task_handle>
aaaat agent submit <task_handle> --result-file result.json
aaaat agent context-bundle --purpose cover_letter
aaaat agent action submit --input-file action.json
```

The current MCP support is a dependency-free MCP-compatible descriptor and validation command, not a claim that AAAAT is a full remote MCP server:

```bash
aaaat mcp-descriptor
aaaat mcp-validate
```

More detail: [docs/agent-workflow.md](docs/agent-workflow.md).

## Artifact generation

AAAAT renders local artifacts from local templates and stored data. The basic CLI render commands are:

```bash
aaaat render cv --output .private/artifacts/cv.tex
aaaat render cover-letter <application_id> --body "Draft body pending review." --output .private/artifacts/cover-letter.tex
```

Record external or rendered files as tracked local artifacts:

```bash
aaaat artifact save --application-id <application_id> --type cover_letter --path .private/artifacts/cover-letter.tex --label "Cover letter draft"
aaaat artifact list <application_id>
aaaat artifact update-state <artifact_id> --state reviewed --notes "Ready to use"
```

Review generated text before sending it to employers. AAAAT tracks local artifact state and provenance; it does not submit applications for you.

## Static demo export

Generate a private-safe static demo from fake demo data:

```bash
aaaat export static-demo outputs/static-demo.html
```

The export uses `examples/demo_payload.json`. It does not read `.private/` or your real local database. Treat `outputs/` as generated demo output; it is ignored by the repository.

## Local data and backup

Default local data layout:

```text
.private/
  aaaat.sqlite3
  artifacts/
```

Current backup flow is manual and local:

1. Stop the dashboard or agent runtime.
2. Copy the whole `.private/` directory to a private backup location outside tracked source paths.
3. Keep backups encrypted or otherwise protected according to your local threat model.
4. Restore by replacing `.private/` with the backup copy while AAAAT is stopped.

More detail: [docs/local-data.md](docs/local-data.md).

## Release checklist

Before calling a local release ready, verify:

- fresh install works on Python 3.11+;
- `aaaat init` is idempotent;
- dashboard launches at `127.0.0.1:8765`;
- read-only mode blocks writes;
- agent mode exposes only bounded task/context/action surfaces;
- static demo export uses fake data only;
- `.private/`, database files, artifacts, backups, and generated outputs are not committed;
- generated artifacts render locally and are reviewed before use;
- docs do not imply SaaS, multi-user, public-network, or provider-specific behavior;
- test suite and repository guard pass.

Full checklist: [docs/release-checklist.md](docs/release-checklist.md).

## Known limitations

- AAAAT is scoped to one local user and one private local workspace.
- There is no multi-user authentication or authorization model.
- There is no remote deployment hardening.
- Backup and restore are currently documented as manual local operations.
- The dashboard is a trusted local human surface, not an agent API.
- Agent-compatible surfaces reduce accidental over-exposure through supported routes; they do not constrain tools that already have filesystem, shell, code-modification, or arbitrary localhost access.
- The MCP support is a compatible descriptor/schema surface with validation, not a full transport claim.
- Generated documents still require human review before submission.

## Existing docs

- [Install](docs/install.md)
- [Local data and backup](docs/local-data.md)
- [Agent workflow](docs/agent-workflow.md)
- [Release checklist](docs/release-checklist.md)
- [CLI reference](docs/cli.md)
- [Security model](docs/security-model.md)
- [MCP descriptor notes](docs/mcp.md)
- [Product summary](docs/AAAAT%20Product%20Summary.md)
