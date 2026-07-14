from __future__ import annotations

import json
import struct
import sys
from pathlib import Path
from typing import Any, BinaryIO

from .agent_access import build_agent_task_context, next_agent_task_envelope, submit_agent_task_result
from .db import connect
from .workspace_config import storage_directory

HOST_NAME = "org.aaaat.browser_companion"
PROTOCOL = "aaaat.browser-native"
VERSION = 1


def native_host_manifest(storage_path: str | Path, executable: str) -> dict[str, Any]:
    return {
        "name": HOST_NAME,
        "description": "AAAAT bounded browser companion",
        "path": str(Path(executable).resolve()),
        "type": "stdio",
        "allowed_origins": ["chrome-extension://__AAAT_EXTENSION_ID__/"],
        "aaaat": {"protocol": PROTOCOL, "protocol_version": VERSION, "storage": str(storage_directory(storage_path))},
    }


def browser_extension_bundle() -> dict[str, str]:
    return {
        "manifest.json": json.dumps({
            "manifest_version": 3,
            "name": "AAAAT Browser Companion",
            "version": "1.0.0",
            "permissions": ["nativeMessaging", "activeTab", "scripting"],
            "action": {"default_popup": "popup.html"},
        }, indent=2),
        "popup.html": "<!doctype html><meta charset='utf-8'><button id='send'>Send next AAAAT task</button><pre id='status'></pre><script src='popup.js'></script>",
        "popup.js": "const status=document.getElementById('status');document.getElementById('send').onclick=()=>{const p=chrome.runtime.connectNative('org.aaaat.browser_companion');p.onMessage.addListener(m=>status.textContent=JSON.stringify(m,null,2));p.postMessage({protocol:'aaaat.browser-native',protocol_version:1,action:'next_task'});};",
        "README.txt": "Load this unpacked extension, install the generated native-host manifest, then adapt page interaction in popup.js or a site-specific content script. Authentication remains in the browser. AAAAT exchanges bounded messages only.",
    }


def dispatch_native_message(storage_path: str | Path, message: dict[str, Any]) -> dict[str, Any]:
    if message.get("protocol") != PROTOCOL or message.get("protocol_version") != VERSION:
        return {"status": "error", "error": "unsupported_protocol"}
    action = str(message.get("action") or "")
    with connect(storage_path) as conn:
        if action == "next_task":
            task = next_agent_task_envelope(conn)
            return {"status": "empty"} if task is None else {"status": "ready", "task": task}
        if action == "task_context":
            handle = str(message.get("task_handle") or "")
            return {"status": "ready", "context": build_agent_task_context(conn, handle)}
        if action == "submit_result":
            handle = str(message.get("task_handle") or "")
            result = message.get("result")
            if not isinstance(result, dict):
                return {"status": "error", "error": "result_must_be_object"}
            acknowledgement = submit_agent_task_result(
                conn,
                handle,
                json.dumps(result, ensure_ascii=False),
                agent_name=str(message.get("agent_name") or "browser-companion")[:200],
                agent_runtime="browser-native-messaging",
                model_provider=str(message.get("model_provider") or "")[:200],
            )
            return {"status": "accepted", "acknowledgement": acknowledgement}
    return {"status": "error", "error": "unsupported_action"}


def run_native_host(storage_path: str | Path, input_stream: BinaryIO | None = None, output_stream: BinaryIO | None = None) -> int:
    source = input_stream or sys.stdin.buffer
    target = output_stream or sys.stdout.buffer
    while True:
        header = source.read(4)
        if not header:
            return 0
        if len(header) != 4:
            return 2
        length = struct.unpack("<I", header)[0]
        if length > 2_000_000:
            _write_message(target, {"status": "error", "error": "message_too_large"})
            return 3
        raw = source.read(length)
        if len(raw) != length:
            return 2
        try:
            message = json.loads(raw.decode("utf-8"))
            if not isinstance(message, dict):
                raise ValueError("message must be object")
            response = dispatch_native_message(storage_path, message)
        except Exception as exc:
            response = {"status": "error", "error": str(exc)[:1000]}
        _write_message(target, response)


def _write_message(stream: BinaryIO, message: dict[str, Any]) -> None:
    body = json.dumps(message, ensure_ascii=False).encode("utf-8")
    stream.write(struct.pack("<I", len(body)))
    stream.write(body)
    stream.flush()
