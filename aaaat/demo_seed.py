from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Any

from aaaat.candidatures import create_candidature, update_candidature
from aaaat.db import add_raw_intake, connect, init_db, upsert_glossary_term


COMPANIES = [
    "Northstar Robotics",
    "Aster Cloud",
    "Boreal Systems",
    "Lumen Bioinformatics",
    "Cobalt Finance",
    "Helio Mobility",
    "Nimble Grid",
    "Atlas Security",
    "Fjord Analytics",
    "Vector Health",
    "Quanta Retail",
    "Mosaic AI",
]

ROLES = [
    "Backend Engineer",
    "Platform Engineer",
    "Python Developer",
    "Automation Engineer",
    "Data Platform Engineer",
    "Infrastructure Engineer",
    "Developer Tools Engineer",
    "Technical Product Engineer",
]

STACKS = [
    ["Python", "APIs", "PostgreSQL", "Docker"],
    ["Python", "Django", "Redis", "AWS"],
    ["Python", "ETL", "Airflow", "BigQuery"],
    ["Go", "Kubernetes", "gRPC", "Observability"],
    ["TypeScript", "Node", "PostgreSQL", "Queues"],
    ["Python", "LLM", "RAG", "SQLite"],
    ["Linux", "Terraform", "CI/CD", "Azure"],
    ["Python", "Data", "APIs", "Pandas"],
]

PRIORITIES = ["high", "normal", "low"]
LEAD_SOURCES = ["LinkedIn recruiter", "Welcome to the Jungle", "Company careers", "Referral", "Cold inbound", "Otta", "RemoteOK"]
LOCATIONS = ["Barcelona", "Madrid", "Remote EU", "Berlin", "Amsterdam", "London", "Paris", "Hybrid Barcelona"]
REMOTE = ["remote", "hybrid", "onsite", "remote EU"]

GLOSSARY = {
    "Python": "Use concrete examples: APIs, automation scripts, CLIs, data workflows, and local-first tooling.",
    "APIs": "Mention clear boundaries, contracts, validation, documentation, and operational ownership.",
    "PostgreSQL": "Focus on relational modeling, migrations, indexing, and reliable transactional behavior.",
    "Kubernetes": "Describe operational familiarity and debugging, not platform-guru claims unless evidence exists.",
    "Terraform": "Talk about reproducibility, reviewable infrastructure changes, and cautious rollout.",
    "Observability": "Mention logs, metrics, traces, and fast incident narrowing.",
    "LLM": "Keep provider-agnostic framing. Emphasize controlled context and user approval.",
    "RAG": "Describe retrieval boundaries, source grounding, and avoiding raw private-data leakage.",
    "SQLite": "Local-first persistence, simple deployment, and avoiding database-server dependency.",
}


def build_record(index: int) -> dict[str, Any]:
    company = COMPANIES[index % len(COMPANIES)]
    role = ROLES[index % len(ROLES)]
    keywords = list(STACKS[index % len(STACKS)])
    status = "closed" if index % 13 == 12 else "active"
    priority = PRIORITIES[index % len(PRIORITIES)]
    lead_source = LEAD_SOURCES[index % len(LEAD_SOURCES)]
    location = LOCATIONS[index % len(LOCATIONS)]
    remote_mode = REMOTE[index % len(REMOTE)]
    focus = keywords[0]
    secondary = keywords[1] if len(keywords) > 1 else "systems"
    record = {
        "company": f"{company} {index + 1}" if index >= len(COMPANIES) else company,
        "role": role,
        "status": status,
        "priority": priority,
        "source": lead_source,
        "source_url": f"https://example.invalid/jobs/{index + 1:03d}",
        "location": location,
        "remote_mode": remote_mode,
        "notes": f"Recruiter-call scratchpad for {company}. Mention local-first tooling, pragmatic architecture, and concrete delivery examples.",
        "call_signals": f"They mentioned {focus}, {secondary}, and a small team needing autonomy. Listen for product/platform split.",
        "pitch": f"Position as a pragmatic engineer who can own {focus} systems, reduce ambiguity, and ship maintainable tooling without overengineering.",
        "smart_question": f"What is the first {focus} problem this role must improve in the first 90 days?",
        "risks_to_avoid": "Do not sound like a pure framework specialist; keep examples grounded in outcomes, maintainability, and team leverage.",
        "offer_snapshot": f"Likely senior IC scope. Watch for unclear salary band, relocation expectation, and ownership without authority. Current stack includes {', '.join(keywords)}.",
        "company_research": f"{company} appears in this demo as a realistic target with a mixed product/platform need. Treat as call-prep material, not factual research.",
        "form_answers": f"Why interested: the role combines {focus}, product impact, and clean internal tooling. Availability: flexible. Work mode: {remote_mode}.",
        "keywords": keywords,
    }
    if index % 7 == 0:
        record["form_answers"] = ""
    if index % 11 == 0:
        record["offer_snapshot"] = ""
    return record


