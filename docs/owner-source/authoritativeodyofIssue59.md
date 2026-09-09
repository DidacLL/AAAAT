# Issue #59 — Establish the User-Owned Workspace Root

## Goal

Replace the temporary M0 persistence location with AAAAT's real user-owned workspace boundary before any career, profile or document data is persisted.

After this issue, AAAAT has a durable concept of:

```text
AAAAT workspace
    =
user-selected directory
    containing
workspace database
    +
future user-owned artifacts
```

The implementation must establish that boundary without creating a generalized workspace framework.

---

## Product Outcome

A user can:

```text
launch AAAAT
    ↓
create/select a workspace directory
    ↓
AAAAT initializes that directory
    ↓
close AAAAT
    ↓
reopen AAAAT
    ↓
the same workspace is available
```

The workspace belongs to the user and remains understandable outside AAAAT.

AAAAT application configuration may remain in Electron's application-data location.

Career/workspace data must not.

---

## Workspace Shape

The initial physical workspace should remain minimal.

Recommended initial structure:

```text
<workspace>/
  workspace.sqlite
```

Do not create future directories merely because later Missions are expected to use them.

For example, do **not yet create**:

```text
documents/
artifacts/
templates/
integrations/
exports/
```

unless the current implementation genuinely requires them.

#61 should create document-related directories when documents actually exist.

---

## Workspace Identity

The workspace root is the selected directory.

Do not introduce an opaque internal workspace ID as a prerequisite unless a concrete implementation requirement demonstrates the need.

The absolute path should not become business-domain identity.

Domain objects introduced later must use their own stable IDs.

---

## Workspace Creation

Creating a workspace must:

```text
user selects/creates directory
        ↓
validate directory
        ↓
determine whether it is:
    empty/new
    existing AAAAT workspace
    incompatible/non-workspace
        ↓
initialize if new
        ↓
open SQLite
        ↓
apply migrations
        ↓
return typed workspace information
```

Initialization must be idempotent.

Opening an already initialized workspace must not recreate it or destroy existing data.

---

## Workspace Recognition

AAAAT must be able to distinguish an initialized workspace from an arbitrary folder.

Use the smallest reliable mechanism.

The SQLite database and its schema/migration metadata may provide sufficient identity.

Do not add:

```text
workspace registry service
UUID manifest
workspace metadata framework
project descriptor format
```

unless actual evidence shows they are required.

If a tiny workspace manifest is proposed, the Class C review must justify why the database itself is insufficient.

---

## Existing M0 Probe

The existing database under Electron `userData` is disposable bootstrap evidence.

Do not:

```text
migrate it
discover it
offer import
preserve compatibility
copy its metadata
```

The first real workspace starts cleanly.

---

## Application Configuration

AAAAT must remember enough application-level state to reopen or offer the previously used workspace.

This state is not career data.

A minimal application setting such as:

```text
lastWorkspacePath
```

may live under Electron's normal application-data area.

Do not create a workspace catalogue unless multiple-workspace management becomes a real product requirement.

Initial behavior may support:

```text
one last-used workspace
+
Choose another workspace
```

---

## Privilege Boundary

The renderer must not receive generic filesystem authority.

The preload API should expose user intentions rather than Node/Electron primitives.

Conceptually acceptable:

```ts
workspace.choose(): Promise<WorkspaceInfo | null>

workspace.createOrOpen(...): Promise<WorkspaceInfo>

workspace.current(): Promise<WorkspaceInfo | null>
```

The exact API should remain as small as possible.

Not acceptable:

```ts
filesystem.chooseDirectory()
filesystem.read(...)
filesystem.write(...)
workspace.execute(...)
```

The privileged main process owns:

```text
native folder dialog
filesystem validation
database opening
migration application
workspace-path persistence
```

---

## Application-Service Boundary

This issue establishes workspace infrastructure.

It does not need to invent the full application-service model for future career-domain mutations.

However, renderer IPC must call a bounded workspace operation rather than directly manipulating SQLite.

The first genuine career-domain application services begin in #60.

Do not create:

```text
WorkspaceRepository
WorkspaceManager
WorkspaceServiceFactory
GenericRepository
UnitOfWork framework
```

merely to anticipate #60.

One clear workspace module/function boundary is sufficient.

---

## Database

Reuse the M0 SQLite and migration machinery.

Do not replace:

```text
node:sqlite
existing migration mechanism
required SQLite PRAGMAs
STRICT-table policy
```

without separate architectural evidence.

`workspace.sqlite` is the database filename unless a concrete portability or platform issue requires otherwise.

---

## Error Cases

The implementation must deliberately handle at least:

```text
user cancels folder selection

selected path does not exist where existence is required

directory cannot be written

workspace.sqlite cannot be opened

existing database is not a compatible AAAAT workspace

migration fails

previously remembered workspace no longer exists
```

