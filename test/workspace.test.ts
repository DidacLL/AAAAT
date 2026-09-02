// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { initializeWorkspace } from "../src/main/workspace";

describe("workspace initialization", () => {
  it("migrates, writes, closes, reopens, and verifies a file database", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "aaaat-workspace-"));
    const databasePath = path.join(directory, "workspace.sqlite");

    try {
      const first = initializeWorkspace(databasePath);
      const second = initializeWorkspace(databasePath);

      expect(first).toEqual(second);
      expect(second).toMatchObject({
        state: "ready",
        schemaVersion: 1,
      });

      const database = new DatabaseSync(databasePath, { readOnly: true });
      try {
        const migration = database
          .prepare(
            "SELECT version, name, length(sha256) AS hashLength FROM schema_migrations",
          )
          .get();

        expect(migration).toMatchObject({
          version: 1,
          name: "workspace",
          hashLength: 64,
        });
      } finally {
        database.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
