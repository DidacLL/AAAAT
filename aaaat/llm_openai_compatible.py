from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Mapping
from urllib import error, request

from .llm_protocol import LlmTaskRequest, LlmTaskResponse, ProtocolValidationError
from .llm_provider import ProviderCapabilities


class ProviderTransportError(RuntimeError):
    pass


@dataclass(frozen=True)
class OpenAiCompatibleConfig:
    base_url: str
    model: str
    api_key: str = ""
    timeout_seconds: float = 60.0
    extra_headers: Mapping[str, str] | None = None

    @property
    def endpoint(self) -> str:
        return self.base_url.rstrip("/") + "/v1/chat/completions"


class OpenAiCompatibleProvider:
    """Thin adapter for OpenAI-compatible chat-completions endpoints.

    The adapter owns transport translation only. Prompt/context construction,
    business validation, result application, and persistence remain in AAAAT.
    """

    name = "openai-compatible"

    def __init__(self, config: OpenAiCompatibleConfig) -> None:
        self.config = config

    def capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            structured_output=True,
            streaming=False,
            cancellation=False,
            usage_reporting=True,
            models=(self.config.model,),
            metadata={"endpoint": self.config.endpoint},
        )

    def estimate_cost(self, request_: LlmTaskRequest, *, model: str | None = None) -> Mapping[str, Any]:
        return {"currency": "unknown", "estimated": None, "model": model or self.config.model}

    def complete(self, request_: LlmTaskRequest, *, model: str | None = None) -> LlmTaskResponse:
        selected_model = model or self.config.model
        payload = {
            "model": selected_model,
            "messages": _messages_for_request(request_),
            "response_format": {"type": "json_object"},
            "stream": False,
        }
        body = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        headers.update(dict(self.config.extra_headers or {}))
        http_request = request.Request(self.config.endpoint, data=body, headers=headers, method="POST")

        try:
            with request.urlopen(http_request, timeout=self.config.timeout_seconds) as response:
                response_body = response.read().decode("utf-8")
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise ProviderTransportError(f"Provider HTTP {exc.code}: {detail}") from exc
        except error.URLError as exc:
            raise ProviderTransportError(f"Provider request failed: {exc.reason}") from exc

        try:
            provider_payload = json.loads(response_body)
            choice = provider_payload["choices"][0]
            content = choice["message"]["content"]
            result = json.loads(content) if isinstance(content, str) else content
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise ProtocolValidationError("Provider returned an invalid structured response") from exc

        usage = provider_payload.get("usage") if isinstance(provider_payload, dict) else {}
        finish_reason = str(choice.get("finish_reason") or "completed")
        return LlmTaskResponse(
            task_handle=request_.task_handle,
            result=result,
            provider=self.name,
            model=selected_model,
            finish_reason=finish_reason,
            usage=usage if isinstance(usage, Mapping) else {},
            raw_provider_metadata={
                "id": provider_payload.get("id", "") if isinstance(provider_payload, dict) else "",
                "created": provider_payload.get("created", "") if isinstance(provider_payload, dict) else "",
            },
        )


def _messages_for_request(request_: LlmTaskRequest) -> list[dict[str, str]]:
    system_payload = {
        "protocol_version": request_.protocol_version,
        "purpose": request_.purpose,
        "instructions": dict(request_.instructions),
        "response_format": dict(request_.response_format),
        "output_contract": dict(request_.output_contract),
        "privacy_notes": list(request_.privacy_notes),
    }
    user_payload = {
        "task_handle": request_.task_handle,
        "task_type": request_.task_type,
        "input_context": dict(request_.input_context),
    }
    return [
        {
            "role": "system",
            "content": "Return one JSON object only. Follow this AAAAT task contract:\n" + json.dumps(system_payload, ensure_ascii=False),
        },
        {
            "role": "user",
            "content": json.dumps(user_payload, ensure_ascii=False),
        },
    ]
