from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import __version__
from .agent_guides import agent_guide
from .artifacts import list_artifacts, save_artifact, update_artifact_state
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
    launch_p.add_argument("--port", type=int, default=8765)

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

    glossary = sub.add_parser("glossary").add_subparsers(dest="glossary_command", required=True)
    glossary_set = glossary.add_parser("set")
    glossary_set.add_argument("term")
    glossary_set.add_argument("--definition", required=True)
    glossary_set.add_argument("--category", default="")

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
        launch(args.storage, args.read_only, port=args.port)
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
        if args.command == "app" and args.app_command == "create":
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
        elif args.command == "glossary" and args.glossary_command == "set":
            print(json.dumps(upsert_glossary_term(conn, args.term, args.definition, args.category), indent=2))
        elif args.command == "export" and args.export_command == "static-demo":
            print(export_static_demo(args.output))
        elif args.command == "review-queue":
            print(json.dumps(review_queue(dashboard_payload(conn), args.application_id), indent=2))
        else:
            raise SystemExit(f"Unhandled command: {args.command}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
