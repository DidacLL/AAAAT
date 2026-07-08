# Local validation checklist

Use this as a short smoke-check list after installation changes, packaging changes, or before tagging a local release. It is not a product manifesto and it is not a substitute for issue-level acceptance criteria.

## Install and launch

```bash
python -m pip install -e .
aaaat --version
python -m aaaat.cli --version
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat app list
```

Expected result: install succeeds, the CLI runs, storage initializes, and the example candidature appears in `app list`.

## Dashboard modes

```bash
aaaat launch
aaaat launch --read-only
aaaat launch --agent-api
```

Expected result: the dashboard starts on `127.0.0.1`, read-only mode blocks write actions, and agent mode starts the bounded agent runtime instead of the dashboard UI.

## Static demo

```bash
aaaat export static-demo outputs/static-demo.html
```

Expected result: the output is generated from fake demo data and does not read `.private/`.

## Artifact rendering

```bash
aaaat render cv --output .private/artifacts/cv.tex
aaaat render cover-letter <application_id> --body "Draft body pending review." --output .private/artifacts/cover-letter.tex
```

Expected result: local files are written under private storage or another explicit local output path. Review generated content before using it externally.

## Agent-compatible commands

```bash
aaaat agent tasks --state queued
aaaat agent next
aaaat mcp-descriptor
aaaat mcp-validate
```

Expected result: agent commands expose bounded task/context capabilities only. They should not be documented or treated as broad CRUD over private local data.

## Repository hygiene

Before committing, verify that these are not staged:

- `.private/`
- SQLite database files
- real raw offers
- real CV/profile data
- recruiter messages
- generated private artifacts
- local backups
- generated `outputs/` content unless intentionally adding a fake demo artifact

Visual assets under `aaaat/templates_ui/assets/` must be private-safe.

## Tests and guardrails

```bash
python -m pytest
python tools/repo_guard.py
```

Expected result: tests and repository guard pass without adding heavy dependencies, generated private data, or provider-specific requirements.
