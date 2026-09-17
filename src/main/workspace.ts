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
import currentSchemaSql from "./schema.sql?raw";

interface InitializedRow {
  readonly initializedAt: string;
}

interface SchemaObjectRow {
  readonly type: string;
  readonly name: string;
  readonly tableName: string;
  readonly sql: string | null;
}

interface WorkspaceSettings {
  readonly lastWorkspacePath?: string;
}

const workspaceDatabaseName = "workspace.sqlite";

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

function schemaSignature(database: DatabaseSync): string {
  const rows = database
    .prepare(
      `SELECT type, name, tbl_name AS tableName, sql
       FROM sqlite_schema
       WHERE name NOT LIKE 'sqlite_%'
       ORDER BY type, name`,
    )
    .all() as unknown as SchemaObjectRow[];
  return JSON.stringify(rows);
}

function createCurrentSchemaSignature(): string {
  const reference = new DatabaseSync(":memory:");
  try {
    reference.exec(currentSchemaSql);
    return schemaSignature(reference);
  } finally {
    reference.close();
  }
}

const currentSchemaSignature = createCurrentSchemaSignature();

export function validateCurrentWorkspaceDatabase(database: DatabaseSync): void {
  const integrity = database.prepare("PRAGMA quick_check").get() as
    | Record<string, unknown>
    | undefined;
  if (!integrity || Object.values(integrity)[0] !== "ok") {
    throw new WorkspaceError("The workspace database is invalid.");
  }

  if (schemaSignature(database) !== currentSchemaSignature) {
    throw new WorkspaceError("The workspace schema is incompatible.");
  }

  const initialized = database
    .prepare("SELECT value AS initializedAt FROM workspace_metadata WHERE key = ?")
    .get("workspace.initialized_at") as InitializedRow | undefined;
  if (!initialized) {
    throw new WorkspaceError("The workspace metadata is incomplete.");
  }

  const careerContext = database
    .prepare("SELECT id FROM career_context WHERE id = 1")
    .get() as { id: number } | undefined;
  if (!careerContext) {
    throw new WorkspaceError("The workspace schema is incomplete.");
  }
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
    validateCurrentWorkspaceDatabase(database);
  } catch {
    throw new WorkspaceError(
      "The selected folder is not a compatible AAAAT workspace.",
    );
  } finally {
    database?.close();
  }
}

function initializeDatabase(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  const now = new Date().toISOString();

  try {
    configureDatabase(database);
    transact(database, () => {
      database.exec(currentSchemaSql);
      database
        .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
        .run("workspace.initialized_at", now);
    });
    validateCurrentWorkspaceDatabase(database);
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
    initializeDatabase(databasePath);
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
  return { rootPath: canonicalPath };
}

export function resetWorkspace(rootPath: string): WorkspaceInfo {
  const canonicalPath = removeWorkspaceData(rootPath);
  return initializeNewWorkspace(canonicalPath);
}

function removeWorkspaceData(rootPath: string): string {
  const canonicalPath = canonicalizeWorkspaceRoot(rootPath);
  verifyExistingWorkspace(canonicalPath);
  for (const target of [
    databasePathFor(canonicalPath),
    databasePathFor(canonicalPath) + "-wal",
    databasePathFor(canonicalPath) + "-shm",
    path.join(canonicalPath, "rendered-cvs"),
    path.join(canonicalPath, "application-packets"),
    path.join(canonicalPath, "ai-connection.json"),
  ]) {
    rmSync(target, { recursive: true, force: true });
  }
  return canonicalPath;
}

export function deleteWorkspace(rootPath: string): void {
  removeWorkspaceData(rootPath);
}

export function workspaceIsDemo(rootPath: string): boolean {
  return withWorkspaceDatabase(rootPath, (database) => {
    const row = database.prepare("SELECT value FROM workspace_metadata WHERE key = ?")
      .get("workspace.demo") as { value: string } | undefined;
    return row?.value === "1";
  });
}

export function withWorkspaceDatabase<T>(
  rootPath: string,
  action: (database: DatabaseSync) => T,
): T {
  const canonicalPath = canonicalizeWorkspaceRoot(rootPath);
  verifyExistingWorkspace(canonicalPath);
  const database = new DatabaseSync(databasePathFor(canonicalPath));
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

export function forgetWorkspacePath(settingsPath: string): void {
  rmSync(settingsPath, { force: true });
}
