from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol

from .llm_protocol import LlmTaskRequest, LlmTaskResponse


@dataclass(frozen=True)
class ProviderCapabilities:
    structured_output: bool = True
    streaming: bool = False
    cancellation: bool = False
    usage_reporting: bool = False
    models: tuple[str, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)


class LlmProvider(Protocol):
    """Minimal provider adapter contract.

    Adapters translate the AAAAT protocol to provider requests and back. They do
    not assemble candidature context, validate business fields, or write storage.
    """

    @property
    def name(self) -> str:
        ...

    def capabilities(self) -> ProviderCapabilities:
        ...

    def complete(self, request: LlmTaskRequest, *, model: str | None = None) -> LlmTaskResponse:
        ...

    def estimate_cost(self, request: LlmTaskRequest, *, model: str | None = None) -> Mapping[str, Any]:
        return {}
