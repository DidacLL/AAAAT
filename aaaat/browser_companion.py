from __future__ import annotations

import argparse
import json
import os
import struct
import sys
from pathlib import Path
from typing import Any, BinaryIO

from .agent_work import claim_next_agent_work, report_agent_task_progress
from .db import connect
from .result_ingestion import ingest_task_result
from .workspace_config import storage_directory

HOST_NAME = "org.aaaat.browser_companion"
PROTOCOL = "aaaat.browser-native"
VERSION = 1


def native_host_manifest(_storage_path: str | Path, executable: str) -> dict[str, Any]:
    """Return the browser-visible manifest without workspace configuration.

    The native host is configured locally by its launcher or environment; the
    extension must never receive the workspace or database location.
    """
    return {
        "name": HOST_NAME,
        "description": "AAAAT bounded browser companion",
        "path": str(Path(executable).resolve()),
        "type": "stdio",
        "allowed_origins": ["chrome-extension://__AAAT_EXTENSION_ID__/"],
        "aaaat": {"protocol": PROTOCOL, "protocol_version": VERSION},
    }


def browser_extension_bundle() -> dict[str, str]:
    return {
        "manifest.json": json.dumps({"manifest_version": 3, "name": "AAAAT Browser Companion", "version": "1.0.0", "permissions": ["nativeMessaging", "activeTab", "scripting"], "action": {"default_popup": "popup.html"}}, indent=2),
        "popup.html": "<!doctype html><meta charset='utf-8'><style>body{min-width:360px;font:14px sans-serif}textarea{width:100%;height:100px}button{margin:4px 4px 4px 0}</style><button id='next'>Get AAAAT work</button><button id='progress' disabled>Send progress</button><button id='submit' disabled>Submit result</button><textarea id='result' placeholder='Paste one JSON result object here'></textarea><pre id='status'></pre><script src='popup.js'></script>",
        "popup.js": _popup_script(),
        "README.txt": "Load this unpacked extension and install the native-host manifest. Get one complete AAAAT work item, use it with the browser or chat AI you trust, then paste its one JSON result object and submit it. The bridge accepts only capability-scoped progress and results. Authentication remains with the browser or external host.",
    }


def dispatch_native_message(storage_path: str | Path, message: dict[str, Any]) -> dict[str, Any]:
    if message.get("protocol") != PROTOCOL or message.get("protocol_version") != VERSION:
        return {"status": "error", "error": "unsupported_protocol"}
    action = str(message.get("action") or "")
    with connect(storage_path) as conn:
        if action == "next_work":
            work = claim_next_agent_work(conn)
            return {"status": "empty"} if work is None else {"status": "ready", "work": work}
        if action == "report_progress":
            acknowledgement = report_agent_task_progress(
                conn,
                str(message.get("task_capability") or ""),
                phase=str(message.get("phase") or ""),
                message=str(message.get("message") or ""),
                percent=message.get("percent"),
            )
            return acknowledgement
        if action == "submit_result":
            capability = str(message.get("task_capability") or "")
            result = message.get("result")
            if not isinstance(result, dict):
                return {"status": "error", "error": "result_must_be_object"}
            acknowledgement = ingest_task_result(
                conn,
                capability,
                result,
                provenance={
                    "agent_name": str(message.get("agent_name") or "browser-companion"),
                    "agent_runtime": "browser-native-messaging",
                    "model_provider": str(message.get("model_provider") or ""),
                },
            )
            return {"status": "accepted", "acknowledgement": acknowledgement}
    return {"status": "error", "error": "unsupported_action"}


def _popup_script() -> str:
    """Keep extension behavior deliberately small: one claim, progress, then result."""
    return """const status=document.getElementById('status');let capability='';
const send=(message)=>new Promise((resolve,reject)=>{const port=chrome.runtime.connectNative('org.aaaat.browser_companion');port.onMessage.addListener(resolve);port.onDisconnect.addListener(()=>{if(chrome.runtime.lastError)reject(new Error(chrome.runtime.lastError.message));});port.postMessage({protocol:'aaaat.browser-native',protocol_version:1,...message});});
const show=(value)=>status.textContent=JSON.stringify(value,null,2);
document.getElementById('next').onclick=async()=>{try{const response=await send({action:'next_work'});capability=String(response?.work?.task?.task_capability||'');document.getElementById('progress').disabled=!capability;document.getElementById('submit').disabled=!capability;show(response);}catch(error){show({status:'error',error:String(error)});}};
document.getElementById('progress').onclick=async()=>{try{show(await send({action:'report_progress',task_capability:capability,phase:'working',message:'Work shared with selected browser or chat AI',percent:50}));}catch(error){show({status:'error',error:String(error)});}};
document.getElementById('submit').onclick=async()=>{try{const result=JSON.parse(document.getElementById('result').value);const response=await send({action:'submit_result',task_capability:capability,result});if(response.status==='accepted'){capability='';document.getElementById('progress').disabled=true;document.getElementById('submit').disabled=true;}show(response);}catch(error){show({status:'error',error:'Paste one valid JSON result object: '+String(error)});}};"""


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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="aaaat-browser-host", description="Run the AAAAT bounded browser native-messaging host.")
    parser.add_argument("--storage", default=os.environ.get("AAAAT_BROWSER_STORAGE", ".private"))
    parser.add_argument("--print-manifest", action="store_true")
    parser.add_argument("--self-test", action="store_true", help="Print protocol metadata and exit without waiting for browser input.")
    args = parser.parse_args(argv)
    if args.print_manifest:
        print(json.dumps(native_host_manifest(args.storage, sys.argv[0]), ensure_ascii=False, indent=2))
        return 0
    if args.self_test:
        print(json.dumps({"status": "ready", "host": HOST_NAME, "protocol": PROTOCOL, "protocol_version": VERSION, "transport": "browser-native-messaging-stdio"}, ensure_ascii=False, indent=2))
        return 0
    if sys.stdin.isatty():
        print(
            "aaaat-browser-host is a browser native-messaging process and waits for binary messages on stdin. "
            "Do not run it interactively. Use --self-test, --print-manifest, or launch it through the installed browser extension.",
            file=sys.stderr,
        )
        return 2
    return run_native_host(args.storage)


def _write_message(stream: BinaryIO, message: dict[str, Any]) -> None:
    body = json.dumps(message, ensure_ascii=False).encode("utf-8")
    stream.write(struct.pack("<I", len(body)))
    stream.write(body)
    stream.flush()


if __name__ == "__main__":
    raise SystemExit(main())
