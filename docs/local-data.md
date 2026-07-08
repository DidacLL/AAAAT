# Local data and backup

AAAAT is local-first. Its production target is a single user running the app on a local machine with private data stored locally.

## Default storage

The default storage path is `.private/`.

Default layout:

```text
.private/
  aaaat.sqlite3
  artifacts/
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

## Manual backup

Current backup is a manual local operation.

1. Stop `aaaat launch` or `aaaat launch --agent-api`.
2. Copy the complete private storage directory, usually `.private/`, to a private backup location.
3. Include both the SQLite database and artifact files.
4. Keep the backup outside tracked source paths.
5. Protect the backup according to your local risk model.

Example:

```bash
mkdir -p ~/private-backups/aaaat
cp -a .private ~/private-backups/aaaat/private-$(date +%Y%m%d-%H%M%S)
```

Windows PowerShell example:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\private-backups\aaaat"
Copy-Item -Recurse -Force .private "$env:USERPROFILE\private-backups\aaaat\private-$(Get-Date -Format yyyyMMdd-HHmmss)"
```

## Manual restore

1. Stop AAAAT.
2. Move the current `.private/` directory aside if you need to keep it.
3. Copy the backed-up private directory back to `.private/`, or launch with `--storage` pointing at the restored directory.
4. Start AAAAT and inspect the dashboard before making new changes.

Example:

```bash
mv .private .private-before-restore
cp -a ~/private-backups/aaaat/private-20260708-120000 .private
aaaat launch --read-only
```

## Static demo data

Static demo export is separate from private storage:

```bash
aaaat export static-demo outputs/static-demo.html
```

The static exporter reads `examples/demo_payload.json`. It must remain fake/private-safe and must not read `.private/`.

## Privacy limits

AAAAT reduces accidental over-exposure through local defaults, ignored private paths, read-only mode, static fake-data demo export, and bounded agent-compatible surfaces.

AAAAT cannot fully protect private data from software or agents that can read your filesystem, inspect `.private/`, modify the source code, use your shell privileges, or access the running local dashboard with your permissions.
