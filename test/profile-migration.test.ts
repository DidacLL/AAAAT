// @vitest-environment node

import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, it } from "vitest";

import workspaceMigrationSql from "../src/main/migrations/001_workspace.sql?raw";
import { openWorkspace } from "../src/main/workspace";

it("upgrades an existing workspace-root database through current product schemas", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-profile-migration-"));
  const databasePath = path.join(root, "workspace.sqlite");
  const hash = createHash("sha256").update(workspaceMigrationSql).digest("hex");
  const database = new DatabaseSync(databasePath);

  try {
    database.exec(
      "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;",
    );
    database.exec(workspaceMigrationSql);
    database
      .prepare(
        "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (1, 'workspace', ?, ?)",
      )
      .run(hash, "2026-09-02T00:00:00.000Z");
    database
      .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
      .run("workspace.initialized_at", "2026-09-02T00:00:00.000Z");
  } finally {
    database.close();
  }

  try {
    expect(openWorkspace(root)).toEqual({ rootPath: root });
    const upgraded = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(
        upgraded.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all(),
      ).toEqual([
        { version: 1, name: "workspace" },
        { version: 2, name: "profile" },
        { version: 3, name: "documents" },
        { version: 4, name: "candidatures" },
        { version: 5, name: "concepts" },
        { version: 6, name: "activity" },
        { version: 7, name: "career-context" },
      ]);
      expect(
        upgraded
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('profile_items', 'documents', 'candidatures', 'concepts', 'career_context') ORDER BY name",
          )
          .all(),
      ).toEqual([
        { name: "candidatures" },
        { name: "career_context" },
        { name: "concepts" },
        { name: "documents" },
        { name: "profile_items" },
      ]);
    } finally {
      upgraded.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
