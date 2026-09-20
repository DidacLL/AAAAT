# ADR 0019 — Shared installation/configuration environment model

**Status:** Amended by current Product Owner authority during PR #319

## Context

AAAAT needs one honest source of setup state for its normal Settings UI and for optional external-assistant help. An earlier implementation projected that state into copyable `installer.ai` / `configurator.ai` free-chat prompts. Natural-use acceptance rejected that interpretation: those names belong to real AAAAT installation/configuration coverage, not clipboard templates.

At the same time, setup assistance must not create a package-manager framework, provider framework, generic shell surface or second configuration database.

## Decision

Keep one small setup-environment snapshot derived from existing product services:

- current workspace readiness;
- availability of the known `latexmk` and `pdflatex` commands and document-rendering readiness;
- optional AI configuration readability and connection count;
- per-operation validated AI-route availability.

The normal Settings UI renders this live state directly through two product projections:

- `installer.ai`: workspace and local document-rendering prerequisites;
- `configurator.ai`: optional AI configuration and bounded operation coverage.

These are structured setup harness views, not prompt textareas. Technical details such as detected TeX version lines may remain available locally in Settings, while the shared harness projection intentionally omits unnecessary machine detail.

The same snapshot is exposed to compatible external assistants through two read-only bounded MCP tools:

- `installer_status_read`
- `configurator_status_read`

Those tools disclose only prerequisite/coverage state. They do not install packages, execute commands, edit configuration, enumerate workspace data, reveal connection names/endpoints/credentials, or grant generic database/filesystem/process authority.

Actual configuration changes continue through ordinary AAAAT user-controlled settings and concrete bounded actions. New setup mutations should be added only when a real user-facing need exists.

## Consequences

- GUI and external-assistant setup help share one source of truth.
- `installer.ai` / `configurator.ai` are useful capabilities instead of copy/paste artifacts.
- Local/manual/no-AI operation remains valid.
- Setup knowledge can grow incrementally without becoming a workflow engine or arbitrary system automation surface.
