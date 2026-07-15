from __future__ import annotations

import re

_ANSI_ESCAPE = re.compile(r"\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_SPINNER_ONLY = re.compile(r"^[\s⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏|/\\.·•-]+$")


def clean_subprocess_text(value: str, *, limit: int = 4000) -> str:
    """Return bounded readable diagnostics from terminal-oriented CLI output."""

    text = _ANSI_ESCAPE.sub("", str(value or ""))
    text = text.replace("\r", "\n")
    text = _CONTROL.sub("", text)
    lines: list[str] = []
    for raw in text.splitlines():
        line = " ".join(raw.strip().split())
        if not line or _SPINNER_ONLY.fullmatch(line):
            continue
        if lines and lines[-1] == line:
            continue
        lines.append(line)
    cleaned = "\n".join(lines[-20:]).strip()
    return cleaned[-limit:] if cleaned else ""


def subprocess_failure_message(stderr: str, stdout: str, returncode: int) -> str:
    detail = clean_subprocess_text(stderr) or clean_subprocess_text(stdout)
    if detail:
        return detail
    return f"External runtime exited with code {returncode} without a readable diagnostic"
