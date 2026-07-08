# Local data and backup

AAAAT is scoped as a single-user local application. Private data is stored under `.private/` by default, or under the path passed with `--storage`.

Default layout:

```text
.private/
  aaaat.sqlite3
  artifacts/
  backups/
```

The SQLite database is initialized idempotently. Running `aaaat init` or commands that call initialization again should not duplicate seed glossary terms, templates, or schema metadata.

## Schema metadata

AAAAT stores a lightweight metadata row in SQLite:

```text
schema_meta.schema_version = 1
```

This is a startup compatibility check, not a migration framework. The project intentionally does not use Alembic or enterprise migration machinery for the local MVP.

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

## Manual restore

Restore is intentionally manual for now:

1. Stop the AAAAT dashboard or agent runtime.
2. Move the current `.private/aaaat.sqlite3` aside.
3. Extract `aaaat.sqlite3` from the chosen backup zip into `.private/`.
4. Extract the `artifacts/` directory from the same backup into `.private/artifacts/` if needed.
5. Run `python -m aaaat.cli init` once to verify the schema metadata and default seed rows.

Keep backup zips private. They may contain the full local job-search database and rendered artifacts.
