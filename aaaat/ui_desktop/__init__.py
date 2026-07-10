"""Local desktop UI adapter for AAAAT.

The package is intentionally isolated from domain, storage, projection, and agent
runtime code. Importing this package must not require wxPython; the concrete wx
adapter is loaded only when the desktop app is launched.
"""

from .app import launch_desktop_dashboard

__all__ = ["launch_desktop_dashboard"]
