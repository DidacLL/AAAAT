import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import workspaceMigrationSql from "./migrations/001_workspace.sql?raw";
import type { WorkspaceInfo } from "../shared/contracts";

interface MigrationRow {
  readonly name: string;
  readonly sha256: string;
}

interface InitializedRow {
  readonly initializedAt: string;
}

interface VersionRow {
  readonly schemaVersion: number | null;
}

interface WorkspaceSettings {
  readonly lastWorkspacePath?: string;
}

const workspaceDatabaseName = "workspace.sqlite";

const workspaceMigration = Object.freeze({
  version: 1,
  name: "workspace",
  sql: workspaceMigrationSql,
  sha256: createHash("sha256").update(workspaceMigrationSql).digest("hex"),
});

class WorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

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
    .prepare("SELECT name, sha256 FROM schema_migrations WHERE version = ?")
    .get(workspaceMigration.version) as MigrationRow | undefined;

  if (
    applied &&
    (applied.name !== workspaceMigration.name ||
      applied.sha256 !== workspaceMigration.sha256)
  ) {
    throw new WorkspaceError("The workspace migration history is incompatible.");
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

function canonicalizeWorkspaceRoot(rootPath: string): string {
  if (!existsSync(rootPath)) {
    throw new WorkspaceError("The selected workspace folder no longer exists.");
  }

  if (!statSync(rootPath).isDirectory()) {
    throw new WorkspaceError("The selected workspace location is not a folder.");
  }

  const canonicalPath = realpathSync(rootPath);

  try {
    accessSync(canonicalPath, constants.R_OK | constants.W_OK);
  } catch {
    throw new WorkspaceError("The selected workspace folder is not writable.");
  }

  return canonicalPath;
}

function databasePathFor(rootPath: string): string {
  return path.join(rootPath, workspaceDatabaseName);
}

function verifyExistingWorkspace(rootPath: string): void {
  const databasePath = databasePathFor(rootPath);
  if (!existsSync(databasePath) || !statSync(databasePath).isFile()) {
    throw new WorkspaceError(
      "The selected folder is not an initialized AAAAT workspace.",
    );
  }

  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const migration = database
      .prepare("SELECT name, sha256 FROM schema_migrations WHERE version = ?")
      .get(workspaceMigration.version) as MigrationRow | undefined;
    const version = database
      .prepare("SELECT MAX(version) AS schemaVersion FROM schema_migrations")
      .get() as unknown as VersionRow;
    const initialized = database
      .prepare(
        "SELECT value AS initializedAt FROM workspace_metadata WHERE key = ?",
      )
      .get("workspace.initialized_at") as InitializedRow | undefined;

    if (
      !migration ||
      migration.name !== workspaceMigration.name ||
      migration.sha256 !== workspaceMigration.sha256 ||
      version.schemaVersion === null ||
      version.schemaVersion > workspaceMigration.version ||
      !initialized
    ) {
      throw new WorkspaceError(
        "The selected folder is not a compatible AAAAT workspace.",
      );
    }
  } catch (error) {
    if (error instanceof WorkspaceError) {
      throw error;
    }

    throw new WorkspaceError(
      "The selected folder is not a compatible AAAAT workspace.",
    );
  } finally {
    database?.close();
  }
}

function migrateDatabase(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  const now = new Date().toISOString();

  try {
    configureDatabase(database);
    ensureMigrationTable(database);
    applyWorkspaceMigration(database, now);
  } finally {
    database.close();
  }
}

function cleanFailedNewDatabase(databasePath: string): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(databasePath + suffix, { force: true });
  }
}

function initializeNewWorkspace(rootPath: string): WorkspaceInfo {
  const databasePath = databasePathFor(rootPath);

  try {
    migrateDatabase(databasePath);
    return { rootPath };
  } catch (error) {
    cleanFailedNewDatabase(databasePath);
    if (error instanceof WorkspaceError) {
      throw error;
    }

    throw new WorkspaceError("AAAAT could not initialize this workspace.");
  }
}

export function createOrOpenWorkspace(rootPath: string): WorkspaceInfo {
  const canonicalPath = canonicalizeWorkspaceRoot(rootPath);
  const databasePath = databasePathFor(canonicalPath);

  if (existsSync(databasePath)) {
    return openWorkspace(canonicalPath);
  }

  if (readdirSync(canonicalPath).length > 0) {
    throw new WorkspaceError(
      "Choose an empty folder or an existing AAAAT workspace.",
    );
  }

  return initializeNewWorkspace(canonicalPath);
}

export function openWorkspace(rootPath: string): WorkspaceInfo {
  const canonicalPath = canonicalizeWorkspaceRoot(rootPath);
  verifyExistingWorkspace(canonicalPath);

  try {
    migrateDatabase(databasePathFor(canonicalPath));
    return { rootPath: canonicalPath };
  } catch (error) {
    if (error instanceof WorkspaceError) {
      throw error;
    }

    throw new WorkspaceError("AAAAT could not open this workspace.");
  }
}

export function readLastWorkspacePath(settingsPath: string): string | null {
  if (!existsSync(settingsPath)) {
    return null;
  }

  try {
    const settings = JSON.parse(
      readFileSync(settingsPath, "utf8"),
    ) as WorkspaceSettings;
    return typeof settings.lastWorkspacePath === "string" &&
      settings.lastWorkspacePath.length > 0
      ? settings.lastWorkspacePath
      : null;
  } catch {
    throw new WorkspaceError("AAAAT could not read the last workspace setting.");
  }
}

export function rememberWorkspacePath(
  settingsPath: string,
  rootPath: string,
): void {
  const settings: WorkspaceSettings = { lastWorkspacePath: rootPath };
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}
