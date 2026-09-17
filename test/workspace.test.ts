// @vitest-environment node

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import currentSchemaSql from "../src/main/schema.sql?raw";
import {
  createOrOpenWorkspace,
  deleteWorkspace,
  forgetWorkspacePath,
  openWorkspace,
  readLastWorkspacePath,
  rememberWorkspacePath,
} from "../src/main/workspace";

function temporaryDirectory(): string {
  return mkdtempSync(path.join(tmpdir(), "aaaat-workspace-"));
}

function createWorkspaceDatabase(directory: string, schemaSql: string): void {
  const database = new DatabaseSync(path.join(directory, "workspace.sqlite"));
  try {
    database.exec(schemaSql);
    database
      .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
      .run("workspace.initialized_at", "2026-09-17T00:00:00.000Z");
  } finally {
    database.close();
  }
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
          database
            .prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.initialized_at'")
            .get(),
        ).toMatchObject({ value: expect.any(String) });
        database
          .prepare(
            "INSERT INTO tags(id, name, definition, notes, aliases_json, created_at, updated_at) VALUES (?, ?, ?, '', '[]', ?, ?)",
          )
          .run(
            "persistence-probe",
            "Persistence probe",
            "survives reopen",
            "2026-09-17T00:00:00.000Z",
            "2026-09-17T00:00:00.000Z",
          );
      } finally {
        database.close();
      }

      expect(openWorkspace(directory)).toEqual(first);
      const reopenedDatabase = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          reopenedDatabase
            .prepare("SELECT name, definition FROM tags WHERE id = ?")
            .get("persistence-probe"),
        ).toEqual({ name: "Persistence probe", definition: "survives reopen" });
      } finally {
        reopenedDatabase.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("accepts structurally equivalent schema with presentation-different DDL", () => {
    const directory = temporaryDirectory();
    try {
      const presentationVariant = currentSchemaSql
        .replace(
          `CREATE TABLE workspace_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;`,
          `create table WORKSPACE_METADATA(
key text primary key,
value text not null
) strict;`,
        )
        .replace(
          `CREATE UNIQUE INDEX candidatures_one_opportunity_research_selected
  ON candidatures(opportunity_research_selected)
  WHERE opportunity_research_selected = 1;`,
          `create unique index candidatures_one_opportunity_research_selected
on candidatures ( opportunity_research_selected )
where opportunity_research_selected=1;`,
        )
        .replace(
          `CREATE TRIGGER candidatures_opportunity_research_active_insert
BEFORE INSERT ON candidatures
WHEN NEW.opportunity_research_selected = 1 AND NEW.archived = 1
BEGIN
  SELECT RAISE(ABORT, 'Archived candidature cannot be selected for opportunity research');
END;`,
          `create trigger CANDIDATURES_OPPORTUNITY_RESEARCH_ACTIVE_INSERT
before insert on candidatures
when new.opportunity_research_selected=1 and new.archived=1
begin
select raise(abort,'Archived candidature cannot be selected for opportunity research');
end;`,
        );

      expect(presentationVariant).not.toBe(currentSchemaSql);
      createWorkspaceDatabase(directory, presentationVariant);

      expect(openWorkspace(directory)).toEqual({ rootPath: directory });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a materially different current-schema constraint", () => {
    const directory = temporaryDirectory();
    try {
      const materiallyDifferentSchema = currentSchemaSql.replace(
        "archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),",
        "archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1, 2)),",
      );

      expect(materiallyDifferentSchema).not.toBe(currentSchemaSql);
      createWorkspaceDatabase(directory, materiallyDifferentSchema);

      expect(() => openWorkspace(directory)).toThrow(
        "The selected folder is not a compatible AAAAT workspace.",
      );
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

  it("rejects schema objects that are not part of the current schema truth", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        database.exec("CREATE TABLE obsolete_schema_probe(value TEXT NOT NULL) STRICT;");
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
            .prepare("SELECT name FROM sqlite_schema WHERE name = 'obsolete_schema_probe'")
            .get(),
        ).toEqual({ name: "obsolete_schema_probe" });
      } finally {
        unchanged.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a workspace missing its required current seed invariant", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "workspace.sqlite");
    try {
      createOrOpenWorkspace(directory);
      const database = new DatabaseSync(databasePath);
      try {
        database.exec("DELETE FROM career_context WHERE id = 1;");
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

  it("deletes managed workspace data without recreating the old workspace", () => {
    const directory = temporaryDirectory();
    const workspacePath = path.join(directory, "workspace");
    const settingsPath = path.join(directory, "workspace-settings.json");
    try {
      mkdirSync(workspacePath);
      createOrOpenWorkspace(workspacePath);
      mkdirSync(path.join(workspacePath, "rendered-cvs"));
      mkdirSync(path.join(workspacePath, "application-packets"));
      writeFileSync(path.join(workspacePath, "rendered-cvs", "draft.txt"), "owned render");
      writeFileSync(path.join(workspacePath, "application-packets", "draft.txt"), "owned packet");
      writeFileSync(path.join(workspacePath, "keep.txt"), "unrelated file");
      rememberWorkspacePath(settingsPath, workspacePath);

      deleteWorkspace(workspacePath);
      forgetWorkspacePath(settingsPath);

      expect(existsSync(workspacePath)).toBe(true);
      expect(existsSync(path.join(workspacePath, "workspace.sqlite"))).toBe(false);
      expect(existsSync(path.join(workspacePath, "rendered-cvs"))).toBe(false);
      expect(existsSync(path.join(workspacePath, "application-packets"))).toBe(false);
      expect(existsSync(path.join(workspacePath, "keep.txt"))).toBe(true);
      expect(readLastWorkspacePath(settingsPath)).toBeNull();
      expect(() => openWorkspace(workspacePath)).toThrow();
      expect(existsSync(path.join(workspacePath, "workspace.sqlite"))).toBe(false);
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
