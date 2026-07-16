from __future__ import annotations

import argparse
import io
import json
import platform
import shutil
import sys
import traceback
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .agent_access import build_agent_work_item, next_agent_work_item, task_capability
from .agent_actions import submit_agent_action
from .assistance_service import create_profile_completion_task
from .background_worker import OwnedTaskWorker
from .candidature_lifecycle import ensure_lifecycle_tasks, release_ready_lifecycle_tasks
from .candidatures import create_candidature, get_candidature
from .db import connect, init_db, profile_variables, set_profile_variable
from .integration_setup import configure_integration
from .host_bridge import run_host_bridge
from .host_connection import connection_status, create_connection_request
from .payload import dashboard_payload
from .portable_task_bundle import export_candidature_task_bundle, import_candidature_result_bundle, write_result_bundle
from .result_ingestion import ingest_task_result
from .runtime_conformance import run_configured_runtime_conformance
from .task_runner import TaskRunner
from .tasks import create_task, get_task, list_tasks

VERDICT_PASSED = "AUTOMATED_GATES_PASSED"
VERDICT_FAILED = "AUTOMATED_GATES_FAILED"
VERDICT_MANUAL = "MANUAL_GATES_PENDING"

_SAMPLE_PROFILE = {
    "profile.display_name": "Alex Rivera",
    "profile.email": "alex.rivera@example.invalid",
    "profile.location": "Madrid, Spain",
    "profile.summary.default": "Backend engineer focused on reliable local-first software, Python services, SQLite-backed applications, and maintainable desktop tooling.",
}
_SAMPLE_OFFER = (
    "Senior Backend Engineer — Developer Productivity\n\n"
    "Northstar Tools builds developer infrastructure for local environments, release workflows, and internal automation. "
    "The role requires Python, SQLite, subprocess integration, deterministic testing, packaging, failure recovery, and pragmatic architecture. "
    "Remote within Spain or hybrid from Madrid. Salary range: €68,000–€82,000."
)
_SAMPLE_FORM = (
    "1. Why are you interested in Northstar Tools?\n"
    "2. Describe a system where you improved reliability.\n"
    "3. Describe your Python and SQLite experience.\n"
    "4. How do you avoid overengineering?"
)
_FORBIDDEN_PACKET_KEYS = {"application_id", "candidature_id", "artifact_id", "storage_path", "file_path", "task_id"}


@dataclass
class StageResult:
    stage: str
    status: str
    started_at: str
    completed_at: str = ""
    assertions: list[str] = field(default_factory=list)
    evidence: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    error: str = ""


@dataclass
class ValidationConfig:
    storage: Path
    evidence_dir: Path
    runtime: str = "deterministic"
    command: list[str] = field(default_factory=list)
    timeout_seconds: int = 600
    keep_storage: bool = False
    model: str = ""
    model_path: str = ""
    executable: str = ""
    args: list[str] = field(default_factory=list)


