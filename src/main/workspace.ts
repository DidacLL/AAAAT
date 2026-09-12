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
import workspaceSchemaSql from "./schema.sql?raw";

interface WorkspaceSettings {
  readonly lastWorkspacePath?: string;
}

interface MetadataRow {
  readonly value: string;
}

const workspaceDatabaseName = "workspace.sqlite";
const workspaceProductKey = "workspace.product";
const workspaceProductValue = "AAAAT";
const workspaceInitializedAtKey = "workspace.initialized_at";

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

function metadataValue(database: DatabaseSync, key: string): string | null {
  const row = database
    .prepare("SELECT value FROM workspace_metadata WHERE key = ?")
    .get(key) as MetadataRow | undefined;
  return row?.value ?? null;
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
    const product = metadataValue(database, workspaceProductKey);
    const initializedAt = metadataValue(database, workspaceInitializedAtKey);
    if (product !== workspaceProductValue || !initializedAt) {
      throw new Error("not-current-workspace");
    }
  } catch {
    throw new WorkspaceError(
      "The selected folder is not a current AAAAT workspace.",
    );
  } finally {
    database?.close();
  }
}

function cleanFailedNewDatabase(databasePath: string): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(databasePath + suffix, { force: true });
  }
}

function initializeNewWorkspace(rootPath: string): WorkspaceInfo {
  const databasePath = databasePathFor(rootPath);
  const database = new DatabaseSync(databasePath);
  const now = new Date().toISOString();

  try {
    configureDatabase(database);
    transact(database, () => {
      database.exec(workspaceSchemaSql);
      const insertMetadata = database.prepare(
        "INSERT INTO workspace_metadata(key, value) VALUES (?, ?)",
      );
      insertMetadata.run(workspaceProductKey, workspaceProductValue);
      insertMetadata.run(workspaceInitializedAtKey, now);
    });
    return { rootPath };
  } catch (error) {
    database.close();
    cleanFailedNewDatabase(databasePath);
    if (error instanceof WorkspaceError) throw error;
    throw new WorkspaceError("AAAAT could not initialize this workspace.");
  } finally {
    try {
      database.close();
    } catch {
      // The database may already be closed after a failed initialization.
    }
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
