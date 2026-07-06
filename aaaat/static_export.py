from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .dashboard import render_dashboard
from .security import Mode


def default_demo_payload_path() -> Path:
    return Path(__file__).resolve().parent.parent / "examples" / "demo_payload.json"


def load_demo_payload(path: str | Path | None = None) -> dict[str, Any]:
    target = Path(path) if path else default_demo_payload_path()
    return json.loads(target.read_text(encoding="utf-8"))


def export_static_demo(output_path: str | Path, payload_path: str | Path | None = None) -> Path:
    payload = load_demo_payload(payload_path)
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render_dashboard(payload, Mode.STATIC_DEMO), encoding="utf-8")
    return target
