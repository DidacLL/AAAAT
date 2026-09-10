// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

const candidatureMigration004Sha256 =
  "cd99bdafdfb0bf4f4203221715be57ec9015fd4a8d1184e18bf20e71a1c7f87d";

describe("opportunity research migration", () => {
  it("appends migration 010 without rewriting the accepted migration prefix and upgrades v9", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-opportunity-research-migration-"));
    const databasePath = path.join(root, "workspace.sqlite");
    try {
      createOrOpenWorkspace(root);
      const database = new DatabaseSync(databasePath);
      try {
        expect(
          database.prepare("SELECT sha256 FROM schema_migrations WHERE version = 4").get(),
        ).toEqual({ sha256: candidatureMigration004Sha256 });
        expect(
          database.prepare("SELECT version, name FROM schema_migrations WHERE version = 10").get(),
        ).toEqual({ version: 10, name: "opportunity-research-access" });

        database.exec("DROP TRIGGER candidatures_opportunity_research_active_insert;");
        database.exec("DROP TRIGGER candidatures_opportunity_research_active_update;");
        database.exec("DROP INDEX candidatures_one_opportunity_research_selected;");
        database.exec("ALTER TABLE candidatures DROP COLUMN opportunity_research_selected;");
        database.prepare("DELETE FROM schema_migrations WHERE version = 10").run();
      } finally {
        database.close();
      }

      expect(openWorkspace(root)).toEqual({ rootPath: root });
      const upgraded = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          upgraded.prepare("SELECT version, name FROM schema_migrations WHERE version = 10").get(),
        ).toEqual({ version: 10, name: "opportunity-research-access" });
        expect(
          upgraded
            .prepare("SELECT opportunity_research_selected AS selected FROM candidatures LIMIT 1")
            .all(),
        ).toEqual([]);
        expect(
          upgraded.prepare("SELECT sha256 FROM schema_migrations WHERE version = 4").get(),
        ).toEqual({ sha256: candidatureMigration004Sha256 });
      } finally {
        upgraded.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
