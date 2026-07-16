# AAAAT v1 release notes

Status: development draft. Not release-ready.

AAAAT v1 remains a local-first wx desktop product with optional provider-agnostic external assistance.

The current release branch has completed substantial packaging, migration, bounded-work, and wrapper infrastructure, but human review exposed unresolved product and platform blockers. The authoritative status is recorded in:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`

## Required before release

The remaining work includes:

- understandable clean-workspace onboarding;
- restoration of the intended distinct Smart View and Detailed View responsibilities;
- one candidature note and structured keyword editing;
- standard assisted onboarding without protocol or runtime jargon;
- concrete executable paired-host, portable-fallback, progress, and Advanced-command workflows;
- guided profile completion and local artifact rendering;
- concise expected-error handling without Python tracebacks;
- working Windows backup and restore;
- structural privacy and capability-isolation validation;
- a new human review performed only after the implementation ledger is closed.

## Architecture retained

- wx remains the only v1 human runtime.
- Manual operation remains available without AI.
- External hosts own reasoning, providers, models, credentials, and inference.
- A connected LLM may configure its own host according to that host's permission policy; AAAAT supplies the connection brief and opaque bridge only.
- AAAAT owns local data, one bounded work queue, complete purpose-scoped work items, validation, deterministic application, rendering, artifacts, and provenance.
- Result and progress callbacks use random attempt-scoped capabilities rather than internal entity IDs.
- Supported wrappers must reuse canonical services and must not restore split context, packet, dispatch, broad CRUD, generated connector ingestion, or provider-specific core behavior.

## Release status

Do not publish, tag, or merge as v1 until all release blockers in the active gap ledger are resolved and the maintainer approves the completed human review.
