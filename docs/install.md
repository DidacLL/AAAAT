# Install AAAAT

AAAAT is intended for single-user local production. Install it in a local Python environment and keep private data outside tracked repository paths.

## Requirements

- Python 3.11 or newer.
- A local checkout of the repository.
- A virtual environment is recommended.

AAAAT does not require provider credentials during installation. Core setup is provider-agnostic.

## Linux / macOS

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .
```

Verify the command is available:

```bash
aaaat --version
python -m aaaat.cli --version
```

## Windows PowerShell

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e .
```

If script execution is restricted, activate the environment from a shell that allows local virtualenv activation or run commands through `python -m aaaat.cli`.

## Initialize local storage

```bash
aaaat init
```

By default this creates or updates local private storage under `.private/` and uses `.private/aaaat.sqlite3` for SQLite data.

To use a different local storage directory:

```bash
aaaat --storage /path/to/private-aaaat init
aaaat --storage /path/to/private-aaaat launch
```

The `--storage` flag must appear before the subcommand.

## Launch smoke check

```bash
aaaat launch
```

AAAAT prints the local URL, normally:

```text
http://127.0.0.1:8765
```

Stop the server with `Ctrl+C` in the terminal that launched it.

## Optional test install

For development or release checks:

```bash
python -m pip install -e ".[test]"
python -m pytest
python tools/repo_guard.py
```

## Common local checks

```bash
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat app list
aaaat launch --read-only
aaaat export static-demo outputs/static-demo.html
aaaat mcp-validate
```

Do not put real `.private/` data, rendered artifacts, local backups, or generated outputs into commits.
