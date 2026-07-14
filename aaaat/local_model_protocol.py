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
    """Return one JSON object from model output or fail without guessing.

    Strict JSON is preferred. A single fenced JSON object or a single object with
    harmless surrounding whitespace is accepted because some local model chat
    templates add fences despite explicit instructions. Multiple objects, arrays,
    prose-only output, or trailing non-whitespace text are rejected.
    """

    body = output.strip()
    if not body:
        raise ValueError("Local model returned no result")

    if body.startswith("```") and body.endswith("```"):
        lines = body.splitlines()
        if len(lines) >= 3 and lines[0].strip().lower() in {"```", "```json"} and lines[-1].strip() == "```":
            body = "\n".join(lines[1:-1]).strip()

    decoder = json.JSONDecoder()
    try:
        value, end = decoder.raw_decode(body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Local model result is not valid JSON: {exc.msg}") from exc
    if body[end:].strip():
        raise ValueError("Local model result contains text after the JSON object")
    if not isinstance(value, dict):
        raise ValueError("Local model result must be one JSON object")
    return json.dumps(value, ensure_ascii=False)
