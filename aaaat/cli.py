from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from . import __version__
from .agent_access import next_agent_work_item, submit_agent_task_result, task_result_ack
from .agent_actions import submit_agent_action
from .agent_guides import agent_guide
from .artifacts import list_artifacts, save_artifact, update_artifact_state
from .career_plans import archive_career_plan, career_plan_context, create_career_plan, get_career_plan, list_career_plans, update_career_plan
from .db import add_raw_intake, connect, create_application, create_raw_offer_intake, get_application, init_db, list_applications, required_profile_variables, set_profile_variable, update_application, upsert_glossary_term
from .keywords import add_keyword_alias, create_keyword_note
from .local_data import create_local_backup
from .mcp_server import mcp_descriptor, validate_descriptor
from .notes import create_note, list_notes
from .privacy import list_variables, set_variable
from .profile_facts import archive_profile_fact, create_profile_fact, get_profile_fact, list_profile_facts, profile_context, update_profile_fact
from .provider_adapters import visible_adapters
from .search import SearchUnavailable, rebuild_index, search
from .task_runner import TaskRunner
from .tasks import apply_task_result, complete_task, create_task, get_task, list_tasks, update_task
from .templates import render_document_artifact
from .text_blobs import create_text_blob, list_text_blobs
from .todos import create_todo, list_todos, update_todo
from .workspace_config import load_workspace_config, save_workspace_settings

