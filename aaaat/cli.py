from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import __version__
from .agent_guides import agent_guide
from .artifacts import list_artifacts, save_artifact
from .db import add_raw_intake, connect, create_application, get_application, init_db, list_applications, set_profile_variable
from .mcp_server import mcp_descriptor, validate_descriptor
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

    intake = sub.add_parser("intake").add_subparsers(dest="intake_command", required=True)
    intake_add = intake.add_parser("add")
    intake_add.add_argument("application_id")
    intake_add.add_argument("--content", required=True)
    intake_add.add_argument("--created-by", default="agent")

    artifact = sub.add_parser("artifact").add_subparsers(dest="artifact_command", required=True)
    artifact_list = artifact.add_parser("list")
    artifact_list.add_argument("application_id", nargs="?")
    artifact_save = artifact.add_parser("save")
    artifact_save.add_argument("--application-id")
    artifact_save.add_argument("--type", required=True)
    artifact_save.add_argument("--path", required=True)
    artifact_save.add_argument("--label", required=True)

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

    export = sub.add_parser("export").add_subparsers(dest="export_command", required=True)
    static_demo = export.add_parser("static-demo")
    static_demo.add_argument("output", nargs="?", default="outputs/static-demo.html")

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
        elif args.command == "app" and args.app_command == "list":
            print(json.dumps(list_applications(conn), indent=2))
        elif args.command == "app" and args.app_command == "show":
            print(json.dumps(get_application(conn, args.id), indent=2))
        elif args.command == "intake" and args.intake_command == "add":
            print(json.dumps(add_raw_intake(conn, args.application_id, args.content, args.created_by), indent=2))
        elif args.command == "artifact" and args.artifact_command == "list":
            print(json.dumps(list_artifacts(conn, args.application_id), indent=2))
        elif args.command == "artifact" and args.artifact_command == "save":
            print(json.dumps(save_artifact(conn, args.application_id, args.type, args.path, args.label, source_context="cli"), indent=2))
        elif args.command == "render" and args.render_command == "cv":
            print(json.dumps(render_to_file(conn, "cv", args.output), indent=2))
        elif args.command == "render" and args.render_command == "cover-letter":
            print(json.dumps(render_to_file(conn, "cover-letter", args.output, args.application_id, {"artifact.cover_letter.body": args.body}), indent=2))
        elif args.command == "profile" and args.profile_command == "set":
            set_profile_variable(conn, args.key, args.value)
            print("ok")
        elif args.command == "export" and args.export_command == "static-demo":
            print(export_static_demo(args.output))
        else:
            raise SystemExit(f"Unhandled command: {args.command}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
