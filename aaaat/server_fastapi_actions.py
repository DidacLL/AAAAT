from __future__ import annotations

from typing import Any

from .agent_actions import get_agent_context_bundle, submit_agent_action
from .db import connect
from .security import Mode


def patch_create_app(module: Any) -> None:
    """Extend server_fastapi.create_app with action-session routes for the agent surface."""
    if getattr(module, "_agent_action_routes_patched", False):
        return
    original_create_app = module.create_app

    def create_app(storage: str = ".private", mode: Mode | str = Mode.FULL, surface: str = "dashboard") -> Any:
        app = original_create_app(storage, mode, surface)
        if surface == "agent":
            register_agent_action_routes(app)
        return app

    module.create_app = create_app
    module._agent_action_routes_patched = True


def register_agent_action_routes(app: Any) -> None:
    try:
        from fastapi import HTTPException, Request
    except ModuleNotFoundError as exc:  # pragma: no cover - exercised only without installed deps
        raise RuntimeError("FastAPI dependencies are not installed. Install AAAAT with its runtime dependencies.") from exc

    async def request_json(request: Request) -> dict[str, Any]:
        body = await request.body()
        if not body:
            return {}
        data = await request.json()
        if not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="request body must be a JSON object")
        return data

    def handle_error(exc: Exception) -> None:
        if isinstance(exc, KeyError):
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        if isinstance(exc, ValueError):
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        raise exc

    @app.post("/api/agent/context-bundle")
    async def agent_context_bundle(request: Request) -> dict[str, Any]:
        data = await request_json(request)
        try:
            with connect(app.state.storage_path) as conn:
                return get_agent_context_bundle(conn, data.get("purpose", ""))
        except Exception as exc:
            handle_error(exc)

    @app.post("/api/agent/actions")
    async def agent_action_submit(request: Request) -> dict[str, Any]:
        if app.state.mode != Mode.FULL:
            raise HTTPException(status_code=403, detail="read only")
        data = await request_json(request)
        action = {key: data[key] for key in ("action", "payload") if key in data}
        try:
            with connect(app.state.storage_path) as conn:
                return submit_agent_action(
                    conn,
                    action,
                    agent_name=data.get("agent_name", ""),
                    agent_runtime=data.get("agent_runtime", ""),
                    model_provider=data.get("model_provider", ""),
                    storage_path=app.state.storage_path,
                )
        except Exception as exc:
            handle_error(exc)
