import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import workspaceMigrationSql from "./migrations/001_workspace.sql?raw";
import {
  workspaceStatusSchema,
  type WorkspaceStatus,
} from "../shared/contracts";

interface MigrationRow {
  readonly sha256: string;
}

interface InitializedRow {
  readonly initializedAt: string;
}

interface VersionRow {
  readonly schemaVersion: number | null;
}

const workspaceMigration = Object.freeze({
  version: 1,
  name: "workspace",
  sql: workspaceMigrationSql,
  sha256: createHash("sha256").update(workspaceMigrationSql).digest("hex"),
});

function configureDatabase(database: DatabaseSync): void {
  database.exec(
    "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;",
  );
}

function ensureMigrationTable(database: DatabaseSync): void {
  database.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;",
  );
}

function transact(database: DatabaseSync, action: () => void): void {
  database.exec("BEGIN IMMEDIATE");
  try {
    action();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function applyWorkspaceMigration(
  database: DatabaseSync,
  now: string,
): void {
  const applied = database
    .prepare("SELECT sha256 FROM schema_migrations WHERE version = ?")
    .get(workspaceMigration.version) as MigrationRow | undefined;

  if (applied && applied.sha256 !== workspaceMigration.sha256) {
    throw new Error("Workspace migration hash mismatch");
  }

  transact(database, () => {
    if (!applied) {
      database.exec(workspaceMigration.sql);
      database
        .prepare(
          "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
        )
        .run(
          workspaceMigration.version,
          workspaceMigration.name,
          workspaceMigration.sha256,
          now,
        );
    }

    database
      .prepare(
        "INSERT OR IGNORE INTO workspace_metadata(key, value) VALUES (?, ?)",
      )
      .run("workspace.initialized_at", now);
  });
}

function readWorkspaceStatus(databasePath: string): WorkspaceStatus {
  const database = new DatabaseSync(databasePath);
  try {
    configureDatabase(database);

    const initialized = database
      .prepare(
        "SELECT value AS initializedAt FROM workspace_metadata WHERE key = ?",
      )
      .get("workspace.initialized_at") as InitializedRow | undefined;
    const version = database
      .prepare(
        "SELECT MAX(version) AS schemaVersion FROM schema_migrations",
      )
      .get() as unknown as VersionRow;

    if (!initialized || version.schemaVersion === null) {
      throw new Error("Workspace initialization could not be verified");
    }

    return workspaceStatusSchema.parse({
      state: "ready",
      schemaVersion: version.schemaVersion,
      initializedAt: initialized.initializedAt,
    });
  } finally {
    database.close();
  }
}

export function initializeWorkspace(databasePath: string): WorkspaceStatus {
  const database = new DatabaseSync(databasePath);
  const now = new Date().toISOString();

  try {
    configureDatabase(database);
    ensureMigrationTable(database);
    applyWorkspaceMigration(database, now);
  } finally {
    database.close();
  }

  return readWorkspaceStatus(databasePath);
}
