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

interface TableListRow {
  readonly schema: string;
  readonly name: string;
  readonly type: string;
  readonly ncol: number;
  readonly wr: number;
  readonly strict: number;
}

interface TableColumnRow {
  readonly cid: number;
  readonly name: string;
  readonly type: string;
  readonly notNullValue: number;
  readonly defaultValue: string | null;
  readonly pk: number;
  readonly hidden: number;
}

interface ForeignKeyRow {
  readonly id: number;
  readonly seq: number;
  readonly tableName: string;
  readonly fromColumn: string;
  readonly toColumn: string | null;
  readonly onUpdate: string;
  readonly onDelete: string;
  readonly match: string;
}

interface IndexListRow {
  readonly name: string;
  readonly isUnique: number;
  readonly origin: string;
  readonly partial: number;
}

interface IndexColumnRow {
  readonly seqno: number;
  readonly cid: number;
  readonly name: string | null;
  readonly descending: number;
  readonly collation: string;
  readonly keyColumn: number;
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

function normalizeIdentifier(value: string): string {
  return value.toLowerCase();
}

function canonicalSqlTokens(sql: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < sql.length) {
    const character = sql[index] ?? "";

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === "-" && sql[index + 1] === "-") {
      index += 2;
      while (index < sql.length && sql[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (character === "/" && sql[index + 1] === "*") {
      const commentEnd = sql.indexOf("*/", index + 2);
      index = commentEnd === -1 ? sql.length : commentEnd + 2;
      continue;
    }

    if (character === "'") {
      let value = "";
      index += 1;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          value += "'";
          index += 2;
          continue;
        }
        if (sql[index] === "'") {
          index += 1;
          break;
        }
        value += sql[index] ?? "";
        index += 1;
      }
      tokens.push(`string:${value}`);
      continue;
    }

    if (character === '"' || character === "`" || character === "[") {
      const closing = character === "[" ? "]" : character;
      let value = "";
      index += 1;
      while (index < sql.length) {
        if (sql[index] === closing && sql[index + 1] === closing) {
          value += closing;
          index += 2;
          continue;
        }
        if (sql[index] === closing) {
          index += 1;
          break;
        }
        value += sql[index] ?? "";
        index += 1;
      }
      tokens.push(`identifier:${normalizeIdentifier(value)}`);
      continue;
    }

    if (/[A-Za-z0-9_$]/.test(character)) {
      const start = index;
      while (index < sql.length && /[A-Za-z0-9_$]/.test(sql[index] ?? "")) {
        index += 1;
      }
      tokens.push(`word:${sql.slice(start, index).toLowerCase()}`);
      continue;
    }

    const threeCharacterOperator = sql.slice(index, index + 3);
    if (threeCharacterOperator === "->>") {
      tokens.push(`symbol:${threeCharacterOperator}`);
      index += 3;
      continue;
    }

    const twoCharacterOperator = sql.slice(index, index + 2);
    if (
      ["<=", ">=", "<>", "!=", "==", "||", "<<", ">>", "->"].includes(
        twoCharacterOperator,
      )
    ) {
      tokens.push(`symbol:${twoCharacterOperator}`);
      index += 2;
      continue;
    }

    tokens.push(`symbol:${character}`);
    index += 1;
  }

  return tokens;
}

