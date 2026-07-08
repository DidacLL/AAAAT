from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import Request

from .agent_actions import get_agent_context_bundle, submit_agent_action
from .agent_access import (
    build_agent_task_context,
    claim_agent_task,
    list_agent_task_envelopes,
    release_agent_task,
    submit_agent_task_result,
)
from .candidatures import create_candidature, update_candidature
from .dashboard import render_dashboard as render_legacy_dashboard
from .dashboard import render_raw_offer_intake_page
from .dashboard_views import dashboard_view_model, render_dashboard_fragment, render_dashboard_view
from .db import connect, init_db, set_profile_variable
from .notes import create_note
from .payload import dashboard_payload
from .profile_facts import archive_profile_fact, create_profile_fact, update_profile_fact
from .security import Mode
from .static_export import export_static_demo
from .tasks import apply_task_result, complete_task, create_task
from .templates import render_document_artifact, safe_artifact_output_path
from .text_blobs import create_text_blob, list_text_blobs, update_text_blob
from .todos import create_todo


def _require_fastapi() -> tuple[Any, Any, Any, Any, Any, Any, Any, Any]:
    try:
        from fastapi import Depends, FastAPI, HTTPException, Request
        from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
        from fastapi.staticfiles import StaticFiles
    except ModuleNotFoundError as exc:  # pragma: no cover - exercised only without installed deps
        raise RuntimeError("FastAPI dependencies are not installed. Install AAAAT with its runtime dependencies.") from exc
    return Depends, FastAPI, HTTPException, Request, HTMLResponse, JSONResponse, RedirectResponse, StaticFiles


