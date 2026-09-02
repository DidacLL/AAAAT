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
              "SELECT version, name, length(sha256) AS hashLength FROM schema_migrations",
            )
            .get(),
        ).toMatchObject({ version: 1, name: "workspace", hashLength: 64 });
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

  it("fails closed when migration history is incompatible", () => {
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