APPLICATION_FIELDS = (
    "company", "role", "status", "priority", "source-url", "location", "remote-mode",
    "notes", "call-signals", "pitch", "smart-question", "risks-to-avoid",
    "offer-snapshot", "company-research", "keywords",
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="aaaat")
    parser.add_argument("--storage", default=".private")
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init")
    backup_p = sub.add_parser("backup")
    backup_p.add_argument("--output")
    backup_p.add_argument("--force", action="store_true")

    config = sub.add_parser("config").add_subparsers(dest="config_command", required=True)
    config.add_parser("show")
    adapters = config.add_parser("adapters")
    adapters.add_argument("--include-advanced", action="store_true")
    adapter_set = config.add_parser("set-adapter")
    adapter_set.add_argument("adapter_id")
    adapter_set.add_argument("--argv", action="append", default=[])
    adapter_set.add_argument("--timeout-seconds", type=int)
    adapter_set.add_argument("--automatic-task", action="append", default=[])

    agent = sub.add_parser("agent").add_subparsers(dest="agent_command", required=True)
    agent.add_parser("next", help="Return one complete bounded work item, including its purpose-scoped context and response schema.")
    agent_submit = agent.add_parser("submit")
    agent_submit.add_argument("task_capability")
    result_group = agent_submit.add_mutually_exclusive_group(required=True)
    result_group.add_argument("--result-body")
    result_group.add_argument("--result-file")
    agent_submit.add_argument("--result-title", default="")
    agent_submit.add_argument("--agent-name", default="")
    agent_submit.add_argument("--agent-runtime", default="")
    agent_submit.add_argument("--model-provider", default="")
    agent_action = agent.add_parser("action").add_subparsers(dest="agent_action_command", required=True)
    agent_action_submit = agent_action.add_parser("submit")
    action_input = agent_action_submit.add_mutually_exclusive_group(required=True)
    action_input.add_argument("--input-file")
    action_input.add_argument("--input-body")
    agent_action_submit.add_argument("--agent-name", default="")
    agent_action_submit.add_argument("--agent-runtime", default="")
    agent_action_submit.add_argument("--model-provider", default="")

    app = sub.add_parser("app").add_subparsers(dest="app_command", required=True)
    app_create = app.add_parser("create")
    app_create.add_argument("--company", required=True)
    app_create.add_argument("--role", required=True)
    app_create.add_argument("--status", default="active", choices=["active", "closed"])
    app_create.add_argument("--priority", default="normal")
    app.add_parser("list")
    app_show = app.add_parser("show")
    app_show.add_argument("id")
    app_update = app.add_parser("update")
    app_update.add_argument("id")
    for field in APPLICATION_FIELDS:
        app_update.add_argument(f"--{field}")

    intake = sub.add_parser("intake").add_subparsers(dest="intake_command", required=True)
    intake_add = intake.add_parser("add")
    intake_add.add_argument("application_id")
    intake_add.add_argument("--content", required=True)
    intake_add.add_argument("--created-by", default="user")
    intake_raw = intake.add_parser("raw-offer")
    intake_raw.add_argument("--content", required=True)

    artifact = sub.add_parser("artifact").add_subparsers(dest="artifact_command", required=True)
    artifact_list = artifact.add_parser("list")
    artifact_list.add_argument("application_id", nargs="?")
    artifact_save = artifact.add_parser("save")
    artifact_save.add_argument("--application-id")
    artifact_save.add_argument("--type", required=True)
    artifact_save.add_argument("--path", required=True)
    artifact_save.add_argument("--label", required=True)
    artifact_save.add_argument("--state", default="draft", choices=["draft", "reviewed", "submitted", "archived"])
    artifact_update = artifact.add_parser("update-state")
    artifact_update.add_argument("artifact_id")
    artifact_update.add_argument("--state", required=True, choices=["draft", "reviewed", "submitted", "archived"])
    artifact_update.add_argument("--notes")

    render = sub.add_parser("render").add_subparsers(dest="render_command", required=True)
    render_cv = render.add_parser("cv")
    render_cv.add_argument("--output", default=".private/artifacts/cv.tex")
    render_cv.add_argument("--compile-pdf", action="store_true")
    render_cover = render.add_parser("cover-letter")
    render_cover.add_argument("application_id")
    render_cover.add_argument("--body", required=True)
    render_cover.add_argument("--output", default=".private/artifacts/cover-letter.tex")
    render_cover.add_argument("--compile-pdf", action="store_true")

    profile = sub.add_parser("profile").add_subparsers(dest="profile_command", required=True)
    profile_set = profile.add_parser("set")
    profile_set.add_argument("key")
    profile_set.add_argument("value")
    profile.add_parser("missing")
    profile_context_p = profile.add_parser("context")
    profile_context_p.add_argument("--purpose", required=True)
    profile_context_p.add_argument("--scope", default="agent")
    profile_fact = profile.add_parser("fact").add_subparsers(dest="fact_command", required=True)
    profile_fact_add = profile_fact.add_parser("add")
    profile_fact_add.add_argument("--type", dest="fact_type", required=True)
    profile_fact_add.add_argument("--title", default="")
    profile_fact_add.add_argument("--body", default="")
    profile_fact_add.add_argument("--tags", default="")
    profile_fact_add.add_argument("--visibility", default="private", choices=["public", "professional", "private", "sensitive"])
    profile_fact_add.add_argument("--exposure", default="summarized", choices=["raw", "anonymized", "summarized", "placeholder", "redacted", "denied"])
    profile_fact_add.add_argument("--use-for-cv", action="store_true")
    profile_fact_add.add_argument("--use-for-cover-letter", action="store_true")
    profile_fact_add.add_argument("--use-for-agent-context", action="store_true")
    profile_fact_add.add_argument("--use-for-market-research", action="store_true")
    profile_fact_add.add_argument("--hide-from-desktop", action="store_true")
    profile_fact.add_parser("list")
    profile_fact_show = profile_fact.add_parser("show")
    profile_fact_show.add_argument("id")
    profile_fact_update = profile_fact.add_parser("update")
    profile_fact_update.add_argument("id")
    for field in ("type", "title", "body", "tags", "visibility", "exposure"):
        profile_fact_update.add_argument(f"--{field}", dest="fact_type" if field == "type" else field)
    profile_fact_archive = profile_fact.add_parser("archive")
    profile_fact_archive.add_argument("id")

    career_plan = sub.add_parser("career-plan").add_subparsers(dest="career_plan_command", required=True)
    career_plan_add = career_plan.add_parser("add")
    career_plan_add.add_argument("--body", default="")
    career_plan_add.add_argument("--objectives", default="")
    career_plan_add.add_argument("--constraints", default="")
    career_plan_add.add_argument("--target-markets", default="")
    career_plan_add.add_argument("--target-roles", default="")
    career_plan_add.add_argument("--source", default="user")
    career_plan_list = career_plan.add_parser("list")
    career_plan_list.add_argument("--include-archived", action="store_true")
    career_plan_show = career_plan.add_parser("show")
    career_plan_show.add_argument("id")
    career_plan_update = career_plan.add_parser("update")
    career_plan_update.add_argument("id")
    for field in ("body", "objectives", "constraints", "target-markets", "target-roles", "source", "review-state"):
        career_plan_update.add_argument(f"--{field}")
    career_plan_archive = career_plan.add_parser("archive")
    career_plan_archive.add_argument("id")
    career_plan_context_p = career_plan.add_parser("context")
    career_plan_context_p.add_argument("--purpose", required=True)
    career_plan_context_p.add_argument("--scope", default="agent")

    glossary = sub.add_parser("glossary").add_subparsers(dest="glossary_command", required=True)
    glossary_set = glossary.add_parser("set")
    glossary_set.add_argument("term")
    glossary_set.add_argument("--definition", required=True)
    glossary_set.add_argument("--category", default="")

    keyword = sub.add_parser("keyword").add_subparsers(dest="keyword_command", required=True)
    keyword_alias = keyword.add_parser("alias")
    keyword_alias.add_argument("term")
    keyword_alias.add_argument("alias")
    keyword_note = keyword.add_parser("note")
    keyword_note.add_argument("term")
    keyword_note.add_argument("--body", required=True)
    keyword_note.add_argument("--created-by", default="user")

    task = sub.add_parser("task").add_subparsers(dest="task_command", required=True)
    task_create = task.add_parser("create")
    task_create.add_argument("--application-id")
    task_create.add_argument("--type", required=True)
    task_create.add_argument("--title", required=True)
    task_create.add_argument("--instructions", default="")
    task_create.add_argument("--priority", default="normal")
    task_create.add_argument("--context-hint", default="")
    task_list = task.add_parser("list")
    task_list.add_argument("--application-id")
    task_list.add_argument("--state")
    task_show = task.add_parser("show")
    task_show.add_argument("id")
    task_complete = task.add_parser("complete")
    task_complete.add_argument("id")
    task_complete.add_argument("--result-body", default="")
    task_complete.add_argument("--result-title", default="")
    task_complete.add_argument("--agent-name", default="")
    task_complete.add_argument("--agent-runtime", default="")
    task_apply = task.add_parser("apply")
    task_apply.add_argument("id")
    task_run = task.add_parser("run")
    task_run.add_argument("id")
    task_retry = task.add_parser("retry")
    task_retry.add_argument("id")
    task_cancel = task.add_parser("cancel")
    task_cancel.add_argument("id")

    todo = sub.add_parser("todo").add_subparsers(dest="todo_command", required=True)
    todo_create = todo.add_parser("create")
    todo_create.add_argument("--application-id")
    todo_create.add_argument("--title", required=True)
    todo_create.add_argument("--body", default="")
    todo_create.add_argument("--pinned", action="store_true")
    todo_list = todo.add_parser("list")
    todo_list.add_argument("--application-id")
    todo_update = todo.add_parser("update")
    todo_update.add_argument("id")
    todo_update.add_argument("--state", choices=["open", "done", "dismissed"])
    todo_update.add_argument("--title")
    todo_update.add_argument("--body")
    todo_update.add_argument("--pinned", action="store_true")

    note = sub.add_parser("note").add_subparsers(dest="note_command", required=True)
    note_add = note.add_parser("add")
    note_add.add_argument("--application-id")
    note_add.add_argument("--body", required=True)
    note_add.add_argument("--type", default="general")
    note_add.add_argument("--created-by", default="user")
    note_list = note.add_parser("list")
    note_list.add_argument("--application-id")

    blob = sub.add_parser("blob").add_subparsers(dest="blob_command", required=True)
    blob_add = blob.add_parser("add")
    blob_add.add_argument("--application-id")
    blob_add.add_argument("--type", required=True)
    blob_add.add_argument("--title", default="")
    blob_add.add_argument("--body", required=True)
    blob_add.add_argument("--review-state", default="draft")
    blob_list = blob.add_parser("list")
    blob_list.add_argument("--application-id")

    variable = sub.add_parser("variable").add_subparsers(dest="variable_command", required=True)
    variable_set = variable.add_parser("set")
    variable_set.add_argument("key")
    variable_set.add_argument("value")
    variable_set.add_argument("--exposure", default="placeholder", choices=["raw", "redacted", "summarized", "placeholder", "denied"])
    variable_set.add_argument("--summary", default="")
    variable.add_parser("list")

    search_p = sub.add_parser("search")
    search_p.add_argument("query")
    sub.add_parser("agent-guide")
    sub.add_parser("mcp-descriptor")
    sub.add_parser("mcp-validate")
    return parser


