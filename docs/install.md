# Install AAAAT

AAAAT is intended for single-user local production. Install it in a local Python environment and keep private data outside tracked repository paths.

## Requirements

- Python 3.11 or newer.
- A local checkout of the repository.
- A virtual environment is recommended.
- `wxPython` for the desktop UI, installed through the `desktop` extra.

AAAAT does not require provider credentials during installation. Core setup is provider-agnostic.

## Linux / macOS

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .[desktop]
```

Verify the commands are available:

```bash
aaaat --version
aaaat-desktop --help
```

## Windows PowerShell

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e .[desktop]
```

If script execution is restricted, activate the environment from a shell that allows local virtualenv activation or run CLI commands through `python -m aaaat.cli`.

## Initialize local storage

```bash
aaaat init
```

By default this creates or updates local private storage under `.private/` and uses `.private/aaaat.sqlite3` for SQLite data.

To use a different local storage directory:

```bash
aaaat --storage /path/to/private-aaaat init
aaaat-desktop --storage /path/to/private-aaaat
```

For the CLI, the `--storage` flag must appear before the subcommand.

## Desktop smoke check

```bash
aaaat-desktop
```

For read-only inspection:

```bash
aaaat-desktop --read-only
```

Close the desktop window to stop the app.

## Demo seed

For local UI validation with fake data:

```bash
aaaat-seed-desktop-demo --reset --count 24
aaaat-desktop
```

## Optional test install

For development or release checks:

```bash
python -m pytest
```

## Common local checks

```bash
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat app list
aaaat-desktop --read-only
aaaat mcp-validate
```

Do not put real `.private/` data, rendered artifacts, local backups, or generated outputs into commits.
