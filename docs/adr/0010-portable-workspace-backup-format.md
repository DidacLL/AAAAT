# ADR 0010 — Portable workspace backup format

## Context

M4 requires user-owned backup and restore without introducing cloud sync, a scheduled daemon, an archive framework, encryption/key management, or generic filesystem authority. A live AAAAT workspace uses SQLite WAL mode and also contains user-owned documents, artifacts, templates/configuration, integrations, and exports.

## Decision

AAAAT backup is a transparent directory format with three parts:

- `workspace.sqlite`, created with Node's supported `node:sqlite` backup API;
- `files/`, containing regular non-secret workspace files under their original relative paths;
- `manifest.json`, versioned as `aaaat-workspace-backup` format 1 and containing creation time, relative paths, sizes, SHA-256 hashes, migration metadata, and declared exclusions.

The portable manifest never stores absolute source, destination, executable, or machine paths. `ai-connection.json`, SQLite WAL/SHM sidecars, `.env` material, common private-key/certificate files, symbolic links, and special files are excluded by default.

Restore accepts only an existing empty destination. Before copying anything, it validates the strict manifest, lexical relative paths, regular-file and no-symlink path components, payload hashes/sizes, SQLite integrity, and migration history compatibility. Source and destination must not overlap or nest. The source paths are checked again immediately before copying, and any activation failure removes copied destination state. A successful restore must open through normal workspace logic.

The packaged executable exposes only two fixed operations:

```text
AAAAT --workspace-backup --workspace <existing-workspace> --destination <empty-backup-directory>
AAAAT --workspace-restore --backup <backup-directory> --destination <empty-workspace-directory>
```

## Consequences

- Backup is consistent with live WAL-backed workspaces without raw-copy assumptions.
- The format remains inspectable, dependency-free, and user-owned.
- Restore treats backups as untrusted input and does not follow symbolic links or traversal paths.
- Valid existing migration prefixes remain compatible through the established workspace migration validator.
- Configuration containing current or future credentials remains excluded unless a later demonstrated requirement deliberately changes the format.

## Alternatives rejected

- Raw copying `workspace.sqlite`: unsafe for a live WAL-backed database.
- ZIP/archive libraries: unnecessary for the required portable recovery semantics.
- Cloud synchronization or scheduled backup services: outside M4 and unnecessary for manual ownership.
- Generic filesystem export/import APIs: broaden authority beyond workspace recovery.
- Encryption/key-management infrastructure: no current product requirement and would add credential lifecycle complexity.
- Restoring symbolic links: allows path-bound external state and undermines containment guarantees.
