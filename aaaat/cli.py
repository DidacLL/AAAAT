from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import __version__
from .agent_actions import get_agent_context_bundle, submit_agent_action
from .agent_access import (
    build_agent_task_context,
    claim_agent_task,
    list_agent_task_envelopes,
    next_agent_task_envelope,
    release_agent_task,
    submit_agent_task_result,
    task_result_ack,
)
from .agent_guides import agent_guide
from .artifacts import list_artifacts, save_artifact, update_artifact_state
from .career_plans import (
    archive_career_plan,
    career_plan_context,
    create_career_plan,
    get_career_plan,
    list_career_plans,
    update_career_plan,
)
from .dispatch.command import dispatch_command
from .dispatch.manual import dispatch_manual
from .dispatch.packet import build_task_packet
from .keywords import add_keyword_alias, create_keyword_note
from .notes import create_note, list_notes
from .privacy import list_variables, set_variable
from .profile_facts import (
    archive_profile_fact,
    create_profile_fact,
    get_profile_fact,
    list_profile_facts,
    profile_context,
    update_profile_fact,
)
from .search import SearchUnavailable, rebuild_index, search
from .tasks import apply_task_result, complete_task, create_task, get_task, list_tasks
from .text_blobs import create_text_blob, list_text_blobs
from .todos import create_todo, list_todos, update_todo
from .db import (
    add_raw_intake,
    connect,
    create_application,
    create_raw_offer_intake,
    get_application,
    init_db,
    list_applications,
    required_profile_variables,
    set_profile_variable,
    update_application,
    upsert_glossary_term,
)
from .mcp_server import mcp_descriptor, validate_descriptor
from .payload import dashboard_payload
from .review_queue import review_queue
from .server import launch
from .static_export import export_static_demo
from .templates import render_to_file


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="aaaat")
    parser.add_argument("--storage", default=".private")
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init")

    launch_p = sub.add_parser("launch")
    launch_p.add_argument("--read-only", action="store_true")
    launch_p.add_argument("--agent-api", action="store_true")
    launch_p.add_argument("--port", type=int, default=8765)

    agent = sub.add_parser("agent").add_subparsers(dest="agent_command", required=True)
    agent.add_parser("next")
    agent_tasks = agent.add_parser("tasks")
    agent_tasks.add_argument("--state")
    agent_tasks.add_argument("--limit", type=int)
    agent_context = agent.add_parser("context")
    agent_context.add_argument("task_handle")
    agent_packet = agent.add_parser("packet")
    agent_packet.add_argument("task_handle")
    agent_dispatch = agent.add_parser("dispatch")
    agent_dispatch.add_argument("task_handle")
    agent_dispatch.add_argument("--backend", required=True, choices=["manual", "command"])
    agent_dispatch.add_argument("--cmd", default="")
    agent_submit = agent.add_parser("submit")
    agent_submit.add_argument("task_handle")
    result_group = agent_submit.add_mutually_exclusive_group(required=True)
    result_group.add_argument("--result-body")
    result_group.add_argument("--result-file")
    agent_submit.add_argument("--result-title", default="")
    agent_submit.add_argument("--agent-name", default="")
    agent_submit.add_argument("--agent-runtime", default="")
    agent_submit.add_argument("--model-provider", default="")
    agent_claim = agent.add_parser("claim")
    agent_claim.add_argument("task_handle")
    agent_claim.add_argument("--agent-name", default="")
    agent_claim.add_argument("--agent-runtime", default="")
    agent_release = agent.add_parser("release")
    agent_release.add_argument("task_handle")
    agent_context_bundle = agent.add_parser("context-bundle")
    agent_context_bundle.add_argument("--purpose", required=True)
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
    app_create.add_argument("--status", default="draft")
    app_create.add_argument("--priority", default="normal")
    app.add_parser("list")
    app_show = app.add_parser("show")
    app_show.add_argument("id")
    app_update = app.add_parser("update")
    app_update.add_argument("id")
    for field in (
        "company",
        "role",
        "status",
        "priority",
        "source",
        "source-url",
        "location",
        "remote-mode",
        "next-action",
        "notes",
        "call-signals",
        "technical-reading",
        "pitch",
        "smart-question",
        "risks-to-avoid",
        "prepare-first",
        "prepare-later",
        "offer-snapshot",
        "company-research",
        "form-answers",
        "keywords",
    ):
        app_update.add_argument(f"--{field}")

    intake = sub.add_parser("intake").add_subparsers(dest="intake_command", required=True)
    intake_add = intake.add_parser("add")
    intake_add.add_argument("application_id")
    intake_add.add_argument("--content", required=True)
    intake_add.add_argument("--created-by", default="agent")
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
    artifact_update = artifact.add_parser("update-state")
    artifact_update.add_argument("artifact_id")
    artifact_update.add_argument("--state", required=True, choices=["draft", "reviewed", "submitted", "archived"])
    artifact_update.add_argument("--notes")

    render = sub.add_parser("render").add_subparsers(dest="render_command", required=True)
    render_cv = render.add_parser("cv")
    render_cv.add_argument("--output", default=".private/artifacts/cv.tex")
    render_cover = render.add_parser("cover-letter")
    render_cover.add_argument("application_id")
    render_cover.add_argument("--body", default="Draft body pending review.")
    render_cover.add_argument("--output", default=".private/artifacts/cover-letter.tex")

    profile = sub.add_parser("profile").add_subparsers(dest="profile_command", required=True)
    profile_set = profile.add_parser("set")
    profile_set.add_argument("key")
    profile_set.add_argument("value")
    profile.add_parser("missing")
    profile_fact = profile.add_parser("fact").add_subparsers(dest="fact_command", required=True)
    profile_fact_add = profile_fact.add_parser("add")
    profile_fact_add.add_argument("--type", dest="fact_type", required=True)
    profile_fact_add.add_argument("--title", default="")
    profile_fact_add.add_argument("--body", default="")
    profile_fact_add.add_argument("--tags", default="")
    profile_fact_add.add_argument("--visibility", default="private", choices=["public", "professional", "private", "sensitive"])
    profile_fact_add.add_argument(
        "--exposure",
        default="summarized",
        choices=["raw", "anonymized", "summarized", "placeholder", "redacted", "denied"],
    )
    profile_fact_add.add_argument("--use-for-cv", action="store_true")
    profile_fact_add.add_argument("--use-for-cover-letter", action="store_true")
    profile_fact_add.add_argument("--use-for-agent-context", action="store_true")
    profile_fact_add.add_argument("--use-for-market-research", action="store_true")
    profile_fact_add.add_argument("--no-dashboard", action="store_true")
    profile_fact.add_parser("list")
    profile_fact_show = profile_fact.add_parser("show")
    profile_fact_show.add_argument("id")
    profile_fact_update = profile_fact.add_parser("update")
    profile_fact_update.add_argument("id")
    profile_fact_update.add_argument("--type", dest="fact_type")
    profile_fact_update.add_argument("--title")
    profile_fact_update.add_argument("--body")
    profile_fact_update.add_argument("--tags")
    profile_fact_update.add_argument("--visibility", choices=["public", "professional", "private", "sensitive"])
    profile_fact_update.add_argument("--exposure", choices=["raw", "anonymized", "summarized", "placeholder", "redacted", "denied"])
    profile_fact_update.add_argument("--use-for-cv", action=argparse.BooleanOptionalAction, default=None)
    profile_fact_update.add_argument("--use-for-cover-letter", action=argparse.BooleanOptionalAction, default=None)
    profile_fact_update.add_argument("--use-for-agent-context", action=argparse.BooleanOptionalAction, default=None)
    profile_fact_update.add_argument("--use-for-market-research", action=argparse.BooleanOptionalAction, default=None)
    profile_fact_update.add_argument("--use-for-dashboard", action=argparse.BooleanOptionalAction, default=None)
    profile_fact_archive = profile_fact.add_parser("archive")
    profile_fact_archive.add_argument("id")
    profile_context_p = profile.add_parser("context")
    profile_context_p.add_argument("--purpose", required=True)
    profile_context_p.add_argument("--scope", default="agent")

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
    career_plan_update.add_argument("--body")
    career_plan_update.add_argument("--objectives")
    career_plan_update.add_argument("--constraints")
    career_plan_update.add_argument("--target-markets")
    career_plan_update.add_argument("--target-roles")
    career_plan_update.add_argument("--source")
    career_plan_update.add_argument("--review-state", choices=["active", "archived"])
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
    task.add_parser("list")
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

    export = sub.add_parser("export").add_subparsers(dest="export_command", required=True)
    static_demo = export.add_parser("static-demo")
    static_demo.add_argument("output", nargs="?", default="outputs/static-demo.html")

    review_queue_p = sub.add_parser("review-queue")
    review_queue_p.add_argument("application_id", nargs="?")

    sub.add_parser("agent-guide")
    sub.add_parser("mcp-descriptor")
    sub.add_parser("mcp-validate")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "init":
        print(init_db(args.storage))
        return 0
    if args.command == "launch":
        launch(args.storage, args.read_only, port=args.port, agent_api=args.agent_api)
        return 0
    if args.command == "agent-guide":
        print(agent_guide())
        return 0
    if args.command == "mcp-descriptor":
        print(json.dumps(mcp_descriptor(), indent=2))
        return 0
    if args.command == "mcp-validate":
        validate_descriptor()
        print("ok")
        return 0

    init_db(args.storage)
    with connect(args.storage) as conn:
        if args.command == "agent" and args.agent_command == "next":
            print(json.dumps({"task": next_agent_task_envelope(conn)}, indent=2))
        elif args.command == "agent" and args.agent_command == "tasks":
            print(json.dumps(list_agent_task_envelopes(conn, state=args.state, limit=args.limit), indent=2))
        elif args.command == "agent" and args.agent_command == "context":
            print(json.dumps(build_agent_task_context(conn, args.task_handle), indent=2))
        elif args.command == "agent" and args.agent_command == "packet":
            print(json.dumps(build_task_packet(conn, args.task_handle), indent=2))
        elif args.command == "agent" and args.agent_command == "dispatch":
            if args.backend == "manual":
                print(json.dumps(dispatch_manual(conn, args.storage, args.task_handle), indent=2))
            elif args.backend == "command":
                print(json.dumps(dispatch_command(conn, args.task_handle, args.cmd), indent=2))
        elif args.command == "agent" and args.agent_command == "submit":
            result_body = Path(args.result_file).read_text(encoding="utf-8") if args.result_file else args.result_body
            task = submit_agent_task_result(
                conn,
                args.task_handle,
                result_body,
                result_title=args.result_title,
                agent_name=args.agent_name,
                agent_runtime=args.agent_runtime,
                model_provider=args.model_provider,
            )
            print(json.dumps(task_result_ack(task), indent=2))
        elif args.command == "agent" and args.agent_command == "claim":
            print(json.dumps(claim_agent_task(conn, args.task_handle, agent_name=args.agent_name, agent_runtime=args.agent_runtime), indent=2))
        elif args.command == "agent" and args.agent_command == "release":
            print(json.dumps(release_agent_task(conn, args.task_handle), indent=2))
        elif args.command == "agent" and args.agent_command == "context-bundle":
            print(json.dumps(get_agent_context_bundle(conn, args.purpose), indent=2))
        elif args.command == "agent" and args.agent_command == "action" and args.agent_action_command == "submit":
            action_body = Path(args.input_file).read_text(encoding="utf-8") if args.input_file else args.input_body
            print(
                json.dumps(
                    submit_agent_action(
                        conn,
                        action_body,
                        agent_name=args.agent_name,
                        agent_runtime=args.agent_runtime,
                        model_provider=args.model_provider,
                        storage_path=args.storage,
                    ),
                    indent=2,
                )
            )
        elif args.command == "app" and args.app_command == "create":
            print(json.dumps(create_application(conn, company=args.company, role=args.role, status=args.status, priority=args.priority), indent=2))
        elif args.command == "app" and args.app_command == "update":
            values = vars(args)
            fields = {
                key.replace("_", "-").replace("-", "_"): value
                for key, value in values.items()
                if key not in {"command", "app_command", "id", "storage"} and value is not None
            }
            print(json.dumps(update_application(conn, args.id, **fields), indent=2))
        elif args.command == "app" and args.app_command == "list":
            print(json.dumps(list_applications(conn), indent=2))
        elif args.command == "app" and args.app_command == "show":
            print(json.dumps(get_application(conn, args.id), indent=2))
        elif args.command == "intake" and args.intake_command == "add":
            print(json.dumps(add_raw_intake(conn, args.application_id, args.content, args.created_by), indent=2))
        elif args.command == "intake" and args.intake_command == "raw-offer":
            print(json.dumps(create_raw_offer_intake(conn, args.content, "user"), indent=2))
        elif args.command == "artifact" and args.artifact_command == "list":
            print(json.dumps(list_artifacts(conn, args.application_id), indent=2))
        elif args.command == "artifact" and args.artifact_command == "save":
            print(json.dumps(save_artifact(conn, args.application_id, args.type, args.path, args.label, source_context="cli"), indent=2))
        elif args.command == "artifact" and args.artifact_command == "update-state":
            print(json.dumps(update_artifact_state(conn, args.artifact_id, args.state, args.notes), indent=2))
        elif args.command == "render" and args.render_command == "cv":
            print(json.dumps(render_to_file(conn, "cv", args.output), indent=2))
        elif args.command == "render" and args.render_command == "cover-letter":
            print(json.dumps(render_to_file(conn, "cover-letter", args.output, args.application_id, {"artifact.cover_letter.body": args.body}), indent=2))
        elif args.command == "profile" and args.profile_command == "set":
            set_profile_variable(conn, args.key, args.value)
            print("ok")
        elif args.command == "profile" and args.profile_command == "missing":
            print(json.dumps(required_profile_variables(conn), indent=2))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "add":
            print(
                json.dumps(
                    create_profile_fact(
                        conn,
                        fact_type=args.fact_type,
                        title=args.title,
                        body=args.body,
                        tags=args.tags,
                        visibility=args.visibility,
                        exposure=args.exposure,
                        use_for_cv=args.use_for_cv,
                        use_for_cover_letter=args.use_for_cover_letter,
                        use_for_agent_context=args.use_for_agent_context,
                        use_for_market_research=args.use_for_market_research,
                        use_for_dashboard=not args.no_dashboard,
                        source="cli",
                    ),
                    indent=2,
                )
            )
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "list":
            print(json.dumps(list_profile_facts(conn), indent=2))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "show":
            print(json.dumps(get_profile_fact(conn, args.id), indent=2))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "update":
            fields = {
                key: value
                for key, value in vars(args).items()
                if key
                in {
                    "fact_type",
                    "title",
                    "body",
                    "tags",
                    "visibility",
                    "exposure",
                    "use_for_cv",
                    "use_for_cover_letter",
                    "use_for_agent_context",
                    "use_for_market_research",
                    "use_for_dashboard",
                }
                and value is not None
            }
            print(json.dumps(update_profile_fact(conn, args.id, **fields), indent=2))
        elif args.command == "profile" and args.profile_command == "fact" and args.fact_command == "archive":
            print(json.dumps(archive_profile_fact(conn, args.id), indent=2))
        elif args.command == "profile" and args.profile_command == "context":
            print(json.dumps(profile_context(conn, args.purpose, scope=args.scope), indent=2))
        elif args.command == "career-plan" and args.career_plan_command == "add":
            print(
                json.dumps(
                    create_career_plan(
                        conn,
                        body=args.body,
                        objectives=args.objectives,
                        constraints=args.constraints,
                        target_markets=args.target_markets,
                        target_roles=args.target_roles,
                        source=args.source,
                    ),
                    indent=2,
                )
            )
        elif args.command == "career-plan" and args.career_plan_command == "list":
            print(json.dumps(list_career_plans(conn, include_archived=args.include_archived), indent=2))
        elif args.command == "career-plan" and args.career_plan_command == "show":
            print(json.dumps(get_career_plan(conn, args.id), indent=2))
        elif args.command == "career-plan" and args.career_plan_command == "update":
            fields = {
                key: value
                for key, value in vars(args).items()
                if key in {"body", "objectives", "constraints", "target_markets", "target_roles", "source", "review_state"} and value is not None
            }
            print(json.dumps(update_career_plan(conn, args.id, **fields), indent=2))
        elif args.command == "career-plan" and args.career_plan_command == "archive":
            print(json.dumps(archive_career_plan(conn, args.id), indent=2))
        elif args.command == "career-plan" and args.career_plan_command == "context":
            print(json.dumps(career_plan_context(conn, args.purpose, scope=args.scope), indent=2))
        elif args.command == "glossary" and args.glossary_command == "set":
            print(json.dumps(upsert_glossary_term(conn, args.term, args.definition, args.category), indent=2))
        elif args.command == "keyword" and args.keyword_command == "alias":
            print(json.dumps(add_keyword_alias(conn, args.term, args.alias), indent=2))
        elif args.command == "keyword" and args.keyword_command == "note":
            print(json.dumps(create_keyword_note(conn, args.term, args.body, created_by=args.created_by), indent=2))
        elif args.command == "task" and args.task_command == "create":
            print(
                json.dumps(
                    create_task(
                        conn,
                        args.type,
                        args.title,
                        application_id=args.application_id,
                        instructions=args.instructions,
                        priority=args.priority,
                        context_hint=args.context_hint,
                        created_by="cli",
                    ),
                    indent=2,
                )
            )
        elif args.command == "task" and args.task_command == "list":
            print(json.dumps(list_tasks(conn), indent=2))
        elif args.command == "task" and args.task_command == "show":
            print(json.dumps(get_task(conn, args.id), indent=2))
        elif args.command == "task" and args.task_command == "complete":
            print(
                json.dumps(
                    complete_task(
                        conn,
                        args.id,
                        result_body=args.result_body,
                        result_title=args.result_title,
                        agent_name=args.agent_name,
                        agent_runtime=args.agent_runtime,
                    ),
                    indent=2,
                )
            )
        elif args.command == "task" and args.task_command == "apply":
            print(json.dumps(apply_task_result(conn, args.id), indent=2))
        elif args.command == "todo" and args.todo_command == "create":
            print(json.dumps(create_todo(conn, args.title, application_id=args.application_id, body=args.body, pinned=args.pinned), indent=2))
        elif args.command == "todo" and args.todo_command == "list":
            print(json.dumps(list_todos(conn, args.application_id), indent=2))
        elif args.command == "todo" and args.todo_command == "update":
            fields = {key: value for key, value in vars(args).items() if key in {"state", "title", "body", "pinned"} and value not in (None, False)}
            print(json.dumps(update_todo(conn, args.id, **fields), indent=2))
        elif args.command == "note" and args.note_command == "add":
            print(json.dumps(create_note(conn, args.body, application_id=args.application_id, note_type=args.type, created_by=args.created_by), indent=2))
        elif args.command == "note" and args.note_command == "list":
            print(json.dumps(list_notes(conn, args.application_id), indent=2))
        elif args.command == "blob" and args.blob_command == "add":
            print(
                json.dumps(
                    create_text_blob(
                        conn,
                        args.type,
                        args.body,
                        application_id=args.application_id,
                        title=args.title,
                        review_state=args.review_state,
                        created_by="cli",
                    ),
                    indent=2,
                )
            )
        elif args.command == "blob" and args.blob_command == "list":
            print(json.dumps(list_text_blobs(conn, args.application_id), indent=2))
        elif args.command == "variable" and args.variable_command == "set":
            print(json.dumps(set_variable(conn, args.key, args.value, exposure=args.exposure, summary=args.summary), indent=2))
        elif args.command == "variable" and args.variable_command == "list":
            print(json.dumps(list_variables(conn), indent=2))
        elif args.command == "search":
            try:
                rebuild_index(conn)
                print(json.dumps(search(conn, args.query), indent=2))
            except SearchUnavailable as exc:
                print(json.dumps({"available": False, "error": str(exc), "results": []}, indent=2))
        elif args.command == "export" and args.export_command == "static-demo":
            print(export_static_demo(args.output))
        elif args.command == "review-queue":
            print(json.dumps(review_queue(dashboard_payload(conn), args.application_id), indent=2))
        else:
            raise SystemExit(f"Unhandled command: {args.command}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
