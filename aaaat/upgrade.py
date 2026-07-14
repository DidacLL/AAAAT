from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from .career_plans import ensure_career_plan_columns
from .db import (
    DEFAULT_PRIVATE_DIR,
    check_schema_version,
    connect,
    ensure_candidature_detail_columns,
    get_schema_version,
    init_db,
)
from .keywords import ensure_keyword_metadata_schema


def upgrade_storage(storage: str | Path = DEFAULT_PRIVATE_DIR) -> dict[str, Any]:
    """Apply all supported v1 compatibility upgrades to one local store."""

    database = init_db(storage)
    with connect(storage) as conn:
        ensure_candidature_detail_columns(conn)
        ensure_career_plan_columns(conn)
        ensure_keyword_metadata_schema(conn)
        check_schema_version(conn)
        application_count = int(conn.execute("SELECT COUNT(*) FROM applications").fetchone()[0])
        artifact_count = int(conn.execute("SELECT COUNT(*) FROM generated_artifacts").fetchone()[0])
        schema_version = get_schema_version(conn)
    return {
        "database": str(database),
        "schema_version": schema_version,
        "applications": application_count,
        "artifacts": artifact_count,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="aaaat-upgrade",
        description="Upgrade an existing local AAAAT SQLite store in place.",
    )
    parser.add_argument("--storage", default=DEFAULT_PRIVATE_DIR)
    args = parser.parse_args(argv)
    summary = upgrade_storage(args.storage)
    print(
        "AAAAT store ready: "
        f"schema {summary['schema_version']}, "
        f"{summary['applications']} candidatures, "
        f"{summary['artifacts']} artifacts."
    )
    print(f"Database: {summary['database']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
