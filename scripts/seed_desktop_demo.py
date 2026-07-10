from __future__ import annotations

import argparse
from itertools import cycle
from pathlib import Path
from typing import Any

from aaaat.db import connect, create_application, get_application, init_db, update_application


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
    ["Python", "FastAPI", "PostgreSQL", "Docker"],
    ["Python", "Django", "Redis", "AWS"],
    ["Python", "ETL", "Airflow", "BigQuery"],
    ["Go", "Kubernetes", "gRPC", "Observability"],
    ["TypeScript", "Node", "PostgreSQL", "Queues"],
    ["Python", "LLM", "RAG", "SQLite"],
    ["Linux", "Terraform", "CI/CD", "Azure"],
    ["Python", "Data", "APIs", "Pandas"],
]

STATUSES = ["draft", "applied", "screening", "meeting", "technical", "offer-risk", "paused"]
PRIORITIES = ["high", "normal", "low"]
SOURCES = ["LinkedIn recruiter", "Welcome to the Jungle", "Company careers", "Referral", "Cold inbound", "Otta", "RemoteOK"]
LOCATIONS = ["Barcelona", "Madrid", "Remote EU", "Berlin", "Amsterdam", "London", "Paris", "Hybrid Barcelona"]
REMOTE = ["remote", "hybrid", "onsite", "remote EU"]


def build_record(index: int) -> dict[str, Any]:
    company = COMPANIES[index % len(COMPANIES)]
    role = ROLES[index % len(ROLES)]
    keywords = list(STACKS[index % len(STACKS)])
    status = STATUSES[index % len(STATUSES)]
    priority = PRIORITIES[index % len(PRIORITIES)]
    source = SOURCES[index % len(SOURCES)]
    location = LOCATIONS[index % len(LOCATIONS)]
    remote_mode = REMOTE[index % len(REMOTE)]
    focus = keywords[0]
    secondary = keywords[1] if len(keywords) > 1 else "systems"

    record = {
        "id": f"demo-smart-{index + 1:03d}",
        "company": f"{company} {index + 1}" if index >= len(COMPANIES) else company,
        "role": role,
        "status": status,
        "priority": priority,
        "source": source,
        "source_url": f"https://example.invalid/jobs/{index + 1:03d}",
        "location": location,
        "remote_mode": remote_mode,
        "next_action": f"Call: identify them by {focus}/{secondary}, ask about ownership and delivery pressure.",
        "notes": f"Recruiter-call scratchpad for {company}. Mention local-first tooling, pragmatic architecture, and concrete delivery examples.",
        "call_signals": f"They mentioned {focus}, {secondary}, and a small team needing autonomy. Listen for product/platform split.",
        "technical_reading": f"Review one recent article about {focus} scaling and prepare a short trade-off answer around {secondary}.",
        "pitch": f"Position as a pragmatic engineer who can own {focus} systems, reduce ambiguity, and ship maintainable tooling without overengineering.",
        "smart_question": f"What is the first {focus} problem this role must improve in the first 90 days?",
        "risks_to_avoid": "Do not sound like a pure framework specialist; keep examples grounded in outcomes, maintainability, and team leverage.",
        "prepare_first": f"Prepare one STAR story about {focus}, one about debugging production behavior, and one about simplifying a messy workflow.",
        "prepare_later": "If advanced, inspect company product docs, funding/news context, and likely team topology before technical interview.",
        "offer_snapshot": f"Likely senior IC scope. Watch for unclear salary band, relocation expectation, and ownership without authority.",
        "company_research": f"{company} appears in this demo as a realistic target with a mixed product/platform need. Treat as call-prep material, not factual research.",
        "form_answers": f"Why interested: the role combines {focus}, product impact, and clean internal tooling. Availability: flexible. Work mode: {remote_mode}.",
        "keywords": keywords,
    }

    if index % 7 == 0:
        record["form_answers"] = ""
    if index % 9 == 0:
        record["technical_reading"] = ""
    if index % 11 == 0:
        record["offer_snapshot"] = ""
    return record


def upsert_application(conn, record: dict[str, Any]) -> str:
    app_id = str(record["id"])
    try:
        get_application(conn, app_id)
    except KeyError:
        create_application(conn, **record)
        return "created"

    update_fields = dict(record)
    update_fields.pop("id", None)
    update_application(conn, app_id, **update_fields)
    return "updated"


def seed(storage: str | Path, count: int) -> dict[str, int]:
    init_db(storage)
    created = 0
    updated = 0
    with connect(storage) as conn:
        for index in range(count):
            result = upsert_application(conn, build_record(index))
            if result == "created":
                created += 1
            else:
                updated += 1
    return {"created": created, "updated": updated, "total": count}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed AAAAT with realistic Smart View demo candidatures.")
    parser.add_argument("--storage", default=".private")
    parser.add_argument("--count", type=int, default=48)
    args = parser.parse_args(argv)
    summary = seed(args.storage, max(1, args.count))
    print(f"Seeded Smart View demo data: {summary['created']} created, {summary['updated']} updated, {summary['total']} total.")
    print("Launch with: aaaat-desktop")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
