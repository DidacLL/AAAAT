# Install AAAAT

AAAAT is intended for single-user local production. Install it in a local Python environment and keep private data outside tracked repository paths.

## Requirements

- Python 3.11 or newer.
- A local checkout or extracted source archive of the release.
- A virtual environment is recommended.
- `wxPython` for the desktop UI, installed through the `desktop` extra.

AAAAT does not require provider credentials during installation. Core setup is provider-agnostic.

## Linux / macOS

From the release source directory:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install .[desktop]
```

Verify the commands are available:

```bash
aaaat --version
aaaat-desktop --help
aaaat-upgrade --help
```

## Windows PowerShell

From the release source directory:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install .[desktop]
```

If script execution is restricted, activate the environment from a shell that allows local virtualenv activation or run CLI commands through `python -m aaaat.cli`.

## New local storage

```bash
aaaat init
```

By default this creates local private storage under `.private/` and uses `.private/aaaat.sqlite3` for SQLite data.

To use a different local storage directory:

```bash
aaaat --storage /path/to/private-aaaat init
aaaat-desktop --storage /path/to/private-aaaat
```

For the CLI, the `--storage` flag must appear before the subcommand.

## Existing local storage

Back up and upgrade the existing store before launching the new desktop version:

```bash
python -m aaaat.cli --storage /path/to/private-aaaat backup
aaaat-upgrade --storage /path/to/private-aaaat
aaaat-desktop --storage /path/to/private-aaaat
```

The upgrade command applies all supported v1 compatibility changes in place and can be run repeatedly. It does not replace existing candidature or artifact rows.

## Desktop smoke check

```bash
aaaat-desktop
```

Close the desktop window to stop the app.

## Demo seed

For local UI validation with fake data:

```bash
aaaat-seed-desktop-demo --reset --count 24
aaaat-desktop
```

## Development checks

```bash
python -m unittest discover -s tests
```

## Common local checks

```bash
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat app list
aaaat-desktop
aaaat mcp-validate
```

Do not put real `.private/` data, rendered artifacts, local backups, or generated outputs into commits.
