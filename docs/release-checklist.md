# AAAAT v1 release checklist

Use this checklist after packaging, migration, or release-candidate changes.

## Build and installed commands

```bash
python -m pip wheel . --no-deps --wheel-dir dist
python -m pip install dist/aaaat-*.whl
aaaat --version
aaaat-desktop --help
aaaat-upgrade --help
aaaat-seed-desktop-demo --help
```

Expected result: the wheel builds, installs without editable-checkout behavior, reports version `1.0.0`, and all shipped commands resolve.

## Candidate identity and provenance

The validated CI run must retain an `aaaat-v1-candidate` artifact containing:

```text
aaaat-1.0.0-py3-none-any.whl
SHA256SUMS
```

Verify the downloaded candidate before installation:

```bash
sha256sum --check SHA256SUMS
```

Expected result: the checksum passes, distribution metadata identifies GPL-3.0-or-later and the project repository, and the candidate is the artifact produced by the green run for the exact release commit.

## New storage and desktop launch

```bash
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat app list
aaaat-desktop
```

Expected result: storage initializes, the candidature is retained, and the wx desktop opens.

## Existing storage upgrade

```bash
python -m aaaat.cli --storage /path/to/private-aaaat backup
aaaat-upgrade --storage /path/to/private-aaaat
aaaat-upgrade --storage /path/to/private-aaaat
aaaat-desktop --storage /path/to/private-aaaat
```

Expected result: both upgrade runs succeed, existing candidatures and artifacts remain present, and the desktop opens the upgraded store.

## Desktop demo

```bash
aaaat-seed-desktop-demo --reset --count 24
aaaat-desktop
```

Expected result: fake local data is seeded and the desktop can be used for visual smoke checks. Reset must not remove unrelated user data.

## Artifact rendering

```bash
aaaat render cv --output .private/artifacts/cv.tex
aaaat render cover-letter <application_id> --body "Draft body pending review." --output .private/artifacts/cover-letter.tex
```

Expected result: local files are written. When `pdflatex` is unavailable, the TeX artifact remains tracked for later compilation.

## Agent-compatible commands

```bash
aaaat agent next
aaaat agent context <task_handle>
aaaat mcp-descriptor
aaaat mcp-validate
```

Expected result: agent commands expose bounded task/context capabilities and opaque task handles, not broad entity mutation authority.

## Repository hygiene

Before committing, verify that these are not staged:

- `.private/`;
- SQLite database files;
- real raw offers;
- real CV/profile data;
- recruiter messages;
- generated private artifacts;
- local backups.

## Complete validation

```bash
python -m compileall -q aaaat tests
python -B -m aaaat.cli mcp-validate
python -B -m unittest discover -s tests
```

Expected result: all checks pass without provider-specific runtime requirements, heavy dependencies, or private data.
