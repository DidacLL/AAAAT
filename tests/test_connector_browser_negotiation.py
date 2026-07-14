from __future__ import annotations

import io
import json
import struct
import sys
from pathlib import Path
from unittest.mock import patch

from aaaat.browser_companion import PROTOCOL, VERSION, dispatch_native_message, run_native_host
from aaaat.connector_packages import (
    connector_construction_prompt,
    install_connector_package,
    parse_connector_package,
    preview_connector_package,
)
from aaaat.db import connect, init_db
from aaaat.runtime_conformance import validate_runtime_proposal
from aaaat.tasks import create_task


def _package() -> dict:
    return {
        "protocol": "aaaat.connector-package",
        "manifest": {
            "name": "test-connector",
            "entrypoint": "connector.py",
            "argv": ["connector.py"],
            "prompt_transport": "stdin",
            "result_transport": "stdout",
        },
        "files": {
            "connector.py": "#!/usr/bin/env python3\nimport json,sys\ntask=json.load(sys.stdin)\nprint(json.dumps({'result':'ok'}))\n",
            "README.md": "Generated connector test fixture.",
        },
    }


def test_connector_package_is_previewed_and_installed_disabled(tmp_path: Path) -> None:
    parsed = parse_connector_package(_package())
    preview = preview_connector_package(parsed)
    assert preview["manifest"]["name"] == "test-connector"
    assert {item["path"] for item in preview["files"]} == {"connector.py", "README.md"}
    installed = install_connector_package(tmp_path, parsed)
    assert installed["status"] == "installed_disabled"
    assert Path(installed["directory"], "connector.py").is_file()
    assert installed["argv"][0].endswith("connector.py")


def test_connector_package_rejects_traversal_and_forbidden_code() -> None:
    invalid = _package()
    invalid["files"] = {"../escape.py": "print('bad')"}
    try:
        parse_connector_package(invalid)
    except ValueError as exc:
        assert "Unsafe connector path" in str(exc)
    else:
        raise AssertionError("Traversal package was accepted")

    forbidden = _package()
    forbidden["files"]["connector.py"] = "import socket\ns=socket.socket();s.listen(3)\n"
    try:
        install_connector_package(".private-test", forbidden)
    except ValueError as exc:
        assert "forbidden pattern" in str(exc)
    else:
        raise AssertionError("Listening connector was accepted")


def test_construction_prompt_contains_no_credentials_or_ports() -> None:
    prompt = connector_construction_prompt()
    lowered = prompt.lower()
    assert "api key" not in lowered
    assert "bearer" not in lowered
    assert "listening ports" in lowered
    assert "stdin" in lowered and "stdout" in lowered


def test_runtime_proposal_is_advisory_and_bounded() -> None:
    proposal = validate_runtime_proposal(
        {
            "conformance_nonce": "nonce",
            "runtime_name": "Local Runtime",
            "model_name": "Model A",
            "supports_structured_json": True,
            "supports_research": False,
            "recommended_timeout_seconds": 120,
        },
        "nonce",
    )
    assert proposal["runtime_name"] == "Local Runtime"
    assert proposal["recommended_timeout_seconds"] == 120
    try:
        validate_runtime_proposal({"conformance_nonce": "nonce", "runtime_name": "x", "model_name": "y", "command": "rm -rf /"}, "nonce")
    except ValueError as exc:
        assert "forbidden" in str(exc)
    else:
        raise AssertionError("Runtime proposal gained command authority")


def test_browser_native_host_exposes_only_bounded_task_operations(tmp_path: Path) -> None:
    init_db(tmp_path)
    with connect(tmp_path) as conn:
        create_task(conn, "profile_completion", "Complete profile")
    next_response = dispatch_native_message(tmp_path, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "next_task"})
    assert next_response["status"] == "ready"
    task = next_response["task"]
    assert task["task_handle"].startswith("taskh_")
    assert "application_id" not in json.dumps(task)
    context_response = dispatch_native_message(tmp_path, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "task_context", "task_handle": task["task_handle"]})
    assert context_response["status"] == "ready"
    serialized = json.dumps(context_response)
    for forbidden in ("storage_path", "database_path", "application_id"):
        assert forbidden not in serialized
    unsupported = dispatch_native_message(tmp_path, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "list_applications"})
    assert unsupported == {"status": "error", "error": "unsupported_action"}


def test_native_host_uses_browser_length_prefixed_messages(tmp_path: Path) -> None:
    init_db(tmp_path)
    request = json.dumps({"protocol": PROTOCOL, "protocol_version": VERSION, "action": "next_task"}).encode("utf-8")
    source = io.BytesIO(struct.pack("<I", len(request)) + request)
    target = io.BytesIO()
    assert run_native_host(tmp_path, source, target) == 0
    target.seek(0)
    size = struct.unpack("<I", target.read(4))[0]
    response = json.loads(target.read(size).decode("utf-8"))
    assert response["status"] == "empty"
