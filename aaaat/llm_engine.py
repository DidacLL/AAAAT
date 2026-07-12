from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from .llm_protocol import (
    LlmTaskRequest,
    LlmTaskResponse,
    request_from_agent_context,
    validate_llm_task_response,
)
from .llm_provider import LlmProvider, ProviderCapabilities


@dataclass(frozen=True)
class LlmExecution:
    request: LlmTaskRequest
    response: LlmTaskResponse
    capabilities: ProviderCapabilities
    estimated_cost: Mapping[str, Any]


class LlmConversationEngine:
    """Provider-neutral execution boundary for one bounded AAAAT task.

    The engine accepts an already-scoped agent context, invokes a provider, and
    validates the structured response. It never writes AAAAT storage directly.
    """

    def __init__(self, provider: LlmProvider) -> None:
        self.provider = provider

    def execute_agent_context(
        self,
        context: Mapping[str, Any],
        *,
        model: str | None = None,
    ) -> LlmExecution:
        request = request_from_agent_context(context)
        request.to_dict()
        capabilities = self.provider.capabilities()
        if not capabilities.structured_output:
            raise ValueError(f"Provider {self.provider.name} does not support structured output")
        estimated_cost = dict(self.provider.estimate_cost(request, model=model))
        response = self.provider.complete(request, model=model)
        validate_llm_task_response(response.to_dict(), request=request)
        return LlmExecution(
            request=request,
            response=response,
            capabilities=capabilities,
            estimated_cost=estimated_cost,
        )
