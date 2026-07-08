"""AutoApplicationAgentAgnosticTracker."""

from __future__ import annotations

__all__ = ["__version__"]
__version__ = "0.1.0"


def _install_server_fastapi_patch() -> None:
    try:
        from . import server_fastapi
        from .server_fastapi_actions import patch_create_app
    except ModuleNotFoundError:
        return
    patch_create_app(server_fastapi)


_install_server_fastapi_patch()
