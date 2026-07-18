from __future__ import annotations

from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


Path("aaaat/workspace_recovery.py").write_text(
    '''from __future__ import annotations

import json
import sqlite3
from typing import Any

from .assisted_profile import apply_profile_completion_result
from .tasks import update_task
from .text_blobs import get_text_blob

_LEGACY_FAILURE_MARKER = "Result kept as history:"
_RECOVERY_MARKER = "Legacy profile result recovered automatically."


def recover_legacy_profile_completion(conn: sqlite3.Connection) -> dict[str, Any]:
    """Repair profile work consumed by the pre-validation-order V1 bridge bug."""
    rows = conn.execute(
        """SELECT id, result_blob_id, notes, agent_name, agent_runtime
        FROM tasks
        WHERE task_type = 'profile_completion'
          AND state = 'completed'
          AND notes LIKE ?
          AND notes NOT LIKE ?
        ORDER BY completed_at, updated_at, id""",
        (f"%{_LEGACY_FAILURE_MARKER}%", f"%{_RECOVERY_MARKER}%"),
    ).fetchall()
    if not rows:
        return {"status": "none", "recovered": 0}

    recovered = 0
    failed = 0
    for row in rows:
        task_id = str(row["id"])
        notes = str(row["notes"] or "")
        try:
            blob_id = str(row["result_blob_id"] or "")
            if not blob_id:
                raise ValueError("legacy profile result has no stored body")
            body = str(get_text_blob(conn, blob_id).get("body") or "")
            payload = json.loads(body)
            if not isinstance(payload, dict):
                raise ValueError("legacy profile result is not an object")
            variables = payload.get("variables", payload.get("fields"))
            if not isinstance(variables, dict):
                raise ValueError("legacy profile result has no variables object")

            normalized: dict[str, str] = {}
            for raw_key, value in variables.items():
                if value is None:
                    continue
                key = str(raw_key).strip()
                if isinstance(value, str):
                    normalized[key] = value
                elif isinstance(value, list) and all(isinstance(item, str) for item in value):
                    normalized[key] = "; ".join(item.strip() for item in value if item.strip())
                else:
                    normalized[key] = json.dumps(value, ensure_ascii=False, sort_keys=True)

            acknowledgement = apply_profile_completion_result(
                conn,
                json.dumps({"variables": normalized}, ensure_ascii=False),
                agent_name=str(row["agent_name"] or ""),
                agent_runtime=str(row["agent_runtime"] or ""),
            )
            updated = len(acknowledgement.get("updated") or [])
            retained = len(acknowledgement.get("retained") or [])
            suffix = f"{_RECOVERY_MARKER} Updated {updated}; retained {retained}."
            update_task(conn, task_id, notes=(notes + "\n" + suffix).strip())
            recovered += 1
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            suffix = f"Automatic legacy recovery could not apply this result: {exc}"
            update_task(conn, task_id, state="failed", notes=(notes + "\n" + suffix).strip())
            failed += 1

    return {
        "status": "recovered" if recovered else "failed",
        "recovered": recovered,
        "failed": failed,
    }
''',
    encoding="utf-8",
)

replace_once(
    "aaaat/mcp_runtime.py",
    "from .result_ingestion import ingest_task_result\n",
    "from .result_ingestion import ingest_task_result\nfrom .workspace_recovery import recover_legacy_profile_completion\n",
)
replace_once(
    "aaaat/mcp_runtime.py",
    '''    with connect(storage) as conn:\n        if name == "get_next_agent_work":\n            work = claim_next_agent_work(conn)\n            return {"status": "empty"} if work is None else {"status": "ready", "work": work}\n''',
    '''    with connect(storage) as conn:\n        recovery = recover_legacy_profile_completion(conn)\n        if name == "get_next_agent_work":\n            work = claim_next_agent_work(conn)\n            if work is not None:\n                return {"status": "ready", "work": work}\n            if recovery.get("status") == "recovered":\n                return {"status": "recovered", "recovered_work": "profile_completion"}\n            return {"status": "empty"}\n''',
)

replace_once(
    "aaaat/ui_desktop/app.py",
    "from aaaat.payload import dashboard_payload\n",
    "from aaaat.payload import dashboard_payload\nfrom aaaat.workspace_recovery import recover_legacy_profile_completion\n",
)
replace_once(
    "aaaat/ui_desktop/app.py",
    '''    with connect(storage) as conn:\n        payload = dashboard_payload(conn, include_raw=True)\n''',
    '''    with connect(storage) as conn:\n        recover_legacy_profile_completion(conn)\n        payload = dashboard_payload(conn, include_raw=True)\n''',
)