function extractCheckConstraints(sql: string | null): string[][] {
  if (!sql) {
    return [];
  }

  const tokens = canonicalSqlTokens(sql);
  const checks: string[][] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index] !== "word:check" || tokens[index + 1] !== "symbol:(") {
      continue;
    }

    let depth = 1;
    for (let end = index + 2; end < tokens.length; end += 1) {
      if (tokens[end] === "symbol:(") {
        depth += 1;
      } else if (tokens[end] === "symbol:)") {
        depth -= 1;
        if (depth === 0) {
          checks.push(tokens.slice(index + 2, end));
          index = end;
          break;
        }
      }
    }
  }

  return checks.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function sortSignatures<T>(values: T[]): T[] {
  return values.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function foreignKeySignature(rows: ForeignKeyRow[]): object[] {
  const groups = new Map<number, ForeignKeyRow[]>();
  for (const row of rows) {
    const group = groups.get(row.id) ?? [];
    group.push(row);
    groups.set(row.id, group);
  }

  return sortSignatures(
    [...groups.values()].map((group) => {
      const ordered = [...group].sort((left, right) => left.seq - right.seq);
      const first = ordered[0];
      if (!first) {
        throw new WorkspaceError("The workspace schema is incompatible.");
      }
      return {
        tableName: normalizeIdentifier(first.tableName),
        onUpdate: first.onUpdate.toLowerCase(),
        onDelete: first.onDelete.toLowerCase(),
        match: first.match.toLowerCase(),
        columns: ordered.map((row) => ({
          from: normalizeIdentifier(row.fromColumn),
          to: row.toColumn ? normalizeIdentifier(row.toColumn) : null,
        })),
      };
    }),
  );
}

function tableSignature(
  database: DatabaseSync,
  object: SchemaObjectRow,
  tableList: Map<string, TableListRow>,
): object {
  const table = tableList.get(normalizeIdentifier(object.name));
  if (!table) {
    throw new WorkspaceError("The workspace schema is incompatible.");
  }

  const columns = database
    .prepare(
      `SELECT cid, name, type, "notnull" AS notNullValue, dflt_value AS defaultValue, pk, hidden
       FROM pragma_table_xinfo(?)
       ORDER BY cid`,
    )
    .all(object.name) as unknown as TableColumnRow[];

  const foreignKeys = database
    .prepare(
      `SELECT id, seq, "table" AS tableName, "from" AS fromColumn,
              "to" AS toColumn, on_update AS onUpdate, on_delete AS onDelete, match
       FROM pragma_foreign_key_list(?)
       ORDER BY id, seq`,
    )
    .all(object.name) as unknown as ForeignKeyRow[];

  const indexes = database
    .prepare(
      `SELECT name, "unique" AS isUnique, origin, partial
       FROM pragma_index_list(?)`,
    )
    .all(object.name) as unknown as IndexListRow[];

  return {
    name: normalizeIdentifier(object.name),
    type: table.type.toLowerCase(),
    columnCount: table.ncol,
    withoutRowid: table.wr,
    strict: table.strict,
    columns: columns.map((column) => ({
      name: normalizeIdentifier(column.name),
      type: column.type.toLowerCase(),
      notNull: column.notNullValue,
      defaultValue:
        column.defaultValue === null
          ? null
          : canonicalSqlTokens(column.defaultValue),
      primaryKeyPosition: column.pk,
      hidden: column.hidden,
    })),
    foreignKeys: foreignKeySignature(foreignKeys),
    checks: extractCheckConstraints(object.sql),
    autoIncrement: canonicalSqlTokens(object.sql ?? "").includes(
      "word:autoincrement",
    ),
    indexes: sortSignatures(
      indexes.map((index) => {
        const indexColumns = database
          .prepare(
            `SELECT seqno, cid, name, "desc" AS descending, coll AS collation,
                    "key" AS keyColumn
             FROM pragma_index_xinfo(?)
             ORDER BY seqno`,
          )
          .all(index.name) as unknown as IndexColumnRow[];

        const explicitIndex = index.origin === "c";
        const indexObject = explicitIndex
          ? (database
              .prepare(
                `SELECT sql
                 FROM sqlite_schema
                 WHERE type = 'index' AND name = ?`,
              )
              .get(index.name) as { sql: string | null } | undefined)
          : undefined;

        return {
          name: explicitIndex ? normalizeIdentifier(index.name) : null,
          unique: index.isUnique,
          origin: index.origin.toLowerCase(),
          partial: index.partial,
          columns: indexColumns.map((column) => ({
            columnId: column.cid,
            name: column.name ? normalizeIdentifier(column.name) : null,
            descending: column.descending,
            collation: column.collation.toLowerCase(),
            keyColumn: column.keyColumn,
          })),
          definition:
            explicitIndex && indexObject?.sql
              ? canonicalSqlTokens(indexObject.sql)
              : null,
        };
      }),
    ),
  };
}

function schemaSignature(database: DatabaseSync): string {
  const objects = database
    .prepare(
      `SELECT type, name, tbl_name AS tableName, sql
       FROM sqlite_schema
       WHERE name NOT LIKE 'sqlite_%'
       ORDER BY type, name`,
    )
    .all() as unknown as SchemaObjectRow[];

  const tableListRows = database
    .prepare("PRAGMA table_list")
    .all() as unknown as TableListRow[];
  const tableList = new Map(
    tableListRows
      .filter((row) => row.schema === "main")
      .map((row) => [normalizeIdentifier(row.name), row]),
  );

  const objectCatalog = objects.map((object) => ({
    type: object.type.toLowerCase(),
    name: normalizeIdentifier(object.name),
    tableName: normalizeIdentifier(object.tableName),
  }));

  const tables = objects
    .filter((object) => object.type === "table")
    .map((object) => tableSignature(database, object, tableList));

  const triggers = objects
    .filter((object) => object.type === "trigger")
    .map((object) => ({
      name: normalizeIdentifier(object.name),
      tableName: normalizeIdentifier(object.tableName),
      definition: canonicalSqlTokens(object.sql ?? ""),
    }));

  return JSON.stringify({
    objects: sortSignatures(objectCatalog),
    tables: sortSignatures(tables),
    triggers: sortSignatures(triggers),
  });
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
