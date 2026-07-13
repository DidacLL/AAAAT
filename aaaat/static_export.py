from __future__ import annotations

from pathlib import Path


REMOVED_STATIC_EXPORT_MESSAGE = (
    "AAAAT v1 does not include a browser/static demo export. "
    "Use the installed wx desktop launcher for the canonical local workflow."
)


def export_static_demo(output: str | Path) -> Path:
    del output
    raise RuntimeError(REMOVED_STATIC_EXPORT_MESSAGE)