def _json(value: Any) -> None:
    print(json.dumps(value, indent=2, ensure_ascii=False))


def _provided_fields(args: argparse.Namespace, allowed: tuple[str, ...] | set[str]) -> dict[str, Any]:
    values = vars(args)
    return {key.replace("-", "_"): value for key, value in values.items() if key.replace("_", "-") in allowed and value is not None}


def _adapter_settings(args: argparse.Namespace) -> dict[str, Any]:
    settings: dict[str, Any] = {}
    if args.argv:
        settings["argv"] = args.argv
    if args.timeout_seconds is not None:
        settings["timeout_seconds"] = args.timeout_seconds
    return settings


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "init":
        print(init_db(args.storage))
        return 0
    if args.command == "backup":
        print(create_local_backup(args.storage, args.output, force=args.force))
        return 0
    if args.command == "agent-guide":
        print(agent_guide())
        return 0
    if args.command == "mcp-descriptor":
        _json(mcp_descriptor())
        return 0
    if args.command == "mcp-validate":
        validate_descriptor()
        print("ok")
        return 0
    if args.command == "config" and args.config_command == "adapters":
        _json([adapter.__dict__ for adapter in visible_adapters(include_advanced=args.include_advanced)])
        return 0
    if args.command == "config" and args.config_command == "show":
        _json(load_workspace_config(args.storage))
        return 0
    if args.command == "config" and args.config_command == "set-adapter":
        automatic = args.automatic_task or load_workspace_config(args.storage)["automatic_preparation"]
        print(save_workspace_settings(args.storage, automatic_preparation=automatic, local_agent_adapter_id=args.adapter_id, local_agent_adapter_settings=_adapter_settings(args)))
        return 0

    init_db(args.storage)
    with connect(args.storage) as conn:
        if args.command == "agent" and args.agent_command == "next":
            _json({"work": next_agent_work_item(conn)})
        elif args.command == "agent" and args.agent_command == "submit":
            result_body = Path(args.result_file).read_text(encoding="utf-8") if args.result_file else args.result_body
            task = submit_agent_task_result(conn, args.task_capability, result_body, result_title=args.result_title, agent_name=args.agent_name, agent_runtime=args.agent_runtime, model_provider=args.model_provider)
            _json(task_result_ack(conn, task))
        elif args.command == "agent" and args.agent_command == "action" and args.agent_action_command == "submit":
            action_body = Path(args.input_file).read_text(encoding="utf-8") if args.input_file else args.input_body
            _json(submit_agent_action(conn, action_body, agent_name=args.agent_name, agent_runtime=args.agent_runtime, model_provider=args.model_provider, storage_path=args.storage))
        elif args.command == "app" and args.app_command == "create":
            _json(create_application(conn, company=args.company, role=args.role, status=args.status, priority=args.priority))
        elif args.command == "app" and args.app_command == "update":
            _json(update_application(conn, args.id, **_provided_fields(args, set(APPLICATION_FIELDS))))
        elif args.command == "app" and args.app_command == "list":
            _json(list_applications(conn))
        elif args.command == "app" and args.app_command == "show":
            _json(get_application(conn, args.id))
        elif args.command == "intake" and args.intake_command == "add":
            _json(add_raw_intake(conn, args.application_id, args.content, args.created_by))
        elif args.command == "intake" and args.intake_command == "raw-offer":
            _json(create_raw_offer_intake(conn, args.content, "user"))
        elif args.command == "artifact" and args.artifact_command == "list":
            _json(list_artifacts(conn, args.application_id))
        elif args.command == "artifact" and args.artifact_command == "save":
            _json(save_artifact(conn, args.application_id, args.type, args.path, args.label, source_context="cli", review_state=args.state))
        elif args.command == "artifact" and args.artifact_command == "update-state":
            _json(update_artifact_state(conn, args.artifact_id, args.state, args.notes))
        elif args.command == "render" and args.render_command == "cv":
            _json(render_document_artifact(conn, "cv", args.output, compile_pdf=args.compile_pdf, save_version=True))
        elif args.command == "render" and args.render_command == "cover-letter":
            _json(render_document_artifact(conn, "cover-letter", args.output, args.application_id, {"artifact.cover_letter.body": args.body}, compile_pdf=args.compile_pdf, save_version=True))
        elif args.command == "profile" and args.profile_command == "set":
            set_profile_variable(conn, args.key, args.value)
            print("ok")
        elif args.command == "profile" and args.profile_command == "missing":
            _json(required_profile_variables(conn))
        elif args.command == "profile" and args.profile_command == "context":
            _json(profile_context(conn, args.purpose, scope=args.scope))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "add":
            _json(create_profile_fact(conn, fact_type=args.fact_type, title=args.title, body=args.body, tags=args.tags, visibility=args.visibility, exposure=args.exposure, use_for_cv=args.use_for_cv, use_for_cover_letter=args.use_for_cover_letter, use_for_agent_context=args.use_for_agent_context, use_for_market_research=args.use_for_market_research, use_for_desktop=not args.hide_from_desktop, source="cli"))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "list":
            _json(list_profile_facts(conn))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "show":
            _json(get_profile_fact(conn, args.id))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "update":
            fields = {key: value for key, value in vars(args).items() if key in {"fact_type", "title", "body", "tags", "visibility", "exposure"} and value is not None}
            _json(update_profile_fact(conn, args.id, **fields))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "archive":
            _json(archive_profile_fact(conn, args.id))
        elif args.command == "career-plan" and args.career_plan_command == "add":
            _json(create_career_plan(conn, body=args.body, objectives=args.objectives, constraints=args.constraints, target_markets=args.target_markets, target_roles=args.target_roles, source=args.source))
        elif args.command == "career-plan" and args.career_plan_command == "list":
            _json(list_career_plans(conn, include_archived=args.include_archived))
        elif args.command == "career-plan" and args.career_plan_command == "show":
            _json(get_career_plan(conn, args.id))
        elif args.command == "career-plan" and args.career_plan_command == "update":
            fields = {key: value for key, value in vars(args).items() if key in {"body", "objectives", "constraints", "target_markets", "target_roles", "source", "review_state"} and value is not None}
            _json(update_career_plan(conn, args.id, **fields))
        elif args.command == "career-plan" and args.career_plan_command == "archive":
            _json(archive_career_plan(conn, args.id))
        elif args.command == "career-plan" and args.career_plan_command == "context":
            _json(career_plan_context(conn, args.purpose, scope=args.scope))
        elif args.command == "glossary" and args.glossary_command == "set":
            _json(upsert_glossary_term(conn, args.term, args.definition, args.category))
        elif args.command == "keyword" and args.keyword_command == "alias":
            _json(add_keyword_alias(conn, args.term, args.alias))
        elif args.command == "keyword" and args.keyword_command == "note":
            _json(create_keyword_note(conn, args.term, args.body, created_by=args.created_by))
        elif args.command == "task" and args.task_command == "create":
            _json(create_task(conn, args.type, args.title, application_id=args.application_id, instructions=args.instructions, priority=args.priority, context_hint=args.context_hint, created_by="cli"))
        elif args.command == "task" and args.task_command == "list":
            _json(list_tasks(conn, application_id=args.application_id, state=args.state))
        elif args.command == "task" and args.task_command == "show":
            _json(get_task(conn, args.id))
        elif args.command == "task" and args.task_command == "complete":
            _json(complete_task(conn, args.id, result_body=args.result_body, result_title=args.result_title, agent_name=args.agent_name, agent_runtime=args.agent_runtime))
        elif args.command == "task" and args.task_command == "apply":
            _json(apply_task_result(conn, args.id))
        elif args.command == "task" and args.task_command == "run":
            _json(TaskRunner(args.storage).run(args.id))
        elif args.command == "task" and args.task_command == "retry":
            _json(update_task(conn, args.id, state="queued", notes=""))
        elif args.command == "task" and args.task_command == "cancel":
            _json(update_task(conn, args.id, state="cancelled", notes="Cancelled by user."))
        elif args.command == "todo" and args.todo_command == "create":
            _json(create_todo(conn, args.title, application_id=args.application_id, body=args.body, pinned=args.pinned))
        elif args.command == "todo" and args.todo_command == "list":
            _json(list_todos(conn, args.application_id))
        elif args.command == "todo" and args.todo_command == "update":
            fields = {key: value for key, value in vars(args).items() if key in {"state", "title", "body", "pinned"} and value not in (None, False)}
            _json(update_todo(conn, args.id, **fields))
        elif args.command == "note" and args.note_command == "add":
            _json(create_note(conn, args.body, application_id=args.application_id, note_type=args.type, created_by=args.created_by))
        elif args.command == "note" and args.note_command == "list":
            _json(list_notes(conn, args.application_id))
        elif args.command == "blob" and args.blob_command == "add":
            _json(create_text_blob(conn, args.type, args.body, application_id=args.application_id, title=args.title, review_state=args.review_state, created_by="cli"))
        elif args.command == "blob" and args.blob_command == "list":
            _json(list_text_blobs(conn, args.application_id))
        elif args.command == "variable" and args.variable_command == "set":
            _json(set_variable(conn, args.key, args.value, exposure=args.exposure, summary=args.summary))
        elif args.command == "variable" and args.variable_command == "list":
            _json(list_variables(conn))
        elif args.command == "search":
            try:
                rebuild_index(conn)
                _json(search(conn, args.query))
            except SearchUnavailable as exc:
                _json({"available": False, "error": str(exc), "results": []})
        else:
            raise SystemExit(f"Unhandled command: {args.command}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