def build_raw_offer_text(index: int, record: dict[str, Any]) -> str:
    keywords = list(record.get("keywords") or [])
    focus = keywords[0] if keywords else "systems"
    secondary = keywords[1] if len(keywords) > 1 else "delivery"
    company = record["company"]
    role = record["role"]
    return f"""{company} — {role}

About the role
We are looking for a pragmatic engineer to join a small product/platform team. The role works close to product, operations, and engineering leadership. You will help improve internal systems, remove recurring manual work, and build reliable services that can be understood and maintained by a small team.

What you will do
- Own backend services related to {focus}, integrations, and operational workflows.
- Review existing scripts and services, identify fragile points, and replace them with simpler, observable components.
- Work with product and operations to translate ambiguous requirements into small deliverable slices.
- Improve deployment, monitoring, and incident response around systems that affect customer-facing workflows.
- Document decisions clearly enough that another engineer can continue the work without tribal knowledge.

Tech stack and context
The current stack includes {', '.join(keywords)}. Some services are mature and stable, while others grew organically during a busy product period. We value maintainability, careful migrations, and clean operational boundaries more than fashionable architecture. Experience with {secondary}, data flows, APIs, and production debugging will be useful.

What we are looking for
- Strong Python or backend engineering fundamentals.
- Ability to reason about trade-offs and avoid overengineering.
- Comfort reading existing code before proposing rewrites.
- Clear communication during ambiguous product discussions.
- Evidence of ownership: diagnosing issues, reducing repeated manual work, and shipping improvements incrementally.

Interview process
The first call is a recruiter screen focused on motivation, salary range, remote expectations, and recent backend/platform work. The second step is a technical conversation with two engineers. Later steps may include a small system-design exercise and a conversation with the hiring manager.

Signals to remember
This is the offer text that would visually identify {company} during a call: the posting mentioned {focus}, {secondary}, ownership, and a team trying to reduce operational friction without building a large platform team.

Open questions
- What is broken enough that the first hire should improve it immediately?
- How much product ambiguity is expected from this role?
- Is the team looking for a builder, an operator, or a platform owner?
- Which systems are risky today because only one person understands them?
"""


def upsert_application(conn: sqlite3.Connection, record: dict[str, Any], raw_offer_text: str) -> str:
    existing_id = _find_seed_application_id(conn, record)
    if existing_id:
        update_candidature(conn, existing_id, **record)
        app_id = existing_id
        result = "updated"
    else:
        created = create_candidature(
            conn,
            **record,
            include_field_inference_task=False,
            include_company_research_task=False,
            include_keyword_detection_task=False,
        )
        app_id = str(created["id"])
        result = "created"
    conn.execute("DELETE FROM raw_intake WHERE application_id = ? AND created_by = ?", (app_id, "demo_seed"))
    add_raw_intake(conn, app_id, raw_offer_text, created_by="demo_seed")
    return result


def _find_seed_application_id(conn: sqlite3.Connection, record: dict[str, Any]) -> str:
    url = str(record.get("source_url") or "").strip()
    if url:
        row = conn.execute("SELECT id FROM applications WHERE source_url = ?", (url,)).fetchone()
        if row:
            return str(row["id"])
    row = conn.execute(
        "SELECT id FROM applications WHERE company = ? AND role = ? AND source = ?",
        (record.get("company", ""), record.get("role", ""), record.get("source", "")),
    ).fetchone()
    return str(row["id"]) if row else ""


def seed(storage: str | Path, count: int = 48, *, reset: bool = False) -> dict[str, int]:
    init_db(storage)
    created = 0
    updated = 0
    with connect(storage) as conn:
        if reset:
            _clear_seed_data(conn)
        for term, definition in GLOSSARY.items():
            upsert_glossary_term(conn, term, definition, "demo")
        for index in range(count):
            record = build_record(index)
            result = upsert_application(conn, record, build_raw_offer_text(index, record))
            if result == "created":
                created += 1
            else:
                updated += 1
    return {"created": created, "updated": updated, "total": count}


def _clear_seed_data(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM application_keywords")
    conn.execute("DELETE FROM tasks")
    conn.execute("DELETE FROM todos")
    conn.execute("DELETE FROM text_blobs")
    conn.execute("DELETE FROM notes")
    conn.execute("DELETE FROM raw_intake")
    conn.execute("DELETE FROM generated_artifacts")
    conn.execute("DELETE FROM candidature_details")
    conn.execute("DELETE FROM applications")
    conn.commit()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed AAAAT with realistic Smart View demo candidatures.")
    parser.add_argument("--storage", default=".private")
    parser.add_argument("--count", type=int, default=48)
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args(argv)
    summary = seed(args.storage, max(1, args.count), reset=args.reset)
    print(f"Seeded Smart View demo data: {summary['created']} created, {summary['updated']} updated, {summary['total']} total.")
    print("Launch with: aaaat-desktop")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
