# Local data and backup

AAAAT is scoped as a single-user local application. Private data is stored under `.private/` by default, or under the path passed with `--storage`.

AAAAT is local-first. Its production target is a single user running the desktop app on a local machine with private data stored locally.

## Default storage

The default storage path is `.private/`.

Default layout:

```text
.private/
  aaaat.sqlite3
  artifacts/
  backups/
```

If a storage path ending in `.db` is supplied, AAAAT treats that path as the SQLite database file. Otherwise it creates `aaaat.sqlite3` inside the supplied directory.

Examples:

```bash
aaaat init
aaaat --storage .private-work init
aaaat --storage /home/user/private-aaaat init
aaaat --storage /home/user/aaaat.db init
```

Use the same `--storage` value for later commands that should read or write that workspace.

## Schema metadata

AAAAT stores a lightweight metadata row in SQLite:

```text
schema_meta.schema_version = 1
```

This is a startup compatibility check, not a heavy migration framework.

The SQLite database is initialized idempotently. Running `aaaat init` or commands that call initialization again should not duplicate seed glossary terms, templates, or schema metadata.

## What belongs in private storage

Keep these out of tracked repository paths:

- SQLite databases;
- raw job offers;
- recruiter messages;
- profile variables;
- CV and cover-letter content;
- generated artifacts;
- notes, todos, text blobs, and task results;
- backups.

The repository ignores `.private/`, common database files, `outputs/`, `local/`, and temporary files. Do not rely only on ignore rules; check staged files before committing.

## Backup before upgrades

Run this before changing branches, upgrading the package, or doing risky local maintenance:

```bash
python -m aaaat.cli backup
```

The command creates a timestamped zip under `.private/backups/`. The archive includes:

- `aaaat.sqlite3`, copied through SQLite's backup API;
- files under `.private/artifacts/`, if present.

To write to a different private backup folder:

```bash
python -m aaaat.cli backup --output /path/to/private/backups --force
```

Without `--force`, AAAAT refuses backup targets outside the configured storage path. This avoids accidentally writing private DB or artifact copies into public/tracked project folders.

A plain directory copy is still acceptable for manual maintenance, but the CLI backup command is the preferred pre-upgrade path because it uses SQLite's backup API for the database file.

## Restore for inspection

Stop the desktop app and restore a backup into a new or empty workspace. AAAAT verifies the archive and the restored SQLite database before it writes the workspace, and it refuses to replace an existing workspace.

```bash
aaaat restore .private/backups/aaaat-backup-20260708T120000Z.zip --output .private-restored
aaaat-desktop --storage .private-restored
```

Inspect the restored workspace before choosing it as the workspace you continue to use.

Keep backup zips private. They may contain the full local job-search database and rendered artifacts.

## Demo data

Fake desktop data can be generated locally for UI validation:

```bash
aaaat-seed-desktop-demo --reset --count 24
aaaat-desktop
```

The demo seed writes fake local data to the selected storage path. Do not mix real job-search data into demo storage if you plan to share screenshots or logs.

## Privacy limits

AAAAT reduces accidental over-exposure through local defaults, ignored private paths, and bounded agent-compatible surfaces.

AAAAT cannot fully protect private data from software or agents that can read your filesystem, inspect `.private/`, modify the source code, or use your shell privileges.
