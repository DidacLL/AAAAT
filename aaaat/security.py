from __future__ import annotations

from enum import Enum


class Mode(str, Enum):
    FULL = "full"
    STATIC_DEMO = "static_demo"


MODE_SCOPES = {
    Mode.FULL: {"local_read", "local_write", "profile_read", "profile_write", "artifact_write"},
    Mode.STATIC_DEMO: {"public_demo"},
}


def has_scope(mode: Mode | str, scope: str) -> bool:
    return scope in MODE_SCOPES[Mode(mode)]


def can_write(mode: Mode | str) -> bool:
    return has_scope(mode, "local_write")


def can_show_raw_intake(mode: Mode | str) -> bool:
    return Mode(mode) == Mode.FULL
