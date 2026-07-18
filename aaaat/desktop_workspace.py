"""App-owned workspace selection for the desktop runtime.

This deliberately sits apart from :mod:`aaaat.workspace_config`: that module
stores settings *inside* a selected workspace.  The desktop needs one small
piece of app-owned state before a workspace exists, so it never invents a
``.private`` directory beside whichever process happened to launch it.
"""

from __future__ import annotations

import json
import os
import sys
from collections.abc import Mapping
from pathlib import Path


APP_CONFIG_DIR_ENV = "AAAAT_APP_CONFIG_DIR"
APP_DIRECTORY_NAME = "AAAAT"
CONFIG_FILENAME = "desktop-workspace.json"
DEFAULT_WORKSPACE_NAME = "Workspace"


def _is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def desktop_app_directory(environ: Mapping[str, str] | None = None) -> Path:
    """Return AAAAT's per-user app-data directory without creating it.

    ``AAAAT_APP_CONFIG_DIR`` is intentionally supported for packaged-runtime
    tests and support deployments.  It is an application setting, not a
    workspace location exposed through AI-facing protocols.
    """

    values = os.environ if environ is None else environ
    override = values.get(APP_CONFIG_DIR_ENV, "").strip()
    if override:
        return Path(override).expanduser()

    if sys.platform.startswith("win"):
        root = values.get("LOCALAPPDATA") or values.get("APPDATA")
        if root:
            return Path(root) / APP_DIRECTORY_NAME
    elif sys.platform == "darwin":
        return Path(values.get("HOME") or Path.home()) / "Library" / "Application Support" / APP_DIRECTORY_NAME
    else:
        root = values.get("XDG_DATA_HOME")
        if root:
            return Path(root) / APP_DIRECTORY_NAME
        home = values.get("HOME")
        if home:
            return Path(home) / ".local" / "share" / APP_DIRECTORY_NAME

    return Path.home() / ".local" / "share" / APP_DIRECTORY_NAME


def desktop_workspace_config_path(environ: Mapping[str, str] | None = None) -> Path:
    return desktop_app_directory(environ) / CONFIG_FILENAME


def default_desktop_workspace(environ: Mapping[str, str] | None = None) -> Path:
    """Return the first-run suggestion, always beneath per-user app data."""

    return desktop_app_directory(environ) / DEFAULT_WORKSPACE_NAME


def selected_desktop_workspace(environ: Mapping[str, str] | None = None) -> Path | None:
    """Read the selected workspace, returning ``None`` before first launch."""

    config_path = desktop_workspace_config_path(environ)
    if not config_path.exists():
        return None
    try:
        payload = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    candidate = payload.get("workspace") if isinstance(payload, dict) else None
    if not isinstance(candidate, str) or not candidate.strip():
        return None
    return Path(candidate).expanduser()


def save_desktop_workspace(workspace: str | Path, environ: Mapping[str, str] | None = None) -> Path:
    """Persist one selected workspace and ensure its directory exists."""

    target = Path(workspace).expanduser().resolve()
    forbidden_roots = (Path.cwd().resolve(), Path(__file__).resolve().parents[1])
    if any(_is_within(target, root) for root in forbidden_roots):
        raise ValueError("Choose a workspace outside the application and the folder used to launch AAAAT.")
    target.mkdir(parents=True, exist_ok=True)
    config_path = desktop_workspace_config_path(environ)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps({"workspace": str(target)}, indent=2) + "\n", encoding="utf-8")
    return target


def resolve_desktop_workspace(environ: Mapping[str, str] | None = None) -> Path:
    """Resolve the persisted workspace or create the first-run default.

    The wx launcher asks the user to confirm/change this default before it
    calls this function on a first run.  Keeping this pure-ish resolver usable
    without wx also makes installed-runtime behaviour directly testable.
    """

    selected = selected_desktop_workspace(environ)
    try:
        return save_desktop_workspace(selected or default_desktop_workspace(environ), environ)
    except ValueError:
        return save_desktop_workspace(default_desktop_workspace(environ), environ)
