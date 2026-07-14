from __future__ import annotations

import json
import sys
from pathlib import Path

from aaaat.agent_actions import submit_agent_action
from aaaat.assisted_profile import submit_profile_updates
from aaaat.db import connect, init_db, profile_variables
from aaaat.payload import dashboard_payload
from aaaat.provider_adapters import adapter_health
from aaaat.workspace_config import save_workspace_settings


def test_deterministic_empty_store_release_scenario(tmp_path: Path) -> None:
    storage = tmp_path / "private"
    init_db(storage)
    fake = tmp_path / "fake_agent.py"
    fake.write_text("import json,sys; json.load(sys.stdin); print(json.dumps({'result':'ok'}))", encoding="utf-8")
    health = adapter_health("argv_custom_command", {"argv": [sys.executable, str(fake)], "timeout_seconds": 10})
    assert health["status"] == "ready"
    save_workspace_settings(storage, automatic_preparation=[], local_agent_adapter_id="argv_custom_command", local_agent_adapter_settings={"argv": [sys.executable, str(fake)], "timeout_seconds": 10})

    with connect(storage) as conn:
        ack = submit_profile_updates(conn, {
            "profile.display_name": "Alex Example",
            "profile.email": "alex@example.invalid",
            "profile.location": "Madrid",
            "profile.summary.default": "Backend engineer focused on reliable local tooling.",
        }, agent_name="deterministic", agent_runtime="test")
        assert ack["status"] == "accepted"
        assert profile_variables(conn)["profile.display_name"] == "Alex Example"

        result = submit_agent_action(conn, {"action": "create_candidature", "payload": {
            "source_material": {"offer_text": "ExampleCo seeks a Python backend engineer.", "application_form_text": "Why this role?"},
            "candidature": {"company": "ExampleCo", "role": "Backend Engineer", "location": "Remote", "remote_mode": "remote", "keywords": ["Python", "SQLite"], "description": "Build reliable local systems.", "tech_stack": "Python, SQLite", "valuation": "Strong fit"},
            "outputs": {"company_research": "Private example company research.", "call_signals": "Emphasize reliability.", "pitch": "Local-first backend specialist.", "smart_question": "How is reliability measured?", "risks_to_avoid": "Do not overstate scale.", "form_answers": "I value reliable local software.", "cover_letter_body": "I am applying for the Backend Engineer role.", "cv_positioning": "Lead with Python and local-first systems."},
            "render": {"cover_letter": True, "cv": True},
            "requested_tasks": [],
        }}, agent_name="deterministic", agent_runtime="fake-adapter", model_provider="deterministic", storage_path=str(storage))
        assert result["created"] and result["rendered"] == {"cover_letter": True, "cv": True}
        payload = dashboard_payload(conn)
        app = payload["applications"][0]
        assert app["company"] == "ExampleCo"
        assert app["company_research"] and app["form_answers"]
        assert len(app["artifacts"]) == 2
        serialized = json.dumps(result)
        for forbidden in ("application_id", "candidature_id", "artifact_id", "storage_path", str(storage)):
            assert forbidden not in serialized
