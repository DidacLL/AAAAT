from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import Request

from .agent_access import (
    build_agent_task_context,
    claim_agent_task,
    list_agent_task_envelopes,
    release_agent_task,
    submit_agent_task_result,
)
from .agent_intake import agent_intake_raw_offer, agent_submit_structured_extraction
from .artifacts import list_artifacts, save_artifact, update_artifact_state
from .candidatures import create_candidature, get_candidature, list_candidatures, update_candidature
from .dashboard import render_dashboard as render_legacy_dashboard
from .dashboard import render_raw_offer_intake_page
from .dashboard_views import dashboard_view_model, render_dashboard_fragment, render_dashboard_view
from .db import (
    add_raw_intake,
    connect,
    create_application,
    init_db,
    list_applications,
    set_profile_variable,
    update_application,
    upsert_glossary_term,
)
from .keywords import add_keyword_alias, create_keyword_note, list_keywords, upsert_keyword
from .notes import create_note, list_notes
from .payload import application_context, dashboard_payload
from .privacy import get_variable, list_variables, resolve_variable_value, resolve_variables, set_variable
from .profile_facts import (
    archive_profile_fact,
    create_profile_fact,
    get_profile_fact,
    list_profile_facts,
    profile_context,
    update_profile_fact,
)
from .review_queue import review_queue
from .search import SearchUnavailable, rebuild_index, search
from .security import Mode
from .static_export import export_static_demo
from .tasks import apply_task_result, complete_task, create_task, get_task, list_tasks, update_task
from .text_blobs import create_text_blob, list_text_blobs, update_text_blob
from .templates import render_document_artifact, safe_artifact_output_path
from .todos import create_todo, list_todos, update_todo


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
    if surface == "dashboard":
        app.mount("/static", StaticFiles(directory=Path(__file__).with_name("static")), name="static")

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
        return await request.json(), False

    def respond(payload: dict[str, Any], status: int, is_form: bool, redirect_to: str) -> Any:
        if app.state.surface == "dashboard" and redirect_to:
            return RedirectResponse(redirect_to, status_code=303)
        if is_form:
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

    def clean_fields(data: dict[str, Any], *keys: str) -> dict[str, Any]:
        return {key: data[key] for key in keys if key in data and str(data[key]).strip()}

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

    def reject_rest_local_scope(scope: str) -> None:
        if scope != "agent":
            raise HTTPException(status_code=400, detail="REST API profile scopes are limited to agent")

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

        @app.post("/api/agent/tasks/{task_id}/claim", dependencies=[Depends(writable)])
        async def agent_claim_task(task_id: str, request: Request) -> Any:
            data, _ = await request_data(request)
            try:
                with connect(app.state.storage_path) as conn:
                    return claim_agent_task(
                        conn,
                        task_id,
                        agent_name=data.get("agent_name", ""),
                        agent_runtime=data.get("agent_runtime", ""),
                    )
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

        @app.post("/api/agent/intake/raw-offer", dependencies=[Depends(writable)])
        async def agent_raw_offer_intake(request: Request) -> Any:
            data, _ = await request_data(request)
            try:
                with connect(app.state.storage_path) as conn:
                    return agent_intake_raw_offer(
                        conn,
                        data.get("content", ""),
                        source_url=data.get("source_url", ""),
                        agent_name=data.get("agent_name", ""),
                        agent_runtime=data.get("agent_runtime", ""),
                    )
            except Exception as exc:
                handle_error(exc)

        @app.post("/api/agent/intake/{correlation_id}/extraction", dependencies=[Depends(writable)])
        async def agent_submit_extraction(correlation_id: str, request: Request) -> Any:
            data, _ = await request_data(request)
            unknown = set(data) - {"fields", "notes", "agent_name", "agent_runtime", "model_provider"}
            if unknown:
                raise HTTPException(status_code=400, detail=f"Unsupported extraction keys: {', '.join(sorted(unknown))}")
            extraction_payload = {key: data[key] for key in ("fields", "notes") if key in data}
            try:
                with connect(app.state.storage_path) as conn:
                    return agent_submit_structured_extraction(
                        conn,
                        correlation_id,
                        extraction_payload,
                        agent_name=data.get("agent_name", ""),
                        agent_runtime=data.get("agent_runtime", ""),
                        model_provider=data.get("model_provider", ""),
                    )
            except Exception as exc:
                handle_error(exc)

    if surface == "agent":
        register_agent_routes()
        return app

    @app.middleware("http")
    async def block_dashboard_private_api(request: Request, call_next: Any) -> Any:
        path = request.url.path
        if path.startswith("/api/") and path != "/api/health":
            return JSONResponse({"detail": "not found"}, status_code=404)
        return await call_next(request)

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

    @app.post("/dashboard/actions/user-view", dependencies=[Depends(writable)])
    async def dashboard_user_view(request: Request) -> Any:
        data, is_form = await request_data(request)
        application_id = data.get("application_id", "")
        source_context = f"candidature:{application_id}:user_view"
        try:
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
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?view=userView&application_id={application_id}")

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

    @app.post("/dashboard/actions/applications", dependencies=[Depends(writable)])
    async def api_create_application(request: Request) -> Any:
        data, is_form = await request_data(request)
        if "keywords" in data:
            data["keywords"] = keyword_list(data["keywords"])
        with connect(app.state.storage_path) as conn:
            item = create_application(conn, **data)
        return respond(item, 201, is_form, f"/?application_id={item['id']}")

    @app.patch("/dashboard/actions/applications/{application_id}", dependencies=[Depends(writable)])
    async def api_patch_application(application_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = update_application(conn, application_id, **data)
        return respond(item, 200, is_form, f"/?application_id={application_id}")

    @app.post("/dashboard/actions/applications/{application_id}", dependencies=[Depends(writable)])
    async def api_form_patch_application(application_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        if data.get("_method", "").upper() != "PATCH":
            raise HTTPException(status_code=405, detail="method not allowed")
        with connect(app.state.storage_path) as conn:
            item = update_application(conn, application_id, **data)
            if wants_fragment(request):
                model = make_view_model(conn, view=data.get("view") or "detailedView", application_id=application_id)
                return HTMLResponse(render_dashboard_fragment("selected-card", model))
        return respond(item, 200, is_form, f"/?application_id={application_id}")

    @app.post("/dashboard/actions/applications/{application_id}/raw-intake", dependencies=[Depends(writable)])
    async def api_raw_intake(application_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = add_raw_intake(conn, application_id, data.get("content", ""), data.get("created_by", "agent"))
        return respond(item, 201, is_form, f"/?application_id={application_id}")

    @app.get("/api/applications/{application_id}/context")
    def api_application_context(application_id: str) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return application_context(conn, application_id)

    @app.get("/api/candidatures")
    def api_candidatures() -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return {"candidatures": list_candidatures(conn)}

    @app.post("/dashboard/actions/candidatures", dependencies=[Depends(writable)])
    async def api_create_candidature(request: Request) -> Any:
        data, is_form = await request_data(request)
        fields = clean_fields(
            data,
            "company",
            "role",
            "status",
            "priority",
            "raw_offer",
            "description",
            "salary_expectation",
            "publication_date",
            "application_date",
            "raw_application_form",
            "strengths",
            "questions_to_ask",
            "tech_stack",
            "source",
            "source_url",
            "location",
        )
        fields["include_cv_task"] = bool_field(data, "include_cv_task")
        fields["include_cover_letter_task"] = bool_field(data, "include_cover_letter_task")
        fields["include_form_responses_task"] = bool_field(data, "include_form_responses_task")
        fields["include_field_inference_task"] = bool_field_default(data, "include_field_inference_task", True)
        fields["include_company_research_task"] = bool_field_default(data, "include_company_research_task", True)
        fields["include_keyword_detection_task"] = bool_field_default(data, "include_keyword_detection_task", True)
        if "keywords" in data:
            fields["keywords"] = keyword_list(data["keywords"])
        try:
            with connect(app.state.storage_path) as conn:
                item = create_candidature(conn, **fields)
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, f"/?application_id={item['id']}")

    @app.get("/api/candidatures/{candidature_id}")
    def api_get_candidature(candidature_id: str) -> dict[str, Any]:
        try:
            with connect(app.state.storage_path) as conn:
                return get_candidature(conn, candidature_id)
        except Exception as exc:
            handle_error(exc)

    @app.patch("/dashboard/actions/candidatures/{candidature_id}", dependencies=[Depends(writable)])
    async def api_patch_candidature(candidature_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = update_candidature(conn, candidature_id, **data)
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?application_id={candidature_id}")

    @app.post("/dashboard/actions/candidatures/{candidature_id}", dependencies=[Depends(writable)])
    async def api_form_patch_candidature(candidature_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        if data.get("_method", "").upper() != "PATCH":
            raise HTTPException(status_code=405, detail="method not allowed")
        try:
            with connect(app.state.storage_path) as conn:
                item = update_candidature(conn, candidature_id, **data)
                if wants_fragment(request):
                    model = make_view_model(conn, view=data.get("view") or "detailedView", application_id=candidature_id)
                    return HTMLResponse(render_dashboard_fragment("selected-card", model))
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?view=detailedView&application_id={candidature_id}")

    @app.get("/api/candidatures/{candidature_id}/context")
    def api_candidature_context(candidature_id: str) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return application_context(conn, candidature_id)

    @app.get("/api/tasks")
    def api_tasks(application_id: str | None = None, state: str | None = None) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return {"tasks": list_tasks(conn, application_id=application_id, state=state)}

    @app.post("/dashboard/actions/tasks", dependencies=[Depends(writable)])
    async def api_create_task(request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
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
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.get("/api/tasks/{task_id}")
    def api_get_task(task_id: str) -> dict[str, Any]:
        try:
            with connect(app.state.storage_path) as conn:
                return get_task(conn, task_id)
        except Exception as exc:
            handle_error(exc)

    @app.patch("/dashboard/actions/tasks/{task_id}", dependencies=[Depends(writable)])
    async def api_patch_task(task_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = update_task(conn, task_id, **data)
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.post("/dashboard/actions/tasks/{task_id}/complete", dependencies=[Depends(writable)])
    async def api_complete_task(task_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
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
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.post("/dashboard/actions/tasks/{task_id}/apply", dependencies=[Depends(writable)])
    async def api_apply_task(task_id: str, request: Request) -> Any:
        _, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = apply_task_result(conn, task_id)
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.post("/dashboard/actions/render/cv", dependencies=[Depends(writable)])
    async def api_render_cv(request: Request) -> Any:
        data, is_form = await request_data(request)
        application_id = data.get("application_id", "")
        try:
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
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?view=detailedView&application_id={application_id}")

    @app.post("/dashboard/actions/render/cover-letter", dependencies=[Depends(writable)])
    async def api_render_cover_letter(request: Request) -> Any:
        data, is_form = await request_data(request)
        application_id = data.get("application_id", "")
        extra = {"artifact.cover_letter.body": data.get("body", "Draft body pending review.")}
        if data.get("body_tex"):
            extra["artifact.cover_letter.body_tex"] = data["body_tex"]
        try:
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
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?view=detailedView&application_id={application_id}")

    @app.get("/api/todos")
    def api_todos(application_id: str | None = None) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return {"todos": list_todos(conn, application_id)}

    @app.post("/dashboard/actions/todos", dependencies=[Depends(writable)])
    async def api_create_todo(request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
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
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.patch("/dashboard/actions/todos/{todo_id}", dependencies=[Depends(writable)])
    async def api_patch_todo(todo_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        if "pinned" in data:
            data["pinned"] = bool_field(data, "pinned")
        try:
            with connect(app.state.storage_path) as conn:
                item = update_todo(conn, todo_id, **data)
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.get("/api/notes")
    def api_notes(application_id: str | None = None) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return {"notes": list_notes(conn, application_id)}

    @app.post("/dashboard/actions/notes", dependencies=[Depends(writable)])
    async def api_create_note(request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = create_note(
                    conn,
                    data.get("body", ""),
                    application_id=data.get("application_id") or None,
                    note_type=data.get("note_type", "general"),
                    created_by=data.get("created_by", "user"),
                )
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.get("/api/text-blobs")
    def api_text_blobs(application_id: str | None = None) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return {"text_blobs": list_text_blobs(conn, application_id)}

    @app.post("/dashboard/actions/text-blobs", dependencies=[Depends(writable)])
    async def api_create_text_blob(request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
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
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.patch("/dashboard/actions/text-blobs/{blob_id}", dependencies=[Depends(writable)])
    async def api_patch_text_blob(blob_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = update_text_blob(conn, blob_id, **data)
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.get("/api/keywords")
    def api_keywords() -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return {"keywords": list_keywords(conn)}

    @app.post("/dashboard/actions/keywords", dependencies=[Depends(writable)])
    async def api_upsert_keyword(request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = upsert_keyword(conn, data.get("term", ""), data.get("definition", ""), data.get("category", ""))
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, "/")

    @app.post("/dashboard/actions/keywords/{term}/aliases", dependencies=[Depends(writable)])
    async def api_keyword_alias(term: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = add_keyword_alias(conn, term, data.get("alias", ""))
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, "/")

    @app.post("/dashboard/actions/keywords/{term}/notes", dependencies=[Depends(writable)])
    async def api_keyword_note(term: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = create_keyword_note(conn, term, data.get("body", ""), created_by=data.get("created_by", "user"))
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, "/")

    @app.get("/api/variables")
    def api_variables(scope: str = "agent") -> dict[str, Any]:
        reject_rest_local_scope(scope)
        with connect(app.state.storage_path) as conn:
            return {"variables": resolve_variables(conn, "agent")}

    @app.get("/api/variables/{key}")
    def api_get_variable(key: str, scope: str = "agent") -> dict[str, Any]:
        reject_rest_local_scope(scope)
        try:
            with connect(app.state.storage_path) as conn:
                item = get_variable(conn, key)
                return {
                    "key": item["key"],
                    "placeholder": item["placeholder"],
                    "is_sensitive": item["is_sensitive"],
                    "exposure": item["exposure"],
                    "summary": item["summary"],
                    "resolved_value": resolve_variable_value(item, "agent"),
                    "updated_at": item["updated_at"],
                }
        except Exception as exc:
            handle_error(exc)

    @app.put("/dashboard/actions/variables/{key}", dependencies=[Depends(writable)])
    async def api_put_variable(key: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = set_variable(
                    conn,
                    key,
                    data.get("value", ""),
                    placeholder=data.get("placeholder") or None,
                    is_sensitive=not (str(data.get("is_sensitive", "true")).lower() in {"0", "false", "no"}),
                    exposure=data.get("exposure", "placeholder"),
                    summary=data.get("summary", ""),
                )
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, "/")

    @app.get("/api/search")
    def api_search(q: str = "", limit: int = 20) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            try:
                rebuild_index(conn)
                return search(conn, q, limit=limit)
            except SearchUnavailable as exc:
                return {"available": False, "error": str(exc), "results": []}

    @app.post("/dashboard/actions/glossary", dependencies=[Depends(writable)])
    async def api_glossary(request: Request) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = upsert_glossary_term(conn, data.get("term", ""), data.get("definition", ""), data.get("category", ""))
        return respond(item, 201, is_form, "/")

    @app.patch("/dashboard/actions/profile/variables", dependencies=[Depends(writable)])
    async def api_patch_profile_variable(request: Request) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            set_profile_variable(conn, data.get("key", ""), data.get("value", ""))
        return respond({"ok": True, "key": data.get("key", "")}, 200, is_form, "/")

    @app.post("/dashboard/actions/profile/variables", dependencies=[Depends(writable)])
    async def api_form_patch_profile_variable(request: Request) -> Any:
        data, is_form = await request_data(request)
        if data.get("_method", "").upper() != "PATCH":
            raise HTTPException(status_code=405, detail="method not allowed")
        with connect(app.state.storage_path) as conn:
            set_profile_variable(conn, data.get("key", ""), data.get("value", ""))
        return respond({"ok": True, "key": data.get("key", "")}, 200, is_form, "/")

    def profile_fact_fields(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
        keys = {
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
        fields = {key: data[key] for key in keys if key in data}
        if "type" in data:
            fields["fact_type"] = data["type"]
        bool_keys = {
            "use_for_cv",
            "use_for_cover_letter",
            "use_for_agent_context",
            "use_for_market_research",
            "use_for_dashboard",
        }
        for key in bool_keys:
            if key in data or not partial:
                fields[key] = bool_field(data, key)
        return fields

    @app.get("/api/profile/facts")
    def api_profile_facts(fact_type: str | None = None, include_archived: bool = False) -> dict[str, Any]:
        with connect(app.state.storage_path) as conn:
            return {"profile_facts": list_profile_facts(conn, fact_type=fact_type, include_archived=include_archived)}

    @app.post("/dashboard/actions/profile/facts", dependencies=[Depends(writable)])
    async def api_create_profile_fact(request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = create_profile_fact(conn, **profile_fact_fields(data))
                if wants_fragment(request):
                    model = make_view_model(conn)
                    return HTMLResponse(render_dashboard_fragment("inspector", model))
        except Exception as exc:
            handle_error(exc)
        return respond(item, 201, is_form, "/")

    @app.get("/api/profile/facts/{fact_id}")
    def api_get_profile_fact(fact_id: str) -> dict[str, Any]:
        try:
            with connect(app.state.storage_path) as conn:
                return get_profile_fact(conn, fact_id)
        except Exception as exc:
            handle_error(exc)

    @app.patch("/dashboard/actions/profile/facts/{fact_id}", dependencies=[Depends(writable)])
    async def api_patch_profile_fact(fact_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = update_profile_fact(conn, fact_id, **profile_fact_fields(data, partial=True))
                if wants_fragment(request):
                    model = make_view_model(conn)
                    return HTMLResponse(render_dashboard_fragment("inspector", model))
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, "/")

    @app.post("/dashboard/actions/profile/facts/{fact_id}", dependencies=[Depends(writable)])
    async def api_form_patch_profile_fact(fact_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        if data.get("_method", "").upper() != "PATCH":
            raise HTTPException(status_code=405, detail="method not allowed")
        try:
            with connect(app.state.storage_path) as conn:
                item = update_profile_fact(conn, fact_id, **profile_fact_fields(data, partial=True))
                if wants_fragment(request):
                    model = make_view_model(conn)
                    return HTMLResponse(render_dashboard_fragment("inspector", model))
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, "/")

    @app.post("/dashboard/actions/profile/facts/{fact_id}/archive", dependencies=[Depends(writable)])
    async def api_archive_profile_fact(fact_id: str, request: Request) -> Any:
        _, is_form = await request_data(request)
        try:
            with connect(app.state.storage_path) as conn:
                item = archive_profile_fact(conn, fact_id)
                if wants_fragment(request):
                    model = make_view_model(conn)
                    return HTMLResponse(render_dashboard_fragment("inspector", model))
        except Exception as exc:
            handle_error(exc)
        return respond(item, 200, is_form, "/")

    @app.get("/api/profile/context")
    def api_profile_context(purpose: str = "cv_generation", scope: str = "agent") -> dict[str, Any]:
        reject_rest_local_scope(scope)
        try:
            with connect(app.state.storage_path) as conn:
                return profile_context(conn, purpose, scope="agent")
        except Exception as exc:
            handle_error(exc)

    @app.post("/dashboard/actions/artifacts", dependencies=[Depends(writable)])
    async def api_artifacts(request: Request) -> Any:
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

    @app.patch("/dashboard/actions/artifacts/{artifact_id}", dependencies=[Depends(writable)])
    async def api_patch_artifact(artifact_id: str, request: Request) -> Any:
        data, is_form = await request_data(request)
        with connect(app.state.storage_path) as conn:
            item = update_artifact_state(
                conn,
                artifact_id,
                data.get("review_state", "draft"),
                data.get("notes") if "notes" in data else None,
            )
        return respond(item, 200, is_form, f"/?application_id={item.get('application_id') or ''}")

    @app.post("/dashboard/actions/artifacts/{artifact_id}", dependencies=[Depends(writable)])
    async def api_form_patch_artifact(artifact_id: str, request: Request) -> Any:
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

    @app.post("/dashboard/actions/raw-offer-intake", dependencies=[Depends(writable)])
    async def api_raw_offer_intake(request: Request) -> Any:
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

    @app.post("/dashboard/actions/export/static-demo", dependencies=[Depends(writable)])
    async def api_export_static_demo(request: Request) -> Any:
        data, is_form = await request_data(request)
        output = data.get("output_path", "outputs/static-demo.html")
        item = {"path": str(export_static_demo(output))}
        return respond(item, 200, is_form, "/")

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
