"""AutoApplicationAgentAgnosticTracker."""

from __future__ import annotations

import importlib.abc
import sys

__all__ = ["__version__"]
__version__ = "0.1.0"


def _patch_server_fastapi(module: object) -> None:
    from .server_fastapi_actions import patch_create_app

    patch_create_app(module)


class _ServerFastApiPatchLoader(importlib.abc.Loader):
    def __init__(self, wrapped: importlib.abc.Loader) -> None:
        self.wrapped = wrapped

    def create_module(self, spec):  # type: ignore[no-untyped-def]
        create_module = getattr(self.wrapped, "create_module", None)
        if create_module is None:
            return None
        return create_module(spec)

    def exec_module(self, module):  # type: ignore[no-untyped-def]
        self.wrapped.exec_module(module)  # type: ignore[attr-defined]
        _patch_server_fastapi(module)


class _ServerFastApiPatchFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):  # type: ignore[no-untyped-def]
        if fullname != f"{__name__}.server_fastapi":
            return None
        for finder in sys.meta_path:
            if finder is self:
                continue
            find_spec = getattr(finder, "find_spec", None)
            if find_spec is None:
                continue
            spec = find_spec(fullname, path, target)
            if spec is None or spec.loader is None:
                continue
            if isinstance(spec.loader, _ServerFastApiPatchLoader):
                return spec
            spec.loader = _ServerFastApiPatchLoader(spec.loader)  # type: ignore[arg-type]
            return spec
        return None


def _install_server_fastapi_patch() -> None:
    module = sys.modules.get(f"{__name__}.server_fastapi")
    if module is not None:
        _patch_server_fastapi(module)
        return
    if not any(isinstance(finder, _ServerFastApiPatchFinder) for finder in sys.meta_path):
        sys.meta_path.insert(0, _ServerFastApiPatchFinder())


_install_server_fastapi_patch()
