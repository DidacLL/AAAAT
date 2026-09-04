// @vitest-environment node

import { createHash } from "node:crypto";
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
import workspaceMigrationSql from "../src/main/migrations/001_workspace.sql?raw";
import profileMigrationSql from "../src/main/migrations/002_profile.sql?raw";
import documentMigrationSql from "../src/main/migrations/003_documents.sql?raw";
import candidatureMigrationSql from "../src/main/migrations/004_candidatures.sql?raw";
import conceptMigrationSql from "../src/main/migrations/005_concepts.sql?raw";
import activityMigrationSql from "../src/main/migrations/006_activity.sql?raw";

function temporaryDirectory(): string {
  return mkdtempSync(path.join(tmpdir(), "aaaat-workspace-"));
}

function createV6Workspace(directory: string): void {
  const database = new DatabaseSync(path.join(directory, "workspace.sqlite"));
  const now = "2026-01-01T00:00:00.000Z";
  const migrations = [
    [1, "workspace", workspaceMigrationSql],
    [2, "profile", profileMigrationSql],
    [3, "documents", documentMigrationSql],
    [4, "candidatures", candidatureMigrationSql],
    [5, "concepts", conceptMigrationSql],
    [6, "activity", activityMigrationSql],
  ] as const;

  try {
    database.exec(
      "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;",
    );
    for (const [version, name, sql] of migrations) {
      database.exec(sql);
      database
        .prepare(
          "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
        )
        .run(
          version,
          name,
          createHash("sha256").update(sql).digest("hex"),
          now,
        );
    }
    database
      .prepare(
        "INSERT INTO workspace_metadata(key, value) VALUES (?, ?)",
      )
      .run("workspace.initialized_at", now);
  } finally {
    database.close();
  }
}

describe("user-owned workspace", () => {
  it("initializes an empty directory and reopens it without damaging data", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      const first = createOrOpenWorkspace(directory);
      expect(first).toEqual({ rootPath: directory });
      expect(existsSync(databasePath)).toBe(true);

      const database = new DatabaseSync(databasePath);
      try {
        expect(
          database
            .prepare(
              "SELECT version, name, length(sha256) AS hashLength FROM schema_migrations ORDER BY version DESC LIMIT 1",
            )
            .get(),
        ).toMatchObject({ version: 7, name: "career-context", hashLength: 64 });
        database.exec(
          "CREATE TABLE persistence_probe(value TEXT NOT NULL) STRICT;",
        );
        database
          .prepare("INSERT INTO persistence_probe(value) VALUES (?)")
          .run("survives-reopen");
      } finally {
        database.close();
      }

      const reopened = openWorkspace(directory);
      expect(reopened).toEqual(first);

      const reopenedDatabase = new DatabaseSync(databasePath, {
        readOnly: true,
      });
      try {
        expect(
          reopenedDatabase
            .prepare("SELECT value FROM persistence_probe")
            .get(),
        ).toMatchObject({ value: "survives-reopen" });
      } finally {
        reopenedDatabase.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("upgrades the exact accepted v6 migration prefix to v7", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      createV6Workspace(directory);
      expect(openWorkspace(directory)).toEqual({ rootPath: directory });

      const database = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          database
            .prepare("SELECT version, name FROM schema_migrations ORDER BY version")
            .all(),
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
          database
            .prepare(
              "SELECT career_direction AS careerDirection, constraints_text AS constraints FROM career_context WHERE id = 1",
            )
            .get(),
        ).toEqual({ careerDirection: "", constraints: "" });
        expect(
          database
            .prepare(
              "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'career_context_activity'",
            )
            .get(),
        ).toEqual({ name: "career_context_activity" });
      } finally {
        database.close();
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
        const tables = unchanged
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
          )
          .all();
        expect(tables).toEqual([{ name: "foreign_data" }]);
      } finally {
        unchanged.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("fails closed when a migration hash is incompatible", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    const badHash = "0".repeat(64);

    try {
      createOrOpenWorkspace(directory);

      const database = new DatabaseSync(databasePath);
      try {
        database
          .prepare("UPDATE schema_migrations SET sha256 = ? WHERE version = 1")
          .run(badHash);
      } finally {
        database.close();
      }

      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a compatible AAAAT workspace.",
      );

      const unchanged = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          unchanged
            .prepare("SELECT sha256 FROM schema_migrations WHERE version = 1")
            .get(),
        ).toEqual({ sha256: badHash });
      } finally {
        unchanged.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("fails closed when a migration name is incompatible", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        database
          .prepare("UPDATE schema_migrations SET name = ? WHERE version = 2")
          .run("not-profile");
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

  it("fails closed when migration history contains a gap", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        database.prepare("DELETE FROM schema_migrations WHERE version = 2").run();
      } finally {
        database.close();
      }

      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a compatible AAAAT workspace.",
      );

      const unchanged = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          unchanged
            .prepare("SELECT version FROM schema_migrations ORDER BY version")
            .all(),
        ).toEqual([
          { version: 1 },
          { version: 3 },
          { version: 4 },
          { version: 5 },
          { version: 6 },
          { version: 7 },
        ]);
      } finally {
        unchanged.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("fails closed when migration history contains a future version", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        database
          .prepare(
            "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
          )
          .run(8, "future", "f".repeat(64), new Date().toISOString());
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
