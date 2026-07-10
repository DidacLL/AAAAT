"""Local desktop UI adapter for AAAAT.

Importing this package must not import wxPython or eagerly import the executable
`aaaat.ui_desktop.app` module. That keeps `python -m aaaat.ui_desktop.app`
free from runpy double-import warnings and keeps non-desktop workflows light.
"""

__all__ = ["launch_desktop_dashboard"]


def __getattr__(name: str):
    if name == "launch_desktop_dashboard":
        from .app import launch_desktop_dashboard

        return launch_desktop_dashboard
    raise AttributeError(name)
