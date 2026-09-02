# ADR 0003 — User-owned workspace root

## Context

M0 used Electron's `userData` directory as a disposable SQLite packaging proof. AAAAT instead requires user-owned, portable local product data.

## Decision

AAAAT workspace data is rooted in a user-selected directory. The workspace database lives at `<workspace>/workspace.sqlite`. Application-level settings may remember the last workspace outside that directory, but career and document data belongs to the workspace.

## Consequences

- Workspace data is visibly user-owned.
- Backup and device transfer have a natural future boundary.
- VCVGenerator artifacts can later live beneath the workspace.
- Renderer filesystem authority remains constrained.
- The disposable M0 database is not migrated.

## Rejected alternatives

- Electron `userData` as permanent career storage.
- Mandatory cloud or account storage.
- A generalized workspace registry.
- Compatibility migration from the M0 proof database.
