# AutoApplicationAgentAgnosticTracker

AAAAT is a local-first job application tracker and artifact generator. It stores private data locally, renders a compact dashboard, and exposes passive CLI, REST, and MCP-compatible descriptor surfaces for whichever agent the user already prefers.

AAAAT is not a SaaS app, not a multi-user service, and not an LLM provider wrapper. It is intended for a single user on a local machine.

## Quick Start

```bash
python -m aaaat.cli init
python -m aaaat.cli app create --company "Example Co" --role "Backend Engineer"
python -m aaaat.cli launch
```

Full local mode supports browser forms for creating/updating applications, raw intake, glossary terms, profile variables, and artifact records. Read-only mode shows the same local data without write controls:

```bash
python -m aaaat.cli launch --read-only
```

Private data defaults to `.private/`. Static demos use `examples/demo_payload.json` only.

## Local data and backup

AAAAT stores its local SQLite database at `.private/aaaat.sqlite3` by default and generated artifacts under `.private/artifacts/`. New and existing databases are initialized idempotently and include lightweight schema metadata with `schema_version`.

Create a local backup before upgrades or risky maintenance:

```bash
python -m aaaat.cli backup
```

The backup command creates a timestamped zip under `.private/backups/` containing the SQLite database and artifact files. See `docs/local-data.md` for restore notes and custom backup output behavior.