replace_once(
    "tests/test_profile_completion.py",
    "from aaaat.tasks import get_task\n",
    "from aaaat.tasks import get_task, update_task\nfrom aaaat.text_blobs import create_text_blob\nfrom aaaat.ui_desktop.app import build_desktop_projection\nfrom aaaat.workspace_recovery import recover_legacy_profile_completion\n",
)
replace_once(
    "tests/test_profile_completion.py",
    '''    def test_local_readiness_does_not_execute_or_certify_the_external_host(self) -> None:\n''',
    '''    def test_opening_workspace_recovers_profile_result_consumed_by_old_bridge(self) -> None:\n        with tempfile.TemporaryDirectory() as tmp:\n            storage = Path(tmp) / "private"\n            ensure_workspace_database(storage)\n            task = create_profile_completion_task(storage)\n            with connect(storage) as conn:\n                task = claim_agent_work(conn, str(task["id"]))\n                blob = create_text_blob(\n                    conn,\n                    "task_result",\n                    json.dumps(\n                        {\n                            "variables": {\n                                "profile.display_name": "Recovered Name",\n                                "profile.links": ["https://example.test", "https://code.example.test"],\n                                "profile.projects": [{"name": "AAAAT", "role": "Local tool"}],\n                            }\n                        }\n                    ),\n                    title="Legacy profile result",\n                    source_context="legacy-test",\n                    state="history",\n                    created_by="agent",\n                )\n                update_task(\n                    conn,\n                    str(task["id"]),\n                    state="completed",\n                    result_blob_id=str(blob["id"]),\n                    completed_at="2026-07-18T00:00:00+00:00",\n                    notes="Result kept as history: Profile variable must be bounded text: profile.links",\n                    agent_name="Codex",\n                    agent_runtime="OpenAI Codex",\n                )\n\n            build_desktop_projection(storage)\n\n            with connect(storage) as conn:\n                values = profile_variables(conn)\n                repaired = get_task(conn, str(task["id"]))\n                second = recover_legacy_profile_completion(conn)\n\n            self.assertEqual(values["profile.display_name"], "Recovered Name")\n            self.assertEqual(\n                values["profile.links"],\n                "https://example.test; https://code.example.test",\n            )\n            self.assertIn('"name": "AAAAT"', values["profile.projects"])\n            self.assertEqual(repaired["state"], "completed")\n            self.assertIn("Legacy profile result recovered automatically.", repaired["notes"])\n            self.assertEqual(second, {"status": "none", "recovered": 0})\n\n    def test_local_readiness_does_not_execute_or_certify_the_external_host(self) -> None:\n''',
)

replace_once(
    "tests/test_mcp_runtime.py",
    "from aaaat.tasks import create_task, get_task\n",
    "from aaaat.tasks import create_task, get_task, update_task\nfrom aaaat.text_blobs import create_text_blob\n",
)
replace_once(
    "tests/test_mcp_runtime.py",
    '''    def test_stdio_transport_is_line_delimited_json_rpc(self) -> None:\n''',
    '''    def test_get_next_work_reports_automatic_legacy_profile_recovery(self) -> None:\n        with tempfile.TemporaryDirectory() as tmp:\n            ensure_workspace_database(tmp)\n            with connect(tmp) as conn:\n                task = create_task(\n                    conn,\n                    "profile_completion",\n                    "Complete profile",\n                    context_hint="profile:completion",\n                    idempotent=False,\n                )\n                blob = create_text_blob(\n                    conn,\n                    "task_result",\n                    json.dumps({"variables": {"profile.skills": ["Python", "MCP"]}}),\n                    title="Legacy profile result",\n                    source_context="legacy-test",\n                    state="history",\n                    created_by="agent",\n                )\n                update_task(\n                    conn,\n                    str(task["id"]),\n                    state="completed",\n                    result_blob_id=str(blob["id"]),\n                    completed_at="2026-07-18T00:00:00+00:00",\n                    notes="Result kept as history: Profile variable must be bounded text: profile.skills",\n                )\n\n            response = dispatch_mcp_request(\n                tmp,\n                {\n                    "jsonrpc": "2.0",\n                    "id": 1,\n                    "method": "tools/call",\n                    "params": {"name": "get_next_agent_work", "arguments": {}},\n                },\n            )\n\n            self.assertEqual(\n                response["result"]["structuredContent"],\n                {"status": "recovered", "recovered_work": "profile_completion"},\n            )\n            with connect(tmp) as conn:\n                self.assertEqual(profile_variables(conn)["profile.skills"], "Python; MCP")\n\n    def test_stdio_transport_is_line_delimited_json_rpc(self) -> None:\n''',
)
