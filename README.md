# Agent-Agnostic Auto Application Tracker

AAAAT is a local-first desktop workspace for managing job applications and producing per-application text artifacts from private local data.

An AI host opening this workspace should start with [SKILL.md](SKILL.md): it
guides the first career conversation, profile setup, and durable connection in
user language.

The wx desktop application is the only v1 human runtime. AAAAT remains usable manually without any AI connection.

AAAAT owns local data, bounded work construction, validation, deterministic application, rendering, artifacts, and the human UI. A connected LLM is the user's intelligent setup and assistance surface: it owns reasoning, provider/model choice, credentials, network access, and host-specific configuration with the user's approval.

AAAAT is not an LLM provider wrapper, agent orchestrator, plugin host, browser dashboard, or broad agent CRUD API.

## Active v1 authority

Implementation and release work must follow:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`

Historical planning documents, old dashboard requirements, obsolete split task/context contracts, generated tests, and prior PR descriptions are not implementation authority.

PR #45 remains a draft until the active gap ledger is closed and the documented human review is executable on the actual wx product.

## Installation

Requires Python 3.11 or newer.

Linux/macOS:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install ".[desktop]"
```

Windows PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install ".[desktop]"
```

Start the desktop:

```bash
aaaat-desktop
```

Use another private storage path:

```bash
aaaat-desktop --storage /path/to/private-aaaat
```

## Current development status

The implementation and automated validation gates are complete, including wx onboarding/view contracts, executable wrapper fixtures, expected-error handling, guided rendering, and Windows backup/restore. v1 is still not ready for human acceptance: PR #45 remains draft until the required real-user wx and external-host demonstrations are recorded and directly approved.

See the active gap ledger for exact required implementation and acceptance criteria.

## Local data

Private data defaults to `.private/aaaat.sqlite3`, with generated artifacts under `.private/artifacts/`.

Create a backup before upgrades:

```bash
aaaat --storage /path/to/private-aaaat backup
```

Windows backup/restore remains an active release blocker until the gap ledger item is closed.

## Connected LLM architecture

The normal assisted path starts with **Connect my AI** in the desktop app. The LLM reads a concise host-only connection brief, assesses what its own host can do, and chooses the best available connection: MCP first, then a native tool or skill, an approved host-side script or automation, and portable transfer only as a fallback. A normal user never needs a storage path, command, database, internal ID, task capability, or protocol detail.

AAAAT does not configure providers or keep credentials. It supplies the paired local bridge and validates work; the LLM configures its own host with its own permission model.

## Bounded work architecture

The normal external-agent flow is:

```text
external host requests work
→ AAAAT atomically returns one complete bounded work item
→ external host reports progress and submits one result
→ AAAAT validates and applies it locally
```

The work item includes its purpose-scoped context. There is no normal second context-fetch, packet, or dispatch step.

The paired bridge, bounded CLI, portable fallback, and explicit Advanced user-owned command all reuse the same canonical queue and ingestion services. The former browser extension is not an active v1 connection route.

The normal human product must not require internal IDs, task/capability terminology, ports, executables, or protocol knowledge.

## Development commands

```bash
aaaat --version
aaaat-desktop --help
aaaat-upgrade --help
aaaat-mcp --help
aaaat-host-bridge --help
aaaat mcp-validate
```

These commands are development and troubleshooting surfaces. They are not a substitute for the required wx onboarding and end-to-end human workflows.

## More documentation

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`
- `docs/install.md`
- `docs/release-notes-v1.md`
- `docs/security-model.md`
- `docs/mcp.md`
