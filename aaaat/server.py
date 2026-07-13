from __future__ import annotations


REMOVED_HTTP_RUNTIME_MESSAGE = (
    "AAAAT v1 uses the wx desktop runtime only. "
    "HTTP/browser serving has been removed; run `aaaat-desktop` instead."
)


def launch(
    storage: str = ".private",
    read_only: bool = False,
    host: str = "127.0.0.1",
    port: int = 8765,
    agent_api: bool = False,
) -> None:
    del storage, read_only, host, port, agent_api
    raise RuntimeError(REMOVED_HTTP_RUNTIME_MESSAGE)
