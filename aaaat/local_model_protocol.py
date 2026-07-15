from __future__ import annotations

import json
from typing import Any


PROTOCOL_VERSION = 1


def build_local_model_prompt(context: dict[str, Any]) -> str:
    """Build one self-contained prompt for an external local model process.

    The model receives only the already bounded task context. The prompt does not
    grant access to AAAAT storage or internal identifiers and requires one JSON
    result suitable for the existing result validator.
    """

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
    """Return exactly one top-level JSON object from noisy local CLI output.

    Local inference CLIs may emit banners, command hints, echoed prompts or timing
    lines on stdout even in single-turn mode. AAAAT accepts transport noise around
    one complete object. Nested objects belong to that result and are not counted
    separately. Multiple sequential top-level objects remain ambiguous and fail.
    """

    body = output.strip()
    if not body:
        raise ValueError("Local model returned no result")

    if body.startswith("```") and body.endswith("```"):
        lines = body.splitlines()
        if len(lines) >= 3 and lines[0].strip().lower() in {"```", "```json"} and lines[-1].strip() == "```":
            body = "\n".join(lines[1:-1]).strip()

    decoder = json.JSONDecoder()
    matches: list[dict[str, Any]] = []
    index = 0
    while index < len(body):
        start = body.find("{", index)
        if start < 0:
            break
        try:
            value, length = decoder.raw_decode(body[start:])
        except json.JSONDecodeError:
            index = start + 1
            continue
        end = start + length
        if isinstance(value, dict):
            matches.append(value)
            index = end
        else:
            index = start + 1

    if not matches:
        raise ValueError("Local model result does not contain a valid JSON object")
    if len(matches) != 1:
        raise ValueError("Local model result must contain exactly one JSON object")
    return json.dumps(matches[0], ensure_ascii=False)
