// @vitest-environment node

import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  createOrOpenWorkspace,
  openWorkspace,
  readLastWorkspacePath,
  rememberWorkspacePath,
} from "../src/main/workspace";

function temporaryDirectory(): string {
  return mkdtempSync(path.join(tmpdir(), "aaaat-workspace-"));
}

describe("user-owned workspace", () => {
  it("initializes the current product schema and reopens it without damaging user data", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      const first = createOrOpenWorkspace(directory);
      expect(first).toEqual({ rootPath: directory });
      expect(existsSync(databasePath)).toBe(true);

      const database = new DatabaseSync(databasePath);
      try {
        expect(
          database.prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.product'").get(),
        ).toEqual({ value: "AAAAT" });
        expect(
          database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get(),
        ).toBeUndefined();
        expect(
          database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('profile_items', 'candidatures', 'documents', 'candidature_sources') ORDER BY name").all(),
        ).toEqual([
          { name: "candidature_sources" },
          { name: "candidatures" },
          { name: "documents" },
          { name: "profile_items" },
        ]);
        database.exec("CREATE TABLE persistence_probe(value TEXT NOT NULL) STRICT;");
        database.prepare("INSERT INTO persistence_probe(value) VALUES (?)").run("survives-reopen");
      } finally {
        database.close();
      }

      expect(openWorkspace(directory)).toEqual(first);
      const reopenedDatabase = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(reopenedDatabase.prepare("SELECT value FROM persistence_probe").get()).toEqual({
          value: "survives-reopen",
        });
      } finally {
        reopenedDatabase.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a non-workspace folder without creating database files", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    try {
      writeFileSync(path.join(directory, "keep.txt"), "user data\n", "utf8");
      expect(() => createOrOpenWorkspace(directory)).toThrow(
        "Choose an empty folder or an existing AAAAT workspace.",
      );
      expect(existsSync(databasePath)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects an unrelated SQLite database without modifying it", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    try {
      const database = new DatabaseSync(databasePath);
      try {
        database.exec("CREATE TABLE foreign_data(value TEXT) STRICT;");
      } finally {
        database.close();
      }
      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a current AAAAT workspace.",
      );
      const unchanged = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          unchanged.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all(),
        ).toEqual([{ name: "foreign_data" }]);
      } finally {
        unchanged.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("does not reinterpret a development-era workspace as a compatibility target", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    try {
      const database = new DatabaseSync(databasePath);
      try {
        database.exec(
          "CREATE TABLE workspace_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;",
        );
        database.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)").run(
          "workspace.initialized_at",
          "2026-09-01T00:00:00.000Z",
        );
        database.exec(
          "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;",
        );
        database.prepare("INSERT INTO schema_migrations VALUES (1, 'workspace', 'legacy', '2026-09-01T00:00:00.000Z')").run();
      } finally {
        database.close();
      }

      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a current AAAAT workspace.",
      );

      const unchanged = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(unchanged.prepare("SELECT * FROM schema_migrations").all()).toEqual([
          {
            version: 1,
            name: "workspace",
            sha256: "legacy",
            applied_at: "2026-09-01T00:00:00.000Z",
          },
        ]);
      } finally {
        unchanged.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("remembers only the last workspace path in application settings", () => {
    const directory = temporaryDirectory();
    const settingsPath = path.join(directory, "workspace-settings.json");
    const workspacePath = path.join(directory, "owned-workspace");
    try {
      expect(readLastWorkspacePath(settingsPath)).toBeNull();
      rememberWorkspacePath(settingsPath, workspacePath);
      expect(readLastWorkspacePath(settingsPath)).toBe(workspacePath);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a remembered workspace path that no longer exists", () => {
    const directory = temporaryDirectory();
    const missingPath = path.join(directory, "missing-workspace");
    try {
      expect(() => openWorkspace(missingPath)).toThrow(
        "The selected workspace folder no longer exists.",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
