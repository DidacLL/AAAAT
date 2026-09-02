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

import type { WorkspaceInfo } from "../shared/contracts";
import workspaceMigrationSql from "./migrations/001_workspace.sql?raw";
import profileMigrationSql from "./migrations/002_profile.sql?raw";
import documentMigrationSql from "./migrations/003_documents.sql?raw";
import candidatureMigrationSql from "./migrations/004_candidatures.sql?raw";
import conceptMigrationSql from "./migrations/005_concepts.sql?raw";
import activityMigrationSql from "./migrations/006_activity.sql?raw";

interface MigrationRow {
  readonly version: number;
  readonly name: string;
  readonly sha256: string;
}

interface InitializedRow {
  readonly initializedAt: string;
}

interface WorkspaceSettings {
  readonly lastWorkspacePath?: string;
}

interface MigrationDefinition {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
  readonly sha256: string;
}

const workspaceDatabaseName = "workspace.sqlite";

function migration(
  version: number,
  name: string,
  sql: string,
): MigrationDefinition {
  return Object.freeze({
    version,
    name,
    sql,
    sha256: createHash("sha256").update(sql).digest("hex"),
  });
}

const migrations = Object.freeze([
  migration(1, "workspace", workspaceMigrationSql),
  migration(2, "profile", profileMigrationSql),
  migration(3, "documents", documentMigrationSql),
  migration(4, "candidatures", candidatureMigrationSql),
  migration(5, "concepts", conceptMigrationSql),
  migration(6, "activity", activityMigrationSql),
]);

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

function validateAppliedMigrations(rows: readonly MigrationRow[]): void {
  if (rows.length === 0 || rows.length > migrations.length) {
    throw new WorkspaceError("The workspace migration history is incompatible.");
  }

  rows.forEach((row, index) => {
    const expected = migrations[index];
    if (
      !expected ||
      row.version !== expected.version ||
      row.name !== expected.name ||
      row.sha256 !== expected.sha256
    ) {
      throw new WorkspaceError("The workspace migration history is incompatible.");
    }
  });
}

function appliedMigrations(database: DatabaseSync): MigrationRow[] {
  return database
    .prepare(
      "SELECT version, name, sha256 FROM schema_migrations ORDER BY version",
    )
    .all() as unknown as MigrationRow[];
}

function applyMigrations(database: DatabaseSync, now: string): void {
  validateAppliedMigrations(appliedMigrations(database));

  for (const current of migrations) {
    const applied = database
      .prepare(
        "SELECT version, name, sha256 FROM schema_migrations WHERE version = ?",
      )
      .get(current.version) as unknown as MigrationRow | undefined;

    if (applied) {
      if (
        applied.name !== current.name ||
        applied.sha256 !== current.sha256
      ) {
        throw new WorkspaceError(
          "The workspace migration history is incompatible.",
        );
      }
      continue;
    }

    transact(database, () => {
      database.exec(current.sql);
      database
        .prepare(
          "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
        )
        .run(current.version, current.name, current.sha256, now);
    });
  }

  transact(database, () => {
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
    const rows = appliedMigrations(database);
    const initialized = database
      .prepare(
        "SELECT value AS initializedAt FROM workspace_metadata WHERE key = ?",
      )
      .get("workspace.initialized_at") as InitializedRow | undefined;

    validateAppliedMigrations(rows);
    if (!initialized) {
      throw new WorkspaceError(
        "The selected folder is not a compatible AAAAT workspace.",
      );
    }
  } catch {
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

    const rows = appliedMigrations(database);
    if (rows.length === 0) {
      const first = migrations[0];
      if (!first) {
        throw new WorkspaceError("AAAAT has no workspace migration.");
      }
      transact(database, () => {
        database.exec(first.sql);
        database
          .prepare(
            "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
          )
          .run(first.version, first.name, first.sha256, now);
      });
    }

    applyMigrations(database, now);
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

export function withWorkspaceDatabase<T>(
  rootPath: string,
  action: (database: DatabaseSync) => T,
): T {
  const canonicalPath = canonicalizeWorkspaceRoot(rootPath);
  verifyExistingWorkspace(canonicalPath);
  const databasePath = databasePathFor(canonicalPath);
  migrateDatabase(databasePath);

  const database = new DatabaseSync(databasePath);
  try {
    configureDatabase(database);
    return action(database);
  } finally {
    database.close();
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