from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Mapping


_MAX_RESPONSE_BYTES = 2_000_000


def validate_loopback_endpoint(value: str) -> str:
    endpoint = str(value or "").strip().rstrip("/")
    if not endpoint:
        raise ValueError("llama.cpp server endpoint is required")
    parsed = urllib.parse.urlparse(endpoint)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("llama.cpp server endpoint must use http on an explicit loopback host")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("llama.cpp server endpoint must not include credentials, query parameters, or fragments")
    return endpoint


def task_response_json_schema(context: Mapping[str, Any]) -> dict[str, Any]:
    response_format = context.get("response_format") or {}
    required = [str(item) for item in response_format.get("required") or [] if str(item)]
    descriptions = response_format.get("schema") or {}
    properties = {
        str(key): _property_schema(str(key), str(description))
        for key, description in descriptions.items()
    }
    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }


def _property_schema(key: str, description: str) -> dict[str, Any]:
    lowered = description.lower()
    if "optional boolean" in lowered or lowered == "boolean":
        return {"type": "boolean"}
    if "optional array" in lowered or lowered == "array":
        return {"type": "array", "items": {"type": "string"}}
    if "string or object" in lowered:
        return {"anyOf": [{"type": "string"}, {"type": "object"}]}
    if key == "fields":
        return {
            "type": "object",
            "additionalProperties": {
                "anyOf": [
                    {"type": "string"},
                    {"type": "number"},
                    {"type": "boolean"},
                    {"type": "array", "items": {"type": "string"}},
                ]
            },
        }
    if "object containing" in lowered or lowered == "object":
        return {"type": "object", "additionalProperties": {"type": "string"}}
    if "string" in lowered:
        return {"type": "string"}
    return {}


def health_check(endpoint: str, timeout_seconds: int) -> dict[str, Any]:
    base = validate_loopback_endpoint(endpoint)
    request = urllib.request.Request(f"{base}/health", method="GET")
    try:
        with urllib.request.urlopen(request, timeout=min(timeout_seconds, 15)) as response:
            payload = response.read(64_000)
            status = int(getattr(response, "status", 200))
    except (OSError, urllib.error.URLError, urllib.error.HTTPError) as exc:
        return {"status": "error", "message": f"llama.cpp server health check failed: {exc}"}
    if status < 200 or status >= 300:
        return {"status": "error", "message": f"llama.cpp server health check returned HTTP {status}"}
    detail = ""
    try:
        parsed = json.loads(payload.decode("utf-8")) if payload else {}
        detail = str(parsed.get("status") or "") if isinstance(parsed, dict) else ""
    except (UnicodeDecodeError, json.JSONDecodeError):
        pass
    suffix = f" ({detail})" if detail else ""
    return {"status": "ready", "message": f"llama.cpp server is reachable at {base}{suffix}", "endpoint": base}


def chat_completion(
    endpoint: str,
    model: str,
    prompt: str,
    response_schema: Mapping[str, Any],
    timeout_seconds: int,
) -> tuple[str, dict[str, str]]:
    base = validate_loopback_endpoint(endpoint)
    schema = dict(response_schema)
    failures: list[str] = []
    envelope: dict[str, Any] | None = None
    result: dict[str, Any] | None = None

    # Current llama.cpp documents both forms. Try the explicit json_schema form
    # first, then the older json_object+schema form for build compatibility.
    for response_format in (
        {"type": "json_schema", "schema": schema},
        {"type": "json_object", "schema": schema},
    ):
        envelope, content = _request_chat_completion(
            base,
            model,
            prompt,
            response_format,
            timeout_seconds,
        )
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            failures.append(f"{response_format['type']}: {exc.msg}; content={_diagnostic_excerpt(content)}")
            continue
        if not isinstance(parsed, dict):
            failures.append(f"{response_format['type']}: assistant content was not a JSON object")
            continue
        result = parsed
        break

    if result is None or envelope is None:
        detail = " | ".join(failures) or "no structured response was returned"
        raise ValueError(f"llama.cpp assistant content is not valid structured JSON: {detail}")

    model_name = str(envelope.get("model") or model or "local")
    return json.dumps(result, ensure_ascii=False), {
        "agent_name": model_name,
        "agent_runtime": "llama.cpp-server",
        "model_provider": f"llama.cpp:{model_name}",
    }


def _request_chat_completion(
    base: str,
    model: str,
    prompt: str,
    response_format: Mapping[str, Any],
    timeout_seconds: int,
) -> tuple[dict[str, Any], str]:
    payload = {
        "model": str(model or "local"),
        "messages": [
            {
                "role": "system",
                "content": "Return only one JSON object matching the supplied schema. Do not use Markdown or explanatory text.",
            },
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "temperature": 0,
        "response_format": dict(response_format),
        "chat_template_kwargs": {"enable_thinking": False},
        "reasoning_format": "none",
    }
    request = urllib.request.Request(
        f"{base}/v1/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            raw = response.read(_MAX_RESPONSE_BYTES + 1)
            status = int(getattr(response, "status", 200))
    except urllib.error.HTTPError as exc:
        detail = exc.read(16_000).decode("utf-8", errors="replace").strip()
        raise ValueError(f"llama.cpp server returned HTTP {exc.code}: {detail[:1000]}") from exc
    except (OSError, urllib.error.URLError) as exc:
        raise ValueError(f"llama.cpp server request failed: {exc}") from exc
    if len(raw) > _MAX_RESPONSE_BYTES:
        raise ValueError("llama.cpp server response exceeded the 2 MB safety limit")
    if status < 200 or status >= 300:
        raise ValueError(f"llama.cpp server returned HTTP {status}")
    try:
        envelope = json.loads(raw.decode("utf-8"))
        content = envelope["choices"][0]["message"]["content"]
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
        raise ValueError("llama.cpp server returned an invalid chat-completion envelope") from exc
    if not isinstance(envelope, dict):
        raise ValueError("llama.cpp server returned an invalid chat-completion envelope")
    if not isinstance(content, str) or not content.strip():
        raise ValueError("llama.cpp server returned no assistant content")
    return envelope, content


def _diagnostic_excerpt(content: str) -> str:
    compact = " ".join(str(content).split())
    return repr(compact[:500])
