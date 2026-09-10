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
  it("initializes an empty directory and reopens it without damaging user data", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      const first = createOrOpenWorkspace(directory);
      expect(first).toEqual({ rootPath: directory });
      expect(existsSync(databasePath)).toBe(true);

      const database = new DatabaseSync(databasePath);
      try {
        const migrations = database
          .prepare("SELECT version, name, sha256 FROM schema_migrations ORDER BY version")
          .all() as Array<{ version: number; name: string; sha256: string }>;
        expect(migrations).not.toHaveLength(0);
        for (const migration of migrations) {
          expect(migration.version).toEqual(expect.any(Number));
          expect(migration.name).toEqual(expect.any(String));
          expect(migration.sha256).toMatch(/^[a-f0-9]{64}$/);
        }
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

  it("fails closed when a migration hash is incompatible", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    const badHash = "0".repeat(64);
    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        const first = database
          .prepare("SELECT version FROM schema_migrations ORDER BY version LIMIT 1")
          .get() as { version: number };
        database.prepare("UPDATE schema_migrations SET sha256 = ? WHERE version = ?").run(badHash, first.version);
      } finally {
        database.close();
      }
      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a compatible AAAAT workspace.",
      );
      const unchanged = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(unchanged.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE sha256 = ?").get(badHash)).toEqual({ count: 1 });
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
        const first = database
          .prepare("SELECT version FROM schema_migrations ORDER BY version LIMIT 1")
          .get() as { version: number };
        database.prepare("UPDATE schema_migrations SET name = ? WHERE version = ?").run("tampered-name", first.version);
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
      const before = database
        .prepare("SELECT version FROM schema_migrations ORDER BY version")
        .all() as Array<{ version: number }>;
      const removed = before[1];
      if (!removed) throw new Error("Expected a workspace with more than one migration");
      try {
        database.prepare("DELETE FROM schema_migrations WHERE version = ?").run(removed.version);
      } finally {
        database.close();
      }
      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a compatible AAAAT workspace.",
      );
      const unchanged = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(unchanged.prepare("SELECT version FROM schema_migrations ORDER BY version").all()).toEqual(
          before.filter((migration) => migration.version !== removed.version),
        );
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
        const latest = database
          .prepare("SELECT MAX(version) AS version FROM schema_migrations")
          .get() as { version: number };
        database
          .prepare(
            "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
          )
          .run(latest.version + 1, "future", "f".repeat(64), new Date().toISOString());
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
