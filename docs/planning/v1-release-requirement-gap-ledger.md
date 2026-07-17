# AAAAT v1 release requirement gap ledger

Status: automated implementation closure ledger for `didacll/v1-lifecycle-conformance`.

Authority: `docs/requirements/v1-authoritative-requirements.md`.

This ledger records implementation closure only. It is not a second requirements source. Historical investigation detail remains available in repository history.

## Preserved product constraints

- AAAAT is local-first, provider-neutral, operating-system-neutral, and fully usable without AI.
- The private workspace remains separate from the application, repository, and AI-host working folders.
- wx is the canonical user application.
- Smart View and Detailed View retain distinct responsibilities.
- One candidature has one primary note.
- Existing user values and canonical keyword definitions remain authoritative unless the user deliberately changes them.
- Connected hosts receive complete purpose-bounded work, not broad database, filesystem, UI, or mutation authority.
- The LLM host manages its own capabilities and connection idiosyncrasies.
- Portable exchange is the last fallback.
- No provider SDK, plugin framework, generic workflow engine, broad CRUD API, or heavy dependency is required.

## Closed implementation gaps

### B1. Clean-workspace onboarding — closed

The first-use flow explains the private workspace, supports manual continuation, and provides obvious candidature and optional AI-connection actions without internal jargon.

### B2. Smart View contract — closed

Smart View remains a sparse candidature and recruiter-call workspace. Task, capability, integration, and broad artifact-management clutter are excluded.

### B3. Detailed View contract — closed

Detailed View owns complete candidature inspection, editing, exact assistance actions, keyword editing, material rendering, and record controls.

### B4. One candidature note — closed

Repeated saves update one candidature note value. No plural candidature-note collection is exposed in wx.

### B5. Standard assisted onboarding — closed

AAAAT supplies one provider-neutral connection request. The selected LLM host chooses the strongest supported route and keeps provider-specific setup in its own environment.

### B6. Internal-ID workflows — closed

Normal assistance originates from wx actions or bounded host actions. Users are not asked to discover or fabricate internal identifiers.

### B7. Progress and visible completion — closed

Canonical progress is persisted and the open desktop refreshes after external results. Completed, cancelled, stale, and superseded attempts reject further mutation.

### B8. Paired bridge — closed

The opaque paired bridge verifies initialization, tool discovery, and ping before exposing the seven bounded AAAAT tools. It accepts no workspace argument and exposes no broad resource surface.

### B9. Provider-owned host adaptation — closed

AAAAT does not install or configure provider software. The host may use MCP, native tools, a host-managed skill or plugin, an approved helper script or automation, or portable exchange.

### B10. Portable task/result fallback — closed

Only ready work is exported. Returned results use canonical validation and ingestion; blocked, duplicate, stale, altered, unauthorized, and cross-task results are rejected.

### B11. Advanced command workflow — closed

Advanced uses explicit fixed argv, bounded stdin/stdout contracts, controlled timeout/output limits, and concise failure handling. It is not part of standard onboarding.

### B12. Profile completion and rendering — closed

Profile context is conversational and user-directed. Rendering errors point to required local profile values without traceback. The selected candidature renders its own CV and cover letter locally as drafts.

### B13. Backup and restore — closed

Windows and Unix behavior is validated automatically, with connections closed before archive creation and cleanup and restored data verified in a separate workspace.

### B14. Expected-error handling — closed

Expected validation, path, template, SQLite, JSON, subprocess, and wrapper errors produce concise messages and stable nonzero outcomes without exposing tracebacks to normal users.

### B15. Structural privacy and transport equivalence — closed

Tests inspect exact agent-facing structures, capability isolation, stale and superseded attempts, path confinement, invalid-input non-mutation, and canonical equivalence across paired, portable, and Advanced transports.

## Automated release closure

Release eligibility is determined from the exact candidate head by:

1. the complete behavioral suite on Python 3.11, 3.12, and 3.13;
2. the provider-neutral deterministic lifecycle validator reporting `RELEASE_READY`;
3. native Windows, macOS, and Linux package build and verification;
4. checksum verification and execution from the exact archive after extraction outside the checkout;
5. direct release assets containing the platform ZIP and checksum;
6. pull-request artifacts containing the runnable platform folder directly inside GitHub's artifact wrapper.

A failing maintained gate reopens the relevant implementation gap.
