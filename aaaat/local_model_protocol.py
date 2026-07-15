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
    """Return exactly one JSON object from possibly noisy local CLI output.

    Local inference CLIs may emit banners, command hints, echoed prompts or timing
    lines on stdout even in single-turn mode. AAAAT accepts that transport noise
    only when stdout contains exactly one complete JSON object. Zero objects,
    multiple objects, arrays and incomplete objects remain failures.
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
    seen_ranges: set[tuple[int, int]] = set()

    for start, character in enumerate(body):
        if character != "{":
            continue
        try:
            value, length = decoder.raw_decode(body[start:])
        except json.JSONDecodeError:
            continue
        end = start + length
        if not isinstance(value, dict) or (start, end) in seen_ranges:
            continue
        seen_ranges.add((start, end))
        matches.append(value)

    if not matches:
        raise ValueError("Local model result does not contain a valid JSON object")
    if len(matches) != 1:
        raise ValueError("Local model result must contain exactly one JSON object")
    return json.dumps(matches[0], ensure_ascii=False)