def create_app(storage: str = ".private", mode: Mode | str = Mode.FULL, surface: str = "dashboard") -> Any:
    Depends, FastAPI, HTTPException, Request, HTMLResponse, JSONResponse, RedirectResponse, StaticFiles = _require_fastapi()
    selected_mode = Mode(mode)
    if surface not in {"dashboard", "agent"}:
        raise ValueError(f"Invalid surface: {surface}")
    app = FastAPI(
        title="AAAAT",
        version="0.1.0",
        docs_url=None if surface == "dashboard" else "/docs",
        redoc_url=None,
        openapi_url=None if surface == "dashboard" else "/openapi.json",
    )
    app.state.storage_path = storage
    app.state.mode = selected_mode
    app.state.surface = surface

    def writable() -> None:
        if app.state.mode != Mode.FULL:
            raise HTTPException(status_code=403, detail="read only")

    async def request_data(request: Request) -> tuple[dict[str, Any], bool]:
        content_type = request.headers.get("content-type", "")
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            return {key: str(value) for key, value in form.items()}, True
        body = await request.body()
        if not body:
            return {}, False
        data = await request.json()
        if not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="request body must be a JSON object")
        return data, False

    def respond(payload: dict[str, Any], status: int, is_form: bool, redirect_to: str) -> Any:
        if is_form or app.state.surface == "dashboard":
            return RedirectResponse(redirect_to, status_code=303)
        return JSONResponse(payload, status_code=status)

    def wants_fragment(request: Request) -> bool:
        return request.headers.get("HX-Request", "").lower() == "true"

    def bool_field(data: dict[str, Any], key: str) -> bool:
        return str(data.get(key, "")).lower() in {"1", "true", "yes", "on"}

    def bool_field_default(data: dict[str, Any], key: str, default: bool) -> bool:
        if key not in data:
            return default
        return bool_field(data, key)

    def keyword_list(value: Any) -> list[str]:
        if isinstance(value, str):
            return [term.strip() for term in value.split(",") if term.strip()]
        return [str(term).strip() for term in (value or []) if str(term).strip()]

    def handle_error(exc: Exception) -> None:
        if isinstance(exc, KeyError):
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        if isinstance(exc, ValueError):
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        raise exc

    def make_view_model(
        conn: Any,
        *,
        view: str | None = None,
        application_id: str | None = None,
        keyword: str | None = None,
        q: str | None = None,
    ) -> dict[str, Any]:
        payload = dashboard_payload(conn, include_raw=app.state.mode == Mode.FULL)
        return dashboard_view_model(
            payload,
            app.state.mode,
            view=view,
            selected_application_id=application_id,
            selected_keyword=keyword,
            search_query=q,
            conn=conn,
        )

    def profile_fact_fields(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
        fields = {
            key: data[key]
            for key in {
                "fact_type",
                "title",
                "body",
                "tags",
                "visibility",
                "exposure",
                "source",
                "review_state",
                "notes",
            }
            if key in data
        }
        if "type" in data:
            fields["fact_type"] = data["type"]
        for key in {
            "use_for_cv",
            "use_for_cover_letter",
            "use_for_agent_context",
            "use_for_market_research",
            "use_for_dashboard",
        }:
            if key in data or not partial:
                fields[key] = bool_field(data, key)
        return fields

    def register_agent_routes() -> None:
        @app.get("/api/health")
        def agent_health() -> dict[str, Any]:
            return {"ok": True, "mode": app.state.mode.value, "surface": app.state.surface}

        @app.get("/api/agent/tasks")
        def agent_tasks(state: str | None = None, limit: int | None = None) -> dict[str, Any]:
            with connect(app.state.storage_path) as conn:
                return {"tasks": list_agent_task_envelopes(conn, state=state, limit=limit)}

        @app.get("/api/agent/tasks/{task_id}/context")
        def agent_task_context(task_id: str) -> dict[str, Any]:
            try:
                with connect(app.state.storage_path) as conn:
                    return build_agent_task_context(conn, task_id)
            except Exception as exc:
                handle_error(exc)

        @app.post("/api/agent/context-bundle")
        async def agent_context_bundle(request: Request) -> dict[str, Any]:
            data, _ = await request_data(request)
            try:
                with connect(app.state.storage_path) as conn:
                    return get_agent_context_bundle(conn, data.get("purpose", ""))
            except Exception as exc:
                handle_error(exc)

        @app.post("/api/agent/actions", dependencies=[Depends(writable)])
        async def agent_submit_action(request: Request) -> dict[str, Any]:
            data, _ = await request_data(request)
            packet = {"action": data.get("action"), "payload": data.get("payload", {})}
            try:
                with connect(app.state.storage_path) as conn:
                    return submit_agent_action(
                        conn,
                        packet,
                        agent_name=data.get("agent_name", ""),
                        agent_runtime=data.get("agent_runtime", ""),
                        model_provider=data.get("model_provider", ""),
                        storage_path=app.state.storage_path,
                    )
            except Exception as exc:
                handle_error(exc)

        @app.post("/api/agent/tasks/{task_id}/claim", dependencies=[Depends(writable)])
        async def agent_claim_task(task_id: str, request: Request) -> Any:
            data, _ = await request_data(request)
            try:
                with connect(app.state.storage_path) as conn:
                    return claim_agent_task(conn, task_id, agent_name=data.get("agent_name", ""), agent_runtime=data.get("agent_runtime", ""))
            except Exception as exc:
                handle_error(exc)

        @app.post("/api/agent/tasks/{task_id}/result", dependencies=[Depends(writable)])
        async def agent_submit_result(task_id: str, request: Request) -> Any:
            data, _ = await request_data(request)
            try:
                with connect(app.state.storage_path) as conn:
                    return submit_agent_task_result(
                        conn,
                        task_id,
                        data.get("result_body", ""),
                        result_title=data.get("result_title", ""),
                        agent_name=data.get("agent_name", ""),
                        agent_runtime=data.get("agent_runtime", ""),
                        model_provider=data.get("model_provider", ""),
                        artifact_id=data.get("artifact_id") or None,
                    )
            except Exception as exc:
                handle_error(exc)

        @app.post("/api/agent/tasks/{task_id}/release", dependencies=[Depends(writable)])
        async def agent_release_task(task_id: str) -> dict[str, Any]:
            try:
                with connect(app.state.storage_path) as conn:
                    return release_agent_task(conn, task_id)
            except Exception as exc:
                handle_error(exc)

    def register_dashboard_routes() -> None:
        app.mount("/static", StaticFiles(directory=Path(__file__).with_name("static")), name="static")

        @app.get("/api/health")
        def health() -> dict[str, Any]:
            return {"ok": True, "mode": app.state.mode.value, "surface": app.state.surface}

        @app.get("/", response_class=HTMLResponse)
        def index(
            application_id: str | None = None,
            keyword: str | None = None,
            tab: str = "company",
            view: str | None = None,
            renderer: str | None = None,
            q: str | None = None,
        ) -> Any:
            with connect(app.state.storage_path) as conn:
                payload = dashboard_payload(conn, include_raw=app.state.mode == Mode.FULL)
                if renderer == "legacy":
                    return HTMLResponse(render_legacy_dashboard(payload, app.state.mode, application_id, keyword, tab))
                model = dashboard_view_model(
                    payload,
                    app.state.mode,
                    view=view,
                    selected_application_id=application_id,
                    selected_keyword=keyword,
                    search_query=q,
                    conn=conn,
                )
            return HTMLResponse(render_dashboard_view(payload, app.state.mode, view_model=model))

        @app.get("/legacy", response_class=HTMLResponse)
        def legacy(application_id: str | None = None, keyword: str | None = None, tab: str = "company") -> Any:
            with connect(app.state.storage_path) as conn:
                payload = dashboard_payload(conn, include_raw=app.state.mode == Mode.FULL)
            return HTMLResponse(render_legacy_dashboard(payload, app.state.mode, application_id, keyword, tab))

        @app.get("/dashboard/fragments/{fragment}", response_class=HTMLResponse)
        def dashboard_fragment(
            fragment: str,
            application_id: str | None = None,
            keyword: str | None = None,
            view: str | None = None,
            q: str | None = None,
        ) -> Any:
            try:
                with connect(app.state.storage_path) as conn:
                    model = make_view_model(conn, view=view, application_id=application_id, keyword=keyword, q=q)
                return HTMLResponse(render_dashboard_fragment(fragment, model))
            except Exception as exc:
                handle_error(exc)

        @app.get("/intake", response_class=HTMLResponse)
        def intake() -> Any:
            return HTMLResponse(render_raw_offer_intake_page(app.state.mode))

        @app.post("/dashboard/actions/raw-offer-intake", dependencies=[Depends(writable)])
        async def dashboard_raw_offer_intake(request: Request) -> Any:
            data, is_form = await request_data(request)
            fields = {
                "company": data.get("company") or "Pending extraction",
                "role": data.get("role") or "Pending role",
                "status": data.get("status") or "intake",
                "priority": data.get("priority") or "normal",
                "next_action": "Extract raw offer details",
                "raw_offer": data.get("content", ""),
                "created_by": data.get("created_by", "user") or "user",
                "include_cv_task": bool_field(data, "include_cv_task"),
                "include_cover_letter_task": bool_field(data, "include_cover_letter_task"),
                "include_form_responses_task": bool_field(data, "include_form_responses_task"),
                "include_field_inference_task": bool_field_default(data, "include_field_inference_task", True),
                "include_company_research_task": bool_field_default(data, "include_company_research_task", True),
                "include_keyword_detection_task": bool_field_default(data, "include_keyword_detection_task", True),
            }
            for key in ("source", "source_url", "location"):
                if data.get(key):
                    fields[key] = data[key]
            if data.get("keywords"):
                fields["keywords"] = keyword_list(data["keywords"])
            with connect(app.state.storage_path) as conn:
                item = create_candidature(conn, **fields)
                if wants_fragment(request):
                    model = make_view_model(conn, view="detailedView", application_id=item["id"])
                    return HTMLResponse(render_dashboard_fragment("inspector", model))
            return respond(item, 201, is_form, f"/?application_id={item['id']}&tab=raw")

        @app.post("/dashboard/actions/candidatures/{candidature_id}", dependencies=[Depends(writable)])
        async def dashboard_patch_candidature(candidature_id: str, request: Request) -> Any:
            data, is_form = await request_data(request)
            if data.get("_method", "").upper() != "PATCH":
                raise HTTPException(status_code=405, detail="method not allowed")
            update_fields = {
                key: data[key]
                for key in {
                    "description",
                    "salary_expectation",
                    "publication_date",
                    "application_date",
                    "raw_application_form",
                    "strengths",
                    "questions_to_ask",
                    "tech_stack",
                    "valuation",
                }
                if key in data
            }
            with connect(app.state.storage_path) as conn:
                item = update_candidature(conn, candidature_id, **update_fields)
                if wants_fragment(request):
                    model = make_view_model(conn, view=data.get("view") or "detailedView", application_id=candidature_id)
                    return HTMLResponse(render_dashboard_fragment("selected-card", model))
            return respond(item, 200, is_form, f"/?view=detailedView&application_id={candidature_id}")

        @app.post("/dashboard/actions/notes", dependencies=[Depends(writable)])
        async def dashboard_create_note(request: Request) -> Any:
            data, is_form = await request_data(request)
            with connect(app.state.storage_path) as conn:
                item = create_note(
                    conn,
                    data.get("body", ""),
                    application_id=data.get("application_id") or None,
                    note_type=data.get("note_type", "general"),
                    created_by=data.get("created_by", "user"),
                )
            return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

        @app.post("/dashboard/actions/todos", dependencies=[Depends(writable)])
        async def dashboard_create_todo(request: Request) -> Any:
            data, is_form = await request_data(request)
            with connect(app.state.storage_path) as conn:
                item = create_todo(
                    conn,
                    data.get("title", ""),
                    application_id=data.get("application_id") or None,
                    body=data.get("body", ""),
                    state=data.get("state", "open"),
                    pinned=bool_field(data, "pinned"),
                    due_at=data.get("due_at", ""),
                )
            return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

        @app.post("/dashboard/actions/tasks", dependencies=[Depends(writable)])
        async def dashboard_create_task(request: Request) -> Any:
            data, is_form = await request_data(request)
            with connect(app.state.storage_path) as conn:
                item = create_task(
                    conn,
                    data.get("task_type", "manual"),
                    data.get("title", "Task"),
                    application_id=data.get("application_id") or None,
                    instructions=data.get("instructions", ""),
                    state=data.get("state", "queued"),
                    priority=data.get("priority", "normal"),
                    context_hint=data.get("context_hint", ""),
                    created_by=data.get("created_by", "user"),
                    notes=data.get("notes", ""),
                )
            return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

        @app.post("/dashboard/actions/tasks/{task_id}/complete", dependencies=[Depends(writable)])
        async def dashboard_complete_task(task_id: str, request: Request) -> Any:
            data, is_form = await request_data(request)
            with connect(app.state.storage_path) as conn:
                item = complete_task(
                    conn,
                    task_id,
                    result_body=data.get("result_body", ""),
                    result_title=data.get("result_title", ""),
                    artifact_id=data.get("artifact_id") or None,
                    agent_name=data.get("agent_name", ""),
                    agent_runtime=data.get("agent_runtime", ""),
                )
            return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

        @app.post("/dashboard/actions/tasks/{task_id}/apply", dependencies=[Depends(writable)])
        async def dashboard_apply_task(task_id: str, request: Request) -> Any:
            _, is_form = await request_data(request)
            with connect(app.state.storage_path) as conn:
                item = apply_task_result(conn, task_id)
            return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

        @app.post("/dashboard/actions/render/cv", dependencies=[Depends(writable)])
        async def dashboard_render_cv(request: Request) -> Any:
            data, is_form = await request_data(request)
            application_id = data.get("application_id", "")
            output = safe_artifact_output_path(app.state.storage_path, application_id, "cv", data.get("output_path") or None)
            with connect(app.state.storage_path) as conn:
                item = render_document_artifact(
                    conn,
                    "cv",
                    output,
                    application_id,
                    compile_pdf=bool_field(data, "compile_pdf"),
                    save_version=bool_field(data, "save_version"),
                )
            return respond(item, 200, is_form, f"/?view=detailedView&application_id={application_id}")

        @app.post("/dashboard/actions/render/cover-letter", dependencies=[Depends(writable)])
        async def dashboard_render_cover_letter(request: Request) -> Any:
            data, is_form = await request_data(request)
            application_id = data.get("application_id", "")
            extra = {"artifact.cover_letter.body": data.get("body", "Draft body pending review.")}
            if data.get("body_tex"):
                extra["artifact.cover_letter.body_tex"] = data["body_tex"]
            output = safe_artifact_output_path(app.state.storage_path, application_id, "cover-letter", data.get("output_path") or None)
            with connect(app.state.storage_path) as conn:
                item = render_document_artifact(
                    conn,
                    "cover-letter",
                    output,
                    application_id,
                    extra,
                    compile_pdf=bool_field(data, "compile_pdf"),
                    save_version=bool_field(data, "save_version"),
                )
            return respond(item, 200, is_form, f"/?view=detailedView&application_id={application_id}")

        @app.post("/dashboard/actions/profile/facts", dependencies=[Depends(writable)])
        async def dashboard_create_profile_fact(request: Request) -> Any:
            data, is_form = await request_data(request)
            with connect(app.state.storage_path) as conn:
                item = create_profile_fact(conn, **profile_fact_fields(data))
                if wants_fragment(request):
                    model = make_view_model(conn)
                    return HTMLResponse(render_dashboard_fragment("inspector", model))
            return respond(item, 201, is_form, "/")

        @app.post("/dashboard/actions/profile/facts/{fact_id}", dependencies=[Depends(writable)])
        async def dashboard_patch_profile_fact(fact_id: str, request: Request) -> Any:
            data, is_form = await request_data(request)
            if data.get("_method", "").upper() != "PATCH":
                raise HTTPException(status_code=405, detail="method not allowed")
            with connect(app.state.storage_path) as conn:
                item = update_profile_fact(conn, fact_id, **profile_fact_fields(data, partial=True))
                if wants_fragment(request):
                    model = make_view_model(conn)
                    return HTMLResponse(render_dashboard_fragment("inspector", model))
            return respond(item, 200, is_form, "/")

        @app.post("/dashboard/actions/profile/facts/{fact_id}/archive", dependencies=[Depends(writable)])
        async def dashboard_archive_profile_fact(fact_id: str, request: Request) -> Any:
            _, is_form = await request_data(request)
            with connect(app.state.storage_path) as conn:
                item = archive_profile_fact(conn, fact_id)
                if wants_fragment(request):
                    model = make_view_model(conn)
                    return HTMLResponse(render_dashboard_fragment("inspector", model))
            return respond(item, 200, is_form, "/")

        @app.post("/dashboard/actions/profile/variables", dependencies=[Depends(writable)])
        async def dashboard_patch_profile_variable(request: Request) -> Any:
            data, is_form = await request_data(request)
            if data.get("_method", "").upper() != "PATCH":
                raise HTTPException(status_code=405, detail="method not allowed")
            with connect(app.state.storage_path) as conn:
                set_profile_variable(conn, data.get("key", ""), data.get("value", ""))
            return respond({"ok": True, "key": data.get("key", "")}, 200, is_form, "/")

        @app.post("/dashboard/actions/text-blobs", dependencies=[Depends(writable)])
        async def dashboard_create_text_blob(request: Request) -> Any:
            data, is_form = await request_data(request)
            with connect(app.state.storage_path) as conn:
                item = create_text_blob(
                    conn,
                    data.get("blob_type", "note"),
                    data.get("body", ""),
                    application_id=data.get("application_id") or None,
                    title=data.get("title", ""),
                    source_context=data.get("source_context", ""),
                    review_state=data.get("review_state", "draft"),
                    created_by=data.get("created_by", "user"),
                    agent_name=data.get("agent_name", ""),
                    agent_runtime=data.get("agent_runtime", ""),
                    model_provider=data.get("model_provider", ""),
                    notes=data.get("notes", ""),
                )
            return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

        @app.post("/dashboard/actions/user-view", dependencies=[Depends(writable)])
        async def dashboard_user_view(request: Request) -> Any:
            data, is_form = await request_data(request)
            application_id = data.get("application_id", "")
            source_context = f"candidature:{application_id}:user_view"
            with connect(app.state.storage_path) as conn:
                existing = next(
                    (
                        blob
                        for blob in list_text_blobs(conn, application_id)
                        if blob.get("blob_type") == "user_view" and blob.get("source_context") == source_context
                    ),
                    None,
                )
                if existing:
                    item = update_text_blob(
                        conn,
                        existing["id"],
                        title=data.get("title", "User view"),
                        body=data.get("body", ""),
                        review_state="draft",
                    )
                else:
                    item = create_text_blob(
                        conn,
                        "user_view",
                        data.get("body", ""),
                        application_id=application_id,
                        title=data.get("title", "User view"),
                        source_context=source_context,
                        review_state="draft",
                        created_by="user",
                    )
                if wants_fragment(request):
                    model = make_view_model(conn, view="userView", application_id=application_id)
                    return HTMLResponse(render_dashboard_fragment("selected-card", model))
            return respond(item, 200, is_form, f"/?view=userView&application_id={application_id}")

        @app.post("/dashboard/actions/export/static-demo", dependencies=[Depends(writable)])
        async def dashboard_export_static_demo(request: Request) -> Any:
            data, is_form = await request_data(request)
            output = data.get("output_path", "outputs/static-demo.html")
            item = {"path": str(export_static_demo(output))}
            return respond(item, 200, is_form, "/")

    if surface == "agent":
        register_agent_routes()
    else:
        register_dashboard_routes()
    return app


def launch(
    storage: str = ".private",
    read_only: bool = False,
    host: str = "127.0.0.1",
    port: int = 8765,
    agent_api: bool = False,
) -> None:
    init_db(storage)
    _, _, _, _, _, _, _, _ = _require_fastapi()
    import uvicorn

    mode = Mode.READ_ONLY if read_only else Mode.FULL
    surface = "agent" if agent_api else "dashboard"
    app = create_app(storage, mode, surface=surface)
    print(f"AAAAT {surface} listening on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
