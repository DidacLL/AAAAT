# AAAAT v1 release notes

AAAAT v1 is a local-first, provider-agnostic job-application workspace with a wx desktop interface and SQLite storage.

## Included

- Offer-first candidature creation.
- Smart View recruiter-call cockpit and Detailed View candidature editing.
- CV and cover-letter material lifecycle, provenance, notes, reviewed/sent/archive transitions, and local artifact attachment.
- Provider-neutral profile links and structured reusable evidence.
- Independent profile-field saves without full-page rebuild jitter.
- Automatic availability of deferred CV and cover-letter preparation after fit review and application approach are present.
- Welcome View for empty storage.
- Demo reset limited to demo-marked data.
- Idempotent compatibility handling for career-plan, keyword metadata, and candidature-detail columns.
- Tracked TeX output when `pdflatex` is unavailable.
- Opaque task-handle workflows with bounded context and no broad entity mutation authority.
- User-intent-first assistance choices: Continue manually, Connect my AI, Use a browser or chat AI, and Advanced integration.
- Thin communication wrappers over the existing bounded queue and commands.
- A generic Advanced user-owned command option with no provider catalogue.
- Canonical result ingestion shared by connected-host, browser and portable-bundle paths.
- Normal wheel packaging and installed-command validation.

## Runtime and communication contract

The wx desktop application is the only v1 human product runtime. Browser dashboards, mandatory local application servers, static-export modes and runtime-mode products are not supported v1 human surfaces.

External AI hosts connect to AAAAT and consume its existing bounded queue through thin wrappers such as MCP, bounded CLI commands, files, browser messaging or another declared transport. These wrappers do not create a second queue or domain pipeline.

External intelligence owns reasoning, provider/model selection, credentials and provider-specific interaction. AAAAT owns bounded context, internal record binding, validation, persistence, local rendering, provenance and deterministic application of results associated with opaque task handles.

Technical users may configure one generic user-owned command under Advanced integration. That command may reach any external system selected by the user, but AAAAT contains no named provider or runtime integration.

## Upgrade notes

1. Back up the current local store before upgrading:

   ```bash
   python -m aaaat.cli --storage /path/to/private-aaaat backup
   ```

2. Install the updated package with the desktop extra:

   ```bash
   python -m pip install .[desktop]
   ```

3. Upgrade the same storage path before opening the desktop application:

   ```bash
   aaaat-upgrade --storage /path/to/private-aaaat
   aaaat-desktop --storage /path/to/private-aaaat
   ```

`aaaat-upgrade` is additive and idempotent for supported v1 stores. It creates missing schema objects, applies all supported compatibility columns, preserves existing rows, normalizes legacy candidature statuses, and seeds defaults with `INSERT OR IGNORE` behavior. It can be run repeatedly against the same store.

The desktop launcher runs the same supported upgrade path before reading its store. Existing removed integration selections fall back safely to manual mode.

Do not copy or replace `aaaat.sqlite3` while AAAAT is running. Keep the backup until the upgraded desktop opens and the existing candidatures and materials have been checked.

## Known operational requirements

- Python 3.11 or newer.
- `wxPython` installed through the `desktop` extra.
- `pdflatex` is optional; without it, AAAAT keeps the generated TeX artifact for later compilation.
- External intelligence is optional; manual operation remains available without any integration.
