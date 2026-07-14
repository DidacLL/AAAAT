# Local validation checklist

Use this as a short smoke-check list after installation changes, packaging changes, or before tagging a local release. It is not a product manifesto and it is not a substitute for issue-level acceptance criteria.

## Install and launch

```bash
python -m pip install -e .[desktop]
aaaat --version
python -m aaaat.cli --version
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat app list
aaaat-desktop
```

Expected result: install succeeds, the CLI runs, storage initializes, the example candidature appears in `app list`, and the wx desktop opens.

## Desktop demo

```bash
aaaat-seed-desktop-demo --reset --count 24
aaaat-desktop
```

Expected result: fake local data is seeded and the desktop can be used for visual smoke checks.

## Artifact rendering

```bash
aaaat render cv --output .private/artifacts/cv.tex
aaaat render cover-letter <application_id> --body "Draft body pending review." --output .private/artifacts/cover-letter.tex
```

Expected result: local files are written under private storage or another explicit local output path. Review generated content before using it externally.

## Agent-compatible commands

```bash
aaaat agent next
aaaat agent context <task_handle>
aaaat mcp-descriptor
aaaat mcp-validate
```

Expected result: agent commands expose bounded task/context capabilities only. They should not be documented or treated as broad CRUD over private local data.

## Package data

Verify the package includes runtime assets:

```bash
python -m pip install -e .[desktop]
python -m pytest tests/test_release_polish.py
```

Expected result: package metadata includes the runtime files required by the wx/local v1 app.

## Repository hygiene

Before committing, verify that these are not staged:

- `.private/`
- SQLite database files
- real raw offers
- real CV/profile data
- recruiter messages
- generated private artifacts
- local backups

## Tests

```bash
python -m pytest
```

Expected result: tests pass without adding heavy dependencies, generated private data, or provider-specific requirements.