class ReleaseValidator:
    def __init__(self, config: ValidationConfig) -> None:
        self.config = config
        self.results: list[StageResult] = []
        self.candidature_ref = ""

    def run(self) -> dict[str, Any]:
        if self.config.storage.exists() and not self.config.keep_storage:
            shutil.rmtree(self.config.storage)
        self.config.storage.mkdir(parents=True, exist_ok=True)
        self.config.evidence_dir.mkdir(parents=True, exist_ok=True)
        stages: tuple[tuple[str, Callable[[StageResult], None]], ...] = (
            ("environment", self._stage_environment),
            ("empty_store", self._stage_empty_store),
            ("unified_work_acquisition", self._stage_unified_work_acquisition),
            ("paired_host_bridge", self._stage_paired_host_bridge),
            ("runtime_configuration", self._stage_runtime_configuration),
            ("runtime_conformance", self._stage_runtime_conformance),
            ("profile_completion", self._stage_profile_completion),
            ("candidature_lifecycle", self._stage_candidature_lifecycle),
            ("failure_retry", self._stage_failure_retry),
            ("portable_bundle", self._stage_portable_bundle),
            ("privacy_audit", self._stage_privacy_audit),
            ("artifact_rendering", self._stage_artifact_rendering),
            ("projection_visibility", self._stage_projection_visibility),
        )
        for name, callback in stages:
            self._run_stage(name, callback)
            if self.results[-1].status == "failed":
                break
        automated = VERDICT_PASSED if self.results and all(item.status == "passed" for item in self.results) else VERDICT_FAILED
        report = {
            "protocol": "aaaat.release-validation",
            "version": 3,
            "generated_at": _now(),
            "automated_verdict": automated,
            "release_verdict": VERDICT_MANUAL if automated == VERDICT_PASSED else VERDICT_FAILED,
            "runtime_profile": self.config.runtime,
            "manual_gates": [
                "manual wx lifecycle works without an AI integration",
                "guided connection choices are understandable to a non-technical user",
                "one real external AI consumes complete bounded work through the standard MCP or equivalent wrapper",
                "one independent real host or transport completes the same bounded lifecycle",
                "one connected LLM host completes a bounded bridge round trip",
                "progress, failure, retry and cancellation where supported are visible in wx",
                "rendered document quality and desktop responsiveness are inspected",
                "realistic existing storage upgrades, backs up and reopens without data loss",
            ],
            "stages": [asdict(item) for item in self.results],
        }
        self._write_reports(report)
        return report

    def _run_stage(self, name: str, callback: Callable[[StageResult], None]) -> None:
        item = StageResult(stage=name, status="running", started_at=_now())
        try:
            callback(item)
            item.status = "passed"
        except Exception as exc:
            item.status = "failed"
            item.error = str(exc)
            item.warnings.append(traceback.format_exc(limit=8))
        item.completed_at = _now()
        self.results.append(item)
        self._write_json(f"stage-{name}.json", asdict(item))

    def _stage_environment(self, item: StageResult) -> None:
        path = self._write_json("environment.json", {"python": sys.version, "platform": platform.platform(), "runtime_profile": self.config.runtime})
        item.evidence.append(str(path))
        item.assertions.append("Python runtime and platform recorded")

    def _stage_empty_store(self, item: StageResult) -> None:
        init_db(self.config.storage)
        with connect(self.config.storage) as conn:
            for key, value in _SAMPLE_PROFILE.items():
                set_profile_variable(conn, key, value)
            _require(profile_variables(conn)["profile.display_name"] == "Alex Rivera", "Profile seed was not retained")
        item.assertions.extend(["Fresh SQLite store initialized", "Fictional profile retained locally"])

    def _stage_unified_work_acquisition(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            task = create_task(conn, "keyword_definition", "Unified acquisition proof", context_hint="keyword:Release", idempotent=False)
            work = next_agent_work_item(conn)
            _require(work is not None, "No bounded work item was returned")
            capability = str(work["task"].get("task_capability") or "")
            _require(capability == task_capability(conn, task), "Work item capability does not match private task binding")
            _require("input_context" in work and "response_format" in work, "Work acquisition did not include complete bounded context")
            _require("context" not in work["task"].get("allowed_actions", []), "Split context retrieval remains advertised")
        item.evidence.append(str(self._write_json("unified-work-item.json", work)))
        item.assertions.extend([
            "One call returned task metadata, purpose-scoped context and response schema",
            "Random task capability is distinct from the internal task ID",
        ])

    def _stage_paired_host_bridge(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            task = create_task(conn, "keyword_definition", "Paired bridge proof", context_hint="keyword:Bridge", idempotent=False)
        pairing = create_connection_request(self.config.storage)
        connection = str(pairing["connection_capability"])
        verify = "\n".join(
            json.dumps({"jsonrpc": "2.0", "id": index, "method": method, "params": {}})
            for index, method in enumerate(("initialize", "tools/list", "ping"), start=1)
        ) + "\n"
        target = io.StringIO()
        _require(run_host_bridge(connection, io.StringIO(verify), target) == 0, "Paired bridge verification failed")
        _require(connection_status(self.config.storage).get("state") == "connected", "Paired bridge did not complete verification")
        with connect(self.config.storage) as conn:
            _require(get_task(conn, task["id"])["state"] == "queued", "Bridge verification claimed real work")

        claim = {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "get_next_agent_work", "arguments": {}}}
        target = io.StringIO()
        run_host_bridge(connection, io.StringIO("\n".join((verify.strip(), json.dumps(claim))) + "\n"), target)
        claimed = json.loads(target.getvalue().splitlines()[-1])
        work = ((claimed.get("result") or {}).get("structuredContent") or {}).get("work") or {}
        capability = str((work.get("task") or {}).get("task_capability") or "")
        _require(bool(capability), "Paired bridge did not return complete bounded work")
        submit = {
            "jsonrpc": "2.0", "id": 5, "method": "tools/call",
            "params": {"name": "submit_agent_task_result", "arguments": {
                "task_capability": capability,
                "result_json": {"definition": "A paired bridge keeps host setup separate from bounded work."},
            }},
        }
        target = io.StringIO()
        run_host_bridge(connection, io.StringIO("\n".join((verify.strip(), json.dumps(submit))) + "\n"), target)
        _require(not bool(((json.loads(target.getvalue().splitlines()[-1]).get("result") or {}).get("isError"))), "Paired bridge result was not accepted")
        item.assertions.extend([
            "Paired bridge verified without claiming work",
            "Paired bridge completed canonical claim and result ingestion",
        ])

    def _stage_runtime_configuration(self, item: StageResult) -> None:
        adapter_id, settings = self._runtime_settings()
        result = configure_integration(self.config.storage, adapter_id, settings)
        _require(bool(result.get("saved")), str((result.get("health") or {}).get("message") or "Runtime configuration failed"))
        item.evidence.append(str(self._write_json("runtime-configuration.json", result)))
        item.assertions.append(f"Advanced provider-neutral command configured through {adapter_id}")

    def _stage_runtime_conformance(self, item: StageResult) -> None:
        result = run_configured_runtime_conformance(self.config.storage)
        _require(result.get("status") == "passed", str(result.get("message") or "Runtime conformance failed"))
        item.evidence.append(str(self._write_json("runtime-conformance.json", result)))
        item.assertions.append("Advanced command fake-data nonce challenge passed")

    def _stage_profile_completion(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            conn.execute("DELETE FROM profile_variables WHERE key IN ('profile.career.direction', 'profile.career.constraints')")
            conn.commit()
        task = create_profile_completion_task(self.config.storage)
        result = TaskRunner(self.config.storage).run(str(task["id"]))
        _require(result["task"]["state"] == "completed", "Profile completion task did not complete")
        with connect(self.config.storage) as conn:
            profile = profile_variables(conn)
            _require(profile["profile.display_name"] == "Alex Rivera", "Existing profile value was overwritten")
            _require(bool(profile.get("profile.career.direction")), "Missing eligible profile field was not completed")
        item.assertions.extend(["Profile task completed through bounded work item", "Existing user value was preserved"])

    def _stage_candidature_lifecycle(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            candidature = create_candidature(
                conn,
                company="Northstar Tools",
                role="Senior Backend Engineer — Developer Productivity",
                source_url="https://jobs.example.invalid/northstar-tools/senior-backend-engineer",
                raw_offer=_SAMPLE_OFFER,
                raw_application_form=_SAMPLE_FORM,
                status="active",
                priority="normal",
                include_field_inference_task=False,
                include_company_research_task=False,
                include_keyword_detection_task=False,
            )
            self.candidature_ref = str(candidature["id"])
            ensure_lifecycle_tasks(conn, self.candidature_ref, research_capable=True)
        runner = TaskRunner(self.config.storage)
        for _ in range(5):
            with connect(self.config.storage) as conn:
                queued = [task for task in list_tasks(conn, application_id=self.candidature_ref) if task["state"] == "queued"]
            if not queued:
                break
            for task in queued:
                runner.run(str(task["id"]))
            with connect(self.config.storage) as conn:
                release_ready_lifecycle_tasks(conn, self.candidature_ref)
        with connect(self.config.storage) as conn:
            tasks = list_tasks(conn, application_id=self.candidature_ref)
            _require(tasks and all(task["state"] == "completed" for task in tasks), "Not every lifecycle task completed")
            current = get_candidature(conn, self.candidature_ref)
            required = ("candidature_evaluation", "role_strategy", "company_research", "form_answers", "cv_material", "cover_letter_material", "recruiter_material", "questions_to_ask")
            for key in required:
                _require(bool(str(current.get(key) or "").strip()), f"Lifecycle field remained empty: {key}")
        item.assertions.append("Complete candidature lifecycle executed and applied")

    def _stage_failure_retry(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            task = create_task(conn, "field_inference", "Failure and retry proof", application_id=self.candidature_ref, state="failed", context_hint="candidature:retry-proof", idempotent=False)
            old_capability = task_capability(conn, task)
        worker = OwnedTaskWorker(self.config.storage)
        original_submit = worker.submit
        worker.submit = lambda _task_id: None  # type: ignore[method-assign]
        try:
            replacement_id = worker.retry(str(task["id"]))
        finally:
            worker.submit = original_submit  # type: ignore[method-assign]
        with connect(self.config.storage) as conn:
            _require(get_task(conn, str(task["id"]))["state"] == "cancelled", "Old attempt was not superseded")
            replacement = get_task(conn, replacement_id)
            _require(replacement["state"] == "queued", "Replacement attempt was not queued")
            _require(task_capability(conn, replacement) != old_capability, "Retry reused the old task capability")
            try:
                ingest_task_result(conn, old_capability, {"fields": {"valuation": "late"}}, provenance={"agent_runtime": "release-validator"})
            except ValueError:
                pass
            else:
                raise AssertionError("Late superseded result was accepted")
        item.assertions.extend(["Retry created a new task attempt and capability", "Late old-capability result was rejected"])

    def _stage_portable_bundle(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            task = create_task(conn, "company_research", "Portable proof", application_id=self.candidature_ref, context_hint="candidature:portable-proof", idempotent=False)
            capability = task_capability(conn, task)
        target = self.config.evidence_dir / "candidature.aaaat-task.zip"
        result = export_candidature_task_bundle(self.config.storage, self.candidature_ref, target)
        _require(target.is_file() and int(result.get("task_count") or 0) >= 1, "Portable task bundle was not created")
        returned = self.config.evidence_dir / "candidature.aaaat-result.zip"
        write_result_bundle(returned, [{
            "task_capability": capability,
            "result": {"company_research": "Portable wrapper release proof."},
            "provenance": {"agent_runtime": "portable-release-fixture"},
        }])
        imported = import_candidature_result_bundle(self.config.storage, returned)
        _require(imported.get("status") == "accepted", "Portable result round trip was not accepted")
        item.evidence.extend([str(target), str(returned)])
        item.assertions.extend(["Grouped candidature work archive exported", "Portable result imported through canonical ingestion"])

    def _stage_privacy_audit(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            task = create_task(conn, "field_inference", "Privacy packet proof", application_id=self.candidature_ref, context_hint="candidature:privacy-proof", idempotent=False)
            packet = build_agent_work_item(conn, task)
        serialized = json.dumps(packet, ensure_ascii=False)
        for forbidden in _FORBIDDEN_PACKET_KEYS:
            _require(forbidden not in serialized, f"Forbidden authority key exposed: {forbidden}")
        _require(str(self.config.storage) not in serialized, "Storage path exposed in task packet")
        item.evidence.append(str(self._write_json("bounded-task-packet.json", packet)))
        item.assertions.append("Complete bounded work item excludes internal IDs and storage paths")

    def _stage_artifact_rendering(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            current = get_candidature(conn, self.candidature_ref)
            result = submit_agent_action(
                conn,
                {
                    "action": "create_candidature",
                    "payload": {
                        "source_material": {"offer_text": "Release validator artifact proof."},
                        "candidature": {"company": "Rendered Northstar", "role": "Senior Backend Engineer"},
                        "outputs": {"cover_letter_body": current["cover_letter_material"], "cv_positioning": current["cv_material"]},
                        "render": {"cover_letter": True, "cv": True},
                        "requested_tasks": [],
                    },
                },
                agent_name="release-validator",
                agent_runtime=self.config.runtime,
                model_provider="",
                storage_path=str(self.config.storage),
            )
        _require(result.get("rendered") == {"cover_letter": True, "cv": True}, "Artifacts were not rendered")
        item.assertions.append("CV and cover-letter artifacts rendered locally")

    def _stage_projection_visibility(self, item: StageResult) -> None:
        with connect(self.config.storage) as conn:
            payload = dashboard_payload(conn)
        _require(any(app.get("company") == "Northstar Tools" for app in payload.get("applications") or []), "Candidature missing from desktop projection")
        item.evidence.append(str(self._write_json("dashboard-payload.json", payload)))
        item.assertions.append("Completed candidature is visible in the desktop projection")

    def _runtime_settings(self) -> tuple[str, dict[str, Any]]:
        if self.config.runtime == "deterministic":
            script = self.config.evidence_dir / "deterministic-runtime.py"
            script.write_text(_deterministic_runtime_source(), encoding="utf-8")
            return "argv_custom_command", {"argv": [sys.executable, str(script)], "timeout_seconds": self.config.timeout_seconds}
        if self.config.runtime == "custom":
            _require(bool(self.config.command), "--command-json is required for custom runtime")
            return "argv_custom_command", {"argv": self.config.command, "timeout_seconds": self.config.timeout_seconds}
        raise ValueError(f"Unsupported provider-neutral runtime profile: {self.config.runtime}")

    def _write_json(self, name: str, value: Any) -> Path:
        path = self.config.evidence_dir / name
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return path

    def _write_reports(self, report: dict[str, Any]) -> None:
        self._write_json("release-report.json", report)
        rows = ["# AAAAT local release validation", "", f"Automated verdict: **{report['automated_verdict']}**", f"Release verdict: **{report['release_verdict']}**", "", "| Stage | Status | Error |", "|---|---|---|"]
        for stage in report["stages"]:
            rows.append(f"| {stage['stage']} | {stage['status']} | {stage['error'].replace('|', '/')} |")
        rows.extend(["", "## Manual gates remaining", ""] + [f"- {gate}" for gate in report["manual_gates"]])
        (self.config.evidence_dir / "release-report.md").write_text("\n".join(rows) + "\n", encoding="utf-8")


def _deterministic_runtime_source() -> str:
    return '''import json,sys
packet=json.load(sys.stdin)
task=packet.get("task") or {}
type_=task.get("task_type","")
hint=task.get("context_hint","")
if type_=="runtime_conformance": result={"conformance_nonce":packet["input_context"]["challenge_nonce"],"status":"ready","runtime_name":"AAAAT deterministic validator","model_name":"fixture","supports_structured_json":True,"supports_research":True}
elif type_=="profile_completion": result={"variables":{"profile.career.direction":"Senior backend and developer-tools roles","profile.career.constraints":"Remote or hybrid in Spain; four-week availability."}}
elif type_=="company_research": result={"company_research":"Northstar Tools builds developer productivity infrastructure."}
elif type_=="draft_form_responses": result={"form_answers":"Interested in local-first tooling; improved reliability through deterministic validation and recovery."}
elif type_=="draft_cv": result={"cv_positioning":"Lead with Python, SQLite, local-first systems and reliability."}
elif type_=="draft_cover_letter": result={"cover_letter_body":"I am interested in Northstar Tools because local-first developer tooling aligns with my reliability-focused experience."}
elif type_=="keyword_definition":
    keyword=(packet.get("input_context") or {}).get("keyword") or hint.removeprefix("keyword:")
    result={"definition":f"{keyword} is a relevant term for the supplied candidature context."}
elif hint=="candidature:evaluation": result={"fields":{"candidature_evaluation":"Strong fit","strengths":"Python, SQLite, local-first systems","valuation":"High","risks_to_avoid":"Do not overstate distributed-systems scale."}}
elif hint=="candidature:strategy": result={"fields":{"role_strategy":"Lead with reliability and pragmatic ownership.","pitch":"Local-first backend specialist.","smart_question":"How is reliability measured?","call_signals":"Emphasize validation and maintainability."}}
elif hint=="call:recruiter": result={"fields":{"recruiter_material":"Discuss motivation, reliability, salary, location and availability."}}
elif hint=="call:interview": result={"fields":{"questions_to_ask":"How does the team validate release reliability?","strengths":"Python, SQLite and pragmatic architecture."}}
else: result={"fields":{"company":"Northstar Tools","role":"Senior Backend Engineer — Developer Productivity","location":"Madrid / Remote","remote_mode":"remote","tech_stack":"Python, SQLite","keywords":["Python","SQLite","local-first"]}}
print(json.dumps(result))
'''


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run AAAAT automated provider-neutral release validation and collect evidence.")
    parser.add_argument("--storage", type=Path, default=Path(".private-release-validation"))
    parser.add_argument("--evidence-dir", type=Path, default=Path("release-evidence"))
    parser.add_argument("--runtime", choices=("deterministic", "custom"), default="deterministic")
    parser.add_argument("--command-json", default="", help="JSON argv array for an explicit Advanced user-owned command.")
    parser.add_argument("--timeout", dest="timeout_seconds", type=int, default=600)
    parser.add_argument("--keep-storage", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    command: list[str] = []
    if args.command_json:
        value = json.loads(args.command_json)
        if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
            raise SystemExit("--command-json must be a non-empty JSON string array")
        command = value
    if args.runtime == "custom" and not command:
        raise SystemExit("--runtime custom requires --command-json")
    report = ReleaseValidator(
        ValidationConfig(
            storage=args.storage,
            evidence_dir=args.evidence_dir,
            runtime=args.runtime,
            command=command,
            timeout_seconds=args.timeout_seconds,
            keep_storage=args.keep_storage,
        )
    ).run()
    print(json.dumps({"automated_verdict": report["automated_verdict"], "release_verdict": report["release_verdict"], "report": str(args.evidence_dir / "release-report.json")}, indent=2))
    return 0 if report["automated_verdict"] == VERDICT_PASSED else 1


if __name__ == "__main__":
    raise SystemExit(main())
