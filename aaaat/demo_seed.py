from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Any

from aaaat.db import connect, create_application, init_db, upsert_glossary_term


COMPANIES = [
    ("NexaLedger", "Backend Engineer", ["Python", "FastAPI", "PostgreSQL", "Payments"], "Fintech ledger migration, recruiter Maria, asks about reconciliation"),
    ("OrbitOps", "Platform Engineer", ["Kubernetes", "Terraform", "Python", "Observability"], "Infra scale-up, SRE-heavy call, wants ownership examples"),
    ("LumenAI", "ML Backend Engineer", ["Python", "LLM", "RAG", "Vector DB"], "Agentic-search product, screening likely around retrieval systems"),
    ("CivicStack", "Software Engineer", ["Django", "PostgreSQL", "APIs", "GovTech"], "Public-sector workflow tooling, values clarity and reliability"),
    ("Northbank", "Automation Engineer", ["Python", "Banking Ops", "ETL", "Controls"], "Banking operations automation, highlight risk controls"),
    ("BlueHarbor", "Data Platform Engineer", ["Airflow", "Python", "SQL", "AWS"], "Data platform modernization, likely batch orchestration questions"),
    ("SignalForge", "Agentic Systems Engineer", ["Agents", "Tool Use", "Python", "SQLite"], "Small AI tooling team, cares about provider-agnostic design"),
    ("AsterCloud", "Cloud Backend Developer", ["Python", "Azure", "Docker", "Messaging"], "Cloud migration team, ask about async jobs and cost"),
    ("MosaicHR", "Product Engineer", ["Python", "React", "APIs", "B2B SaaS"], "HR workflow SaaS, balance backend depth with product sense"),
    ("VerdeGrid", "Energy Software Engineer", ["Python", "Optimization", "IoT", "APIs"], "Energy grid optimization, domain learning matters"),
    ("QuantaRisk", "Risk Tools Developer", ["Python", "SQL", "Dashboards", "Risk"], "Internal risk tooling, conservative technical culture"),
    ("HelioWorks", "Integration Engineer", ["REST", "Python", "ETL", "CRM"], "Integrations-heavy role, emphasize debugging and ownership"),
]

STATUSES = ["draft", "applied", "meeting", "interview", "waiting", "offer", "rejected"]
PRIORITIES = ["high", "normal", "low"]
LOCATIONS = ["Madrid", "Barcelona", "Remote EU", "Hybrid Madrid", "Valencia", "Remote Spain"]
REMOTE_MODES = ["remote", "hybrid", "onsite", "remote-first"]
SOURCES = ["LinkedIn", "Wellfound", "Company site", "Recruiter inbound", "Referral", "InfoJobs"]

GLOSSARY = {
    "Python": "Use concrete examples: APIs, automation scripts, CLIs, data workflows, and local-first tooling.",
    "FastAPI": "Mention typed endpoints, validation, local service boundaries, and simple deployment.",
    "PostgreSQL": "Focus on relational modeling, migrations, indexing, and reliable transactional behavior.",
    "Payments": "Keep compliance and reconciliation language conservative. Do not overclaim direct payment-provider ownership.",
    "Kubernetes": "Describe operational familiarity and debugging, not platform-guru claims unless evidence exists.",
    "Terraform": "Talk about reproducibility, reviewable infrastructure changes, and cautious rollout.",
    "Observability": "Mention logs, metrics, traces, and fast incident narrowing.",
    "LLM": "Keep provider-agnostic framing. Emphasize controlled context and user approval.",
    "RAG": "Describe retrieval boundaries, source grounding, and avoiding raw private-data leakage.",
    "Vector DB": "Frame as search infrastructure; discuss chunking, metadata, and evaluation.",
    "Banking Ops": "Strong fit: operations knowledge plus automation. Keep terminology precise.",
    "SQLite": "Local-first persistence, simple deployment, and avoiding database-server dependency.",
}


def seed(storage: str | Path, *, count: int, reset: bool) -> list[dict[str, Any]]:
    init_db(storage)
    with connect(storage) as conn:
        if reset:
            _clear_seed_data(conn)
        for term, definition in GLOSSARY.items():
            upsert_glossary_term(conn, term, definition, "demo")
        created = []
        for index in range(count):
            company, role, keywords, signal = COMPANIES[index % len(COMPANIES)]
            suffix = index // len(COMPANIES)
            display_company = company if suffix == 0 else f"{company} {suffix + 1}"
            app = create_application(
                conn,
                company=display_company,
                role=role,
                status=STATUSES[index % len(STATUSES)],
                priority=PRIORITIES[index % len(PRIORITIES)],
                source=SOURCES[index % len(SOURCES)],
                source_url=f"https://example.invalid/jobs/{company.lower()}-{index}",
                location=LOCATIONS[index % len(LOCATIONS)],
                remote_mode=REMOTE_MODES[index % len(REMOTE_MODES)],
                next_action=_maybe_blank(index, f"Prepare recruiter call: verify scope, team size, and interview process for {display_company}."),
                notes=_maybe_blank(index + 1, f"Recognize by: {signal}. Keep answer crisp; do not drift into admin details during the call."),
                call_signals=_maybe_blank(index + 2, signal),
                technical_reading=_maybe_blank(index + 3, f"Review {keywords[0]} and {keywords[1]} examples before the call."),
                pitch=_maybe_blank(index + 4, f"I build local-first Python systems that turn messy workflows into reliable, reviewable tools. For {display_company}, I would emphasize pragmatic delivery and clear boundaries."),
                smart_question=_maybe_blank(index + 5, "What would make the first 90 days successful, and which part of the platform needs the most immediate ownership?"),
                risks_to_avoid=_maybe_blank(index + 6, "Do not oversell frontend depth. Avoid claiming production ownership of areas not directly evidenced."),
                prepare_first=_maybe_blank(index + 7, f"Prepare a 45-second story about {keywords[0]} plus a concrete debugging/ownership example."),
                prepare_later=_maybe_blank(index + 8, "Read the engineering blog, check funding/product maturity, and map likely interview stages."),
                offer_snapshot=_maybe_blank(index + 9, f"Target: practical backend/platform role. Compensation and seniority still unknown for {display_company}."),
                company_research=_maybe_blank(index + 10, f"{display_company} appears to need reliable delivery, compact communication, and strong ownership in a small-to-medium product team."),
                form_answers=_maybe_blank(index + 11, "Why this role: local-first/product-minded engineering, backend ownership, and clear user impact. Availability: flexible."),
                keywords=keywords,
            )
            created.append(app)
        return created


def _maybe_blank(index: int, value: str) -> str:
    # Keep most data complete, but leave realistic holes for visual testing.
    return "" if index % 13 == 0 else value


def _clear_seed_data(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM application_keywords")
    conn.execute("DELETE FROM generated_artifacts")
    conn.execute("DELETE FROM tasks")
    conn.execute("DELETE FROM todos")
    conn.execute("DELETE FROM text_blobs")
    conn.execute("DELETE FROM notes")
    conn.execute("DELETE FROM raw_intake")
    conn.execute("DELETE FROM applications")
    conn.commit()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="aaaat-seed-desktop-demo")
    parser.add_argument("--storage", default=".private")
    parser.add_argument("--count", type=int, default=36)
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args(argv)

    created = seed(args.storage, count=max(1, args.count), reset=args.reset)
    print(f"Seeded {len(created)} demo candidatures into {args.storage}")
    print("Run: aaaat-desktop")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
