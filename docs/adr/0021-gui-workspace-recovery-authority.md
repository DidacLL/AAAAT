# ADR 0021 — Graphical workspace recovery keeps path authority in Electron main

**Status:** Accepted for Issue #187

## Context

ADR 0010 already defines AAAAT's portable workspace backup directory, integrity checks, exclusions, overlap rules and cleanup semantics. Those operations are proven through the packaged executable, but requiring command-line invocation does not satisfy AAAAT's normal graphical-access requirement for ordinary users.

The desktop recovery surface must not turn the renderer into a filesystem client or create a second backup implementation. Restore also has to switch AAAAT's current/remembered workspace only after the existing restore validation has succeeded.

## Decision

Add one bounded desktop recovery API with two no-argument intentions:

- create a workspace backup;
- restore a workspace backup.

The renderer supplies no source or destination path. Electron main owns the fixed directory dialogs. Backup requires the current workspace and delegates to `createWorkspaceBackup`. Restore asks for the backup directory and a separate destination directory, delegates to `restoreWorkspaceBackup`, reopens the restored workspace through normal workspace validation, and only then records it as the remembered/current workspace.

The renderer receives only a bounded status result. A successful restore may return the ordinary `WorkspaceInfo` already used by the desktop UI so the visible workspace state can switch immediately; recovery selection paths are never exposed as renderer-controlled inputs.

When a workspace is already open, the graphical surface confirms before switching. Unsaved-editor state is checked before the restore intention is invoked. Cancelling either dialog is a no-op. A failed restore does not change the current or remembered workspace.

The existing packaged CLI backup and restore operations remain available as technical alternatives and continue using ADR 0010 unchanged.

## Consequences

- Backup/restore becomes available through ordinary desktop controls without weakening the Electron privilege boundary.
- There is one recovery format and one pair of backup/restore services; the GUI is only another bounded caller.
- First-run/no-workspace recovery is possible without first creating or opening another workspace.
- A successful restore switches directly to the restored workspace; failure leaves the prior session selected.

This decision does not establish a generic filesystem chooser API, arbitrary path transport, archive framework, scheduled backup, cloud synchronization, restore-in-place, encryption/key management, or new migration behavior.
