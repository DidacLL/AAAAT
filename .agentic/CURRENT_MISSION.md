# Active Mission — Minimal local ToDos

**Active:** [Issue #156](https://github.com/DidacLL/AAAAT/issues/156) on `feature/minimal-local-todos`, based on merged recovery `60cf9117609546200bc04b211fbf5750ae42d1b4`.

## Outcome

Add the smallest complete human/no-AI ToDo capability required by OWNER_INTENT and SPEC: user text/body, done/not-done state, and an optional relation to one candidature.

The complete slice includes local SQLite persistence, one explicit ToDo application service, typed preload/IPC intentions, and a minimal desktop surface to create, inspect, edit, toggle and delete ToDos. A ToDo may exist without a candidature; candidatures remain valid without ToDos.

## Boundaries

No due dates, recurrence, reminders, priority, scheduling, notifications, next-action semantics, workflow/lifecycle engine, AI task protocol, autonomous execution, generic task repository, ORM/EAV, event bus, plugin framework, or external-integration expansion.

Use the existing Electron/React/TypeScript/SQLite/application-service architecture. Keep renderer authority bounded through preload/IPC. Backup/recovery includes ToDos naturally through the authoritative workspace database; do not add a parallel store.

Expected decision class is B unless the implementation materially expands architecture beyond the explicit ToDo table/service boundary.

## Evidence and continuation

Recovery Issue #158 / PR #159 is integrated. Its verification remains reusable for unchanged surfaces. Run only impact-selected verification for this capability.

Next: implement Issue #156 end to end on the active branch, then obtain one independent Reviewer verdict before integration. Invoke Simplifier only if material complexity is introduced.
