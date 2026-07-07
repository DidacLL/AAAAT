from __future__ import annotations

from typing import Any

from .artifacts import save_artifact, update_artifact_state
from .dashboard import render_dashboard, render_raw_offer_intake_page
from .db import (
    add_raw_intake,
    connect,
    create_application,
    create_raw_offer_intake,
    init_db,
    list_applications,
    set_profile_variable,
    update_application,
    upsert_glossary_term,
)
from .payload import application_context, dashboard_payload
from .review_queue import review_queue
from .security import Mode
from .static_export import export_static_demo


def _require_fastapi() -> tuple[Any, Any, Any, Any, Any, Any]:
    try:
        from fastapi import Depends, FastAPI, HTTPException, Request
        from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
    except ModuleNotFoundError as exc:  # pragma: no cover - exercised only without installed deps
        raise RuntimeError("FastAPI dependencies are not installed. Install AAAAT with its runtime dependencies.") from exc
    return Depends, FastAPI, HTTPException, Request, HTMLResponse, JSONResponse, RedirectResponse


def create_app(storage: str = ".private", mode: Mode | str = Mode.FULL) -> Any:
    Depends, FastAPI, HTTPException, Request, HTMLResponse, JSONResponse, RedirectResponse = _require_fastapi()
    selected_mode = Mode(mode)
    app = FastAPI(title="AAAAT", version="0.1.0")
    app.state.storage_path = storage
    app.state.mode = selected_mode

    def writable() -> None:
        if app.state.mode != Mode.FULL:
            raise HTTPException(status_code=403, detail="read only")

    async def request_data(request: Any) -> tuple[dict[str, Any], bool]:
        content_type = request.headers.get("content-type", "")
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            return {key: str(value) for key, value in form.items()}, True
        body = await request.body()
        if not body:
            return {}, False
        return await request.json(), False

    def respond(payload: dict[str, Any], status: int, is_form: bool, redirect_to: str) -> Any:
        if is_form:
            return RedirectResponse(redirect_to, status_code=303)
        return JSONResponse(payload, status_code=status)

    @app.get("/", response_class=HTMLResponse)
    def index(application_id: str | None = None, keyword: str | None = None, tab: str = "company") -> Any:
        with connect(app.state.storage_path) as conn:
            payload = dashboard_payload(conn, include_raw=app.state.mode == Mode.FULL)
        return HTMLResponse(render_dashboard(payload, app.state.mode, application_id, keyword, tab))

    @app.get("/intake", response_class=HTMLResponse)
    def intake() -> Any:
        return HTMLResponse(render_raw_offer_intake_page(app.state.mode))

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        return {"ok": True, "mode": app.state.mode.value}

    @app.get("/api/dashboard-payload")
    def api_dashboard_payload() -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return dashboard_payload(conn, include_raw=app.state.mode == Mode.FULL)

    @app.get("/api/review-queue")
    def api_review_queue(application_id: str | None = None) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            payload = dashboard_payload(conn, include_raw=False)
            return {"review_queue": review_queue(payload, application_id)}

    @app.get("/api/applications")
    def api_applications() -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return {"applications": list_applications(conn)}

    @app.post("/api/applications", dependencies=[Depends(writable)])
    async def api_create_application(request: Any) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = create_application(conn, **data)
        return respond(item, 201, is_form, f"/?application_id={item['id']}")

    @app.patch("/api/applications/{application_id}", dependencies=[Depends(writable)])
    async def api_patch_application(application_id: str, request: Any) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = update_application(conn, application_id, **data)
        return respond(item, 200, is_form, f"/?application_id={application_id}")

    @app.post("/api/applications/{application_id}", dependencies=[Depends(writable)])
    async def api_form_patch_application(application_id: str, request: Any) -> Any:
        data, is_form = await request_data(request)
        if data.get("_method", "").upper() != "PATCH":
            raise HTTPException(status_code=405, detail="method not allowed")
        with connect(app.state.storage_path) as conn:
            item = update_application(conn, application_id, **data)
        return respond(item, 200, is_form, f"/?application_id={application_id}")

    @app.post("/api/applications/{application_id}/raw-intake", dependencies=[Depends(writable)])
    async def api_raw_intake(application_id: str, request: Any) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = add_raw_intake(conn, application_id, data.get("content", ""), data.get("created_by", "agent"))
        return respond(item, 201, is_form, f"/?application_id={application_id}")

    @app.get("/api/applications/{application_id}/context")
    def api_application_context(application_id: str) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return application_context(conn, application_id)

    @app.post("/api/glossary", dependencies=[Depends(writable)])
    async def api_glossary(request: Any) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = upsert_glossary_term(conn, data.get("term", ""), data.get("definition", ""), data.get("category", ""))
        return respond(item, 201, is_form, "/")

    @app.patch("/api/profile/variables", dependencies=[Depends(writable)])
    async def api_patch_profile_variable(request: Any) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            set_profile_variable(conn, data.get("key", ""), data.get("value", ""))
        return respond({"ok": True, "key": data.get("key", "")}, 200, is_form, "/")

    @app.post("/api/profile/variables", dependencies=[Depends(writable)])
    async def api_form_patch_profile_variable(request: Any) -> Any:
        data, is_form = await request_data(request)
        if data.get("_method", "").upper() != "PATCH":
            raise HTTPException(status_code=405, detail="method not allowed")
        with connect(app.state.storage_path) as conn:
            set_profile_variable(conn, data.get("key", ""), data.get("value", ""))
        return respond({"ok": True, "key": data.get("key", "")}, 200, is_form, "/")

    @app.post("/api/artifacts", dependencies=[Depends(writable)])
    async def api_artifacts(request: Any) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = save_artifact(
                conn,
                data.get("application_id") or None,
                data.get("artifact_type", ""),
                data.get("path", ""),
                data.get("label", ""),
                source_context=data.get("source_context", "manual"),
                agent_name=data.get("agent_name", ""),
                agent_runtime=data.get("agent_runtime", ""),
                model_provider=data.get("model_provider", ""),
                review_state=data.get("review_state", "draft"),
                notes=data.get("notes", ""),
            )
        return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.patch("/api/artifacts/{artifact_id}", dependencies=[Depends(writable)])
    async def api_patch_artifact(artifact_id: str, request: Any) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = update_artifact_state(
                conn,
                artifact_id,
                data.get("review_state", "draft"),
                data.get("notes") if "notes" in data else None,
            )
        return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.post("/api/artifacts/{artifact_id}", dependencies=[Depends(writable)])
    async def api_form_patch_artifact(artifact_id: str, request: Any) -> Any:
        data, is_form = await request_data(request)
        if data.get("_method", "").upper() != "PATCH":
            raise HTTPException(status_code=405, detail="method not allowed")
        with connect(app.state.storage_path) as conn:
            item = update_artifact_state(
                conn,
                artifact_id,
                data.get("review_state", "draft"),
                data.get("notes") if "notes" in data else None,
            )
        return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.post("/api/raw-offer-intake", dependencies=[Depends(writable)])
    async def api_raw_offer_intake(request: Any) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = create_raw_offer_intake(conn, data.get("content", ""), data.get("created_by", "user") or "user")
        return respond(item, 201, is_form, f"/?application_id={item['id']}&tab=raw")

    @app.post("/api/export/static-demo", dependencies=[Depends(writable)])
    async def api_export_static_demo(request: Any) -> Any:
        data, is_form = await request_data(request)
        output = data.get("output_path", "outputs/static-demo.html")
        item = {"path": str(export_static_demo(output))}
        return respond(item, 200, is_form, "/")

    return app


def launch(storage: str = ".private", read_only: bool = False, host: str = "127.0.0.1", port: int = 8765) -> None:
    init_db(storage)
    _, _, _, _, _, _, _ = _require_fastapi()
    import uvicorn

    mode = Mode.READ_ONLY if read_only else Mode.FULL
    app = create_app(storage, mode)
    print(f"AAAAT listening on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
