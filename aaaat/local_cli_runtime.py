from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator


@dataclass(frozen=True)
class LocalCliPreset:
    preset_id: str
    title: str
    prompt_transport: str
    executable_default: str
    runtime_label: str


@dataclass(frozen=True)
class LocalCliInvocation:
    argv: tuple[str, ...]
    input_body: str | None
    provenance: dict[str, str]


PRESETS = {
    "ollama_cli": LocalCliPreset(
        preset_id="ollama_cli",
        title="Ollama CLI",
        prompt_transport="stdin",
        executable_default="ollama",
        runtime_label="ollama-cli",
    ),
}


def local_cli_preset(adapter_id: str) -> LocalCliPreset:
    try:
        return PRESETS[adapter_id]
    except KeyError as exc:
        raise ValueError(f"Unknown local CLI preset: {adapter_id}") from exc


@contextmanager
def build_local_cli_invocation(adapter_id: str, settings: dict[str, Any], prompt: str) -> Iterator[LocalCliInvocation]:
    """Build one bounded invocation for an explicitly supported CLI compatibility adapter."""
    preset = local_cli_preset(adapter_id)
    executable = str(settings.get("executable") or preset.executable_default)
    extra_args = tuple(str(item) for item in settings.get("args") or [])
    if adapter_id == "ollama_cli":
        model = str(settings.get("model") or "").strip()
        if not model:
            raise ValueError("Local model name is not configured")
        yield LocalCliInvocation(
            argv=(executable, "run", model, *extra_args),
            input_body=prompt,
            provenance={
                "agent_name": model,
                "agent_runtime": preset.runtime_label,
                "model_provider": f"ollama:{model}",
            },
        )
        return
    raise ValueError(f"Unsupported local CLI preset: {adapter_id}")
