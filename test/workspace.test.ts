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
  it("initializes the current schema directly and reopens it without damaging user data", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      const first = createOrOpenWorkspace(directory);
      expect(first).toEqual({ rootPath: directory });
      expect(existsSync(databasePath)).toBe(true);

      const database = new DatabaseSync(databasePath);
      try {
        expect(
          database.prepare("SELECT name FROM sqlite_schema WHERE name = 'schema_migrations'").get(),
        ).toBeUndefined();
        expect(
          database.prepare("SELECT name FROM sqlite_schema WHERE name = 'todos'").get(),
        ).toBeUndefined();
        expect(
          database
            .prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.initialized_at'")
            .get(),
        ).toMatchObject({ value: expect.any(String) });
        expect(
          database
            .prepare(
              "SELECT opportunity_research_selected AS selected FROM candidatures LIMIT 0",
            )
            .all(),
        ).toEqual([]);
        expect(
          database
            .prepare(
              "SELECT cv_document_id, cover_letter_document_id, kind FROM application_artifacts LIMIT 0",
            )
            .all(),
        ).toEqual([]);
        database.exec("CREATE TABLE persistence_probe(value TEXT NOT NULL) STRICT;");
        database
          .prepare("INSERT INTO persistence_probe(value) VALUES (?)")
          .run("survives-reopen");
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
        "The selected folder is not a compatible AAAAT workspace.",
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

  it("rejects a development-era migration table instead of treating it as compatibility state", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        database.exec(
          "CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;",
        );
      } finally {
        database.close();
      }
      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a compatible AAAAT workspace.",
      );
      const unchanged = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          unchanged.prepare("SELECT name FROM sqlite_schema WHERE name = 'schema_migrations'").get(),
        ).toEqual({ name: "schema_migrations" });
      } finally {
        unchanged.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects the removed global ToDo schema instead of carrying it forward", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        database.exec(
          "CREATE TABLE todos(id TEXT PRIMARY KEY, body TEXT NOT NULL, done INTEGER NOT NULL) STRICT;",
        );
      } finally {
        database.close();
      }
      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a compatible AAAAT workspace.",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a workspace missing current schema objects without repairing it", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        database.exec("DROP TABLE tag_activity;");
      } finally {
        database.close();
      }
      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a compatible AAAAT workspace.",
      );
      const unchanged = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          unchanged.prepare("SELECT name FROM sqlite_schema WHERE name = 'tag_activity'").get(),
        ).toBeUndefined();
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
