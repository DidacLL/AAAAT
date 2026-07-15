# AAAAT v1 release checklist

Authoritative product requirements: [`docs/requirements/v1-authoritative-requirements.md`](requirements/v1-authoritative-requirements.md).

This checklist validates packaging and release mechanics. It does not independently establish product readiness. `RELEASE_READY` requires the complete communication, wx and deterministic acceptance gates in the authoritative requirements.

## Automated product gates

These gates must remain green in the complete Python 3.11–3.13 behavioral matrix:

- bounded task/context/result/progress envelopes use opaque handles;
- local CLI runtimes and generic user-owned commands share one validation path;
- runtime bootstrap, negotiation and nonce conformance use fake data before private context;
- generated connector packages are previewed, restricted, installed disabled and activated only after conformance;
- browser native messaging exposes only bounded task operations and no listening port;
- browser-only grouped task/result bundles validate sections independently;
- assisted profile completion preserves protected user values;
- candidature lifecycle planning covers extraction, evaluation, strategy, research, recruiter preparation, interview preparation, form answers, CV and cover letter material;
- blocked lifecycle tasks are released only after prerequisites exist;
- retries create new task attempts and opaque handles;
- duplicate, late and superseded results are rejected;
- runtime stdout/stderr and connector progress are bounded;
- progress events are persisted as task-scoped NDJSON;
- deterministic empty-store release scenario exercises configured execution, lifecycle application, failure/retry, rendering, provenance and projection visibility;
- installation, source distribution, migration, backup and supported-Python checks pass.

A failure in any automated gate is `NOT_RELEASE_READY`.

## Required manual product gates

These require a real user environment and cannot be replaced by CI:

- manual wx operation works without an LLM integration;
- guided Welcome/User setup is visually understandable to a non-technical user;
- a real local Ollama CLI round trip completes profile and candidature work without AAAAT HTTP;
- a real llama.cpp CLI round trip, or equivalent independent local CLI implementation, completes through the same protocol;
- a generated connector is created by an external LLM, previewed, installed and conformed without source changes;
- a browser-only task bundle is uploaded to a real chat and its result bundle imports successfully;
- the browser native-messaging companion is installed and completes one bounded round trip in a supported browser environment;
- progress, failure, cancellation where supported and retry are visible and understandable in wx;
- Smart, Detailed and User projections refresh correctly after results;
- generated fields remain editable;
- CV and cover-letter artifacts render locally with correct provenance and draft/reviewed/submitted/archive semantics;
- an existing realistic store upgrades without losing candidatures, profile data or artifacts.

Until every manual gate is recorded as passed, report `NOT_RELEASE_READY` even when CI is green.

## Build and installed commands

```bash
python -m pip wheel . --no-deps --wheel-dir dist
python -m pip install dist/aaaat-*.whl
aaaat --version
aaaat-desktop --help
aaaat-upgrade --help
aaaat-seed-desktop-demo --help
aaaat-browser-host --help
```

Expected result: the wheel builds, installs without editable-checkout behavior, reports version `1.0.0`, and all shipped commands resolve outside the repository checkout.

## Supported Python versions

The complete behavioral suite and installed-command smoke checks must pass on Python 3.11, 3.12, and 3.13. These are the versions declared by the v1 package metadata.

Expected result: no supported interpreter requires provider credentials, browser/server components, or additional runtime dependencies beyond the selected desktop extra.

## Candidate identity and provenance

The validated CI run must retain an `aaaat-v1-candidate` artifact containing:

```text
aaaat-1.0.0-py3-none-any.whl
aaaat-1.0.0.tar.gz
SHA256SUMS
```

Verify the downloaded candidate before installation:

```bash
sha256sum --check SHA256SUMS
```

Expected result: both checksums pass, wheel and source distribution install outside the repository checkout, distribution metadata identifies GPL-3.0-or-later and the project repository, and the candidate is the artifact produced by the green run for the exact release commit.

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

Expected result: agent commands expose bounded task/context capabilities and opaque task handles, not broad entity mutation authority. These commands are compatibility surfaces, not proof of an operational communication layer.

## Repository hygiene

Before committing, verify that these are not staged:

- `.private/`;
- SQLite database files;
- real raw offers;
- real CV/profile data;
- recruiter messages;
- generated private artifacts;
- local backups.

## Complete automated validation

```bash
python -m compileall -q aaaat tests
python -B -m aaaat.cli mcp-validate
python -B -m unittest discover -s tests
```

Expected result: all checks pass without provider-specific runtime requirements, heavy dependencies, private data, mandatory HTTP or exposed ports.