Failures must not partially corrupt or overwrite an existing directory.

Product messages should explain the problem without exposing raw Electron/SQLite errors as the normal UI.

---

## Symlinks and Path Canonicalization

Do not create a custom filesystem-security framework.

Use standard platform/path APIs and resolve paths consistently enough that the same workspace is not accidentally treated as several different workspaces because of trivial path representation differences.

Do not attempt to prohibit every unusual filesystem arrangement unless there is an actual security requirement.

---

## Concurrency

Do not build multi-instance workspace coordination in this issue.

AAAAT is currently a single-user local desktop application.

If two AAAAT processes opening the same workspace expose a concrete SQLite or artifact-integrity problem during testing, address the narrow observed problem.

Do not pre-build:

```text
distributed locking
lease systems
workspace server
synchronization daemon
```

---

## UI

Keep the UI focused.

Expected first-run state:

```text
AAAAT

Choose where AAAAT should keep your career workspace.

[Create workspace]
[Open existing workspace]
```

Returning state may show:

```text
AAAAT

Last workspace:
<path>

[Open workspace]
[Choose another]
```

Wording may improve, but normal users must not need to know what SQLite is.

The selected path should nevertheless be visible because local ownership is a product feature.

---

## Persistence Acceptance Tests

Automated tests must prove:

```text
new directory
→ becomes valid workspace

valid existing workspace
→ reopens without reinitialization damage

workspace
→ persists across app restart

invalid database/folder
→ rejected safely

migration failure
→ does not silently mark migration successful

cancel folder picker
→ no workspace created
```

---

## Security Acceptance Tests

Verify:

```text
renderer still has no Node authority

renderer still has no generic filesystem API

workspace operations remain allowlisted IPC

IPC sender validation remains active

workspace path cannot be used to obtain arbitrary filesystem operations
```

M0 security tests must continue passing unchanged unless an intentional contract extension requires a narrowly justified update.

---

## Runtime Acceptance

This Issue is Class C because later product data will depend on this boundary.

Before acceptance, execute at least one real packaged-desktop journey:

```text
launch packaged AAAAT
→ choose/create directory
→ initialize workspace
→ close application
→ launch again
→ reopen workspace
→ confirm SQLite state persists
```

This is an execution-heavy verification and may be routed to Codex if GitHub Actions cannot adequately prove the native folder-selection/restart behavior.

Routine implementation should remain in the normal ChatGPT/GitHub lane.

---

## Reviewer Questions

The independent Reviewer must explicitly answer:

```text
Does workspace data now belong to a user-selected directory?

Did any career data remain under Electron userData?

Was generic filesystem authority exposed to the renderer?

Was a generalized workspace/repository framework introduced?

Was unnecessary workspace metadata invented?

Can an existing workspace reopen safely?

Is the implementation small enough that #60 can build on it directly?
```

---

## Skeptical Simplifier Review

Because this is Class C, invoke the Simplifier.

It should challenge particularly:

```text
workspace classes/interfaces
manifest formats
configuration layers
path abstraction
repository patterns
multi-workspace infrastructure
filesystem wrappers
```

The preferred implementation is the smallest one that establishes a reliable durable boundary.

---

## ADR

Create one short ADR for the durable workspace decision.

It should record only:

### Context

M0 used Electron's `userData` directory as a disposable SQLite packaging proof. AAAAT's product requirements instead require user-owned, portable local data.

### Decision

AAAAT workspace data is rooted in a user-selected directory. The workspace database lives at `<workspace>/workspace.sqlite`. Application-level settings may remember the last workspace outside that directory, but career/document data belongs to the workspace.

### Consequences

- workspace data is visibly user-owned;
- backup/device-transfer work later has a natural boundary;
- VCVGenerator artifacts can later live beneath the workspace;
- renderer filesystem authority remains constrained;
- the disposable M0 database is not migrated.

### Rejected Alternatives

- Electron `userData` as permanent career storage;
- mandatory cloud/account storage;
- generalized workspace registry;
- compatibility migration from the M0 probe.

Do not turn the ADR into a full implementation specification.

---

## Explicit Non-Goals

Do not implement:

```text
canonical profile data
profile variants
documents
LaTeX
candidatures
AI
MCP
integrations
backup/restore
workspace synchronization
multiple-workspace dashboard
generic repository abstraction
ORM
generic filesystem API
cloud storage
M0 probe migration
```

Those belong elsewhere.

---

## Completion Condition

Issue #59 is complete when this statement is demonstrably true:

> **AAAAT can create and reopen a real user-owned local workspace through its normal desktop UI, with `workspace.sqlite` living inside that workspace, while preserving the secure renderer/main boundary and without introducing infrastructure beyond what that capability actually requires.**

Once merged, this workspace boundary becomes the persistence foundation consumed by #60 and should no longer be casually redesigned during profile implementation.