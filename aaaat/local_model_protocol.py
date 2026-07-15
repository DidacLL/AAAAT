from __future__ import annotations

import json
from typing import Any


PROTOCOL_VERSION = 1


def build_local_model_prompt(context: dict[str, Any]) -> str:
    """Build one self-contained prompt for an external local model process."""
    envelope = {
        "protocol": "aaaat.local-task",
        "protocol_version": PROTOCOL_VERSION,
        "instructions": [
            "Perform the bounded task using only the supplied context.",
            "Return exactly one JSON object and no Markdown or explanatory text.",
            "Do not invent or request internal AAAAT identifiers.",
            "Do not choose file paths or attempt to mutate local storage.",
            "Use only result fields and actions explicitly permitted by the task context.",
            "When information is unavailable, preserve uncertainty instead of fabricating facts.",
        ],
        "task": context,
    }
    return json.dumps(envelope, ensure_ascii=False, indent=2)


def extract_json_object(output: str) -> str:
    """Return one strict JSON object, allowing only an optional JSON code fence."""
    body = output.strip()
    if not body:
        raise ValueError("Local model returned no result")
    if body.startswith("```") and body.endswith("```"):
        lines = body.splitlines()
        if len(lines) >= 3 and lines[0].strip().lower() in {"```", "```json"} and lines[-1].strip() == "```":
            body = "\n".join(lines[1:-1]).strip()
    try:
        value = json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Local model result is not valid JSON: {exc.msg}") from exc
    if not isinstance(value, dict):
        raise ValueError("Local model result must be one JSON object")
    return json.dumps(value, ensure_ascii=False)
