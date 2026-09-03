import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { Writable } from "node:stream";
import { backup, DatabaseSync } from "node:sqlite";

import { z } from "zod";

import {
  openWorkspace,
  validateWorkspaceMigrationHistory,
  type WorkspaceMigrationRow,
} from "./workspace";

const backupFlag = "--workspace-backup";
const restoreFlag = "--workspace-restore";
const workspaceFlag = "--workspace";
const sourceFlag = "--backup";
const destinationFlag = "--destination";
const databaseName = "workspace.sqlite";
const manifestName = "manifest.json";
const filesDirectory = "files";

const excludedNames = new Set([
  "ai-connection.json",
  "workspace.sqlite-wal",
  "workspace.sqlite-shm",
]);
const secretSuffixes = [".pem", ".key", ".p12", ".pfx"] as const;

const migrationSchema = z
  .object({
    version: z.number().int().positive(),
    name: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const fileSchema = z
  .object({
    path: z.string().min(1),
    size: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const manifestSchema = z
  .object({
    format: z.literal("aaaat-workspace-backup"),
    version: z.literal(1),
    createdAt: z.string().datetime(),
    database: z
      .object({
        path: z.literal(databaseName),
        size: z.number().int().nonnegative(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        migrations: z.array(migrationSchema).min(1),
      })
      .strict(),
    files: z.array(fileSchema),
    exclusions: z.array(z.string()).min(1),
  })
  .strict();

type BackupManifest = z.infer<typeof manifestSchema>;
type FileManifest = z.infer<typeof fileSchema>;

interface BackupInvocation {
  readonly workspacePath: string;
  readonly destinationPath: string;
}

interface RestoreInvocation {
  readonly backupPath: string;
  readonly destinationPath: string;
}

function exactlyOne(values: readonly string[], value: string): boolean {
  return values.filter((candidate) => candidate === value).length === 1;
}

function valueAfter(argv: readonly string[], flag: string): string {
  if (!exactlyOne(argv, flag)) throw new Error("Invalid recovery invocation.");
  const value = argv[argv.indexOf(flag) + 1];
  if (!value || value.startsWith("--")) throw new Error("Invalid recovery invocation.");
  return value;
}

export function isWorkspaceBackupInvocation(argv: readonly string[]): boolean {
  return argv.includes(backupFlag);
}

export function isWorkspaceRestoreInvocation(argv: readonly string[]): boolean {
  return argv.includes(restoreFlag);
}

export function parseWorkspaceBackupInvocation(argv: readonly string[]): BackupInvocation {
  if (!exactlyOne(argv, backupFlag) || argv.includes(restoreFlag)) {
    throw new Error("Invalid recovery invocation.");
  }
  return {
    workspacePath: valueAfter(argv, workspaceFlag),
    destinationPath: valueAfter(argv, destinationFlag),
  };
}

export function parseWorkspaceRestoreInvocation(argv: readonly string[]): RestoreInvocation {
  if (!exactlyOne(argv, restoreFlag) || argv.includes(backupFlag)) {
    throw new Error("Invalid recovery invocation.");
  }
  return {
    backupPath: valueAfter(argv, sourceFlag),
    destinationPath: valueAfter(argv, destinationFlag),
  };
}

function canonicalDirectory(directoryPath: string): string {
  if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
    throw new Error("Recovery directory is unavailable.");
  }
  return realpathSync(directoryPath);
}

function emptyDirectory(directoryPath: string): string {
  const canonical = canonicalDirectory(directoryPath);
  if (readdirSync(canonical).length !== 0) {
    throw new Error("Recovery destination must be empty.");
  }
  return canonical;
}

function nested(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== "..");
}

function rejectOverlap(left: string, right: string): void {
  if (nested(left, right) || nested(right, left)) {
    throw new Error("Recovery source and destination must not overlap.");
  }
}

function normalizedRelativePath(segments: readonly string[]): string {
  return segments.join("/");
}

function safeRelativePath(value: string): readonly string[] {
  if (
    value.includes("\0") ||
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value)
  ) {
    throw new Error("Backup contains an unsafe path.");
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Backup contains an unsafe path.");
  }
  return segments;
}

function isSecretName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === ".env" || lower.startsWith(".env.") || secretSuffixes.some((suffix) => lower.endsWith(suffix));
}

function includedWorkspaceFiles(rootPath: string): readonly string[] {
  const result: string[] = [];
  const walk = (directory: string, segments: readonly string[]) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const nextSegments = [...segments, entry.name];
      const relative = normalizedRelativePath(nextSegments);
      if (segments.length === 0 && (entry.name === databaseName || excludedNames.has(entry.name))) continue;
      if (isSecretName(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const status = lstatSync(absolute);
      if (status.isSymbolicLink()) throw new Error("Workspace backup does not follow symbolic links.");
      if (entry.isDirectory()) walk(absolute, nextSegments);
      else if (entry.isFile()) result.push(relative);
      else throw new Error("Workspace backup supports regular files only.");
    }
  };
  walk(rootPath, []);
  return result;
}

function hashFile(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function fileRecord(filePath: string, relativePath: string): FileManifest {
  return {
    path: relativePath,
    size: statSync(filePath).size,
    sha256: hashFile(filePath),
  };
}

function readMigrationRows(database: DatabaseSync): WorkspaceMigrationRow[] {
  return database
    .prepare("SELECT version, name, sha256 FROM schema_migrations ORDER BY version")
    .all() as unknown as WorkspaceMigrationRow[];
}

function cleanDirectory(directoryPath: string): void {
  for (const entry of readdirSync(directoryPath)) {
    rmSync(path.join(directoryPath, entry), { recursive: true, force: true });
  }
}

function removeDatabaseSidecars(databasePath: string): void {
  rmSync(databasePath + "-wal", { force: true });
  rmSync(databasePath + "-shm", { force: true });
}

function rejectDatabaseSidecars(databasePath: string): void {
  if (existsSync(databasePath + "-wal") || existsSync(databasePath + "-shm")) {
    throw new Error("Backup contains transient SQLite state.");
  }
}

export async function createWorkspaceBackup(
  workspacePath: string,
  destinationPath: string,
  now: () => Date = () => new Date(),
): Promise<BackupManifest> {
  const workspace = openWorkspace(workspacePath).rootPath;
  const destination = emptyDirectory(destinationPath);
  rejectOverlap(workspace, destination);

  const databaseDestination = path.join(destination, databaseName);
  try {
    const source = new DatabaseSync(path.join(workspace, databaseName), { readOnly: true });
    try {
      await backup(source, databaseDestination);
    } finally {
      source.close();
    }

    const files: FileManifest[] = [];
    for (const relative of includedWorkspaceFiles(workspace)) {
      const segments = safeRelativePath(relative);
      const sourcePath = path.join(workspace, ...segments);
      const payloadPath = path.join(destination, filesDirectory, ...segments);
      mkdirSync(path.dirname(payloadPath), { recursive: true });
      copyFileSync(sourcePath, payloadPath);
      files.push(fileRecord(payloadPath, relative));
    }

    const database = new DatabaseSync(databaseDestination, { readOnly: true });
    let migrations: WorkspaceMigrationRow[];
    try {
      migrations = readMigrationRows(database);
      validateWorkspaceMigrationHistory(migrations);
    } finally {
      database.close();
    }
    removeDatabaseSidecars(databaseDestination);

    const manifest: BackupManifest = {
      format: "aaaat-workspace-backup",
      version: 1,
      createdAt: now().toISOString(),
      database: {
        path: databaseName,
        size: statSync(databaseDestination).size,
        sha256: hashFile(databaseDestination),
        migrations,
      },
      files,
      exclusions: [
        "ai-connection.json (machine-local AI configuration and possible credentials)",
        "workspace.sqlite-wal and workspace.sqlite-shm (transient SQLite state)",
        ".env/.env.* and *.pem/*.key/*.p12/*.pfx (secret material)",
        "symbolic links and special files (path-bound external state)",
      ],
    };
    writeFileSync(path.join(destination, manifestName), JSON.stringify(manifest, null, 2) + "\n", "utf8");
    return manifest;
  } catch (error) {
    cleanDirectory(destination);
    throw error;
  }
}

function checkedRegularFile(rootPath: string, segments: readonly string[]): string {
  let current = rootPath;
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    if (!existsSync(current)) throw new Error("Backup payload is incomplete.");
    const status = lstatSync(current);
    if (status.isSymbolicLink()) throw new Error("Backup contains a symbolic-link path.");
    if (index < segments.length - 1) {
      if (!status.isDirectory()) throw new Error("Backup payload path is invalid.");
    } else if (!status.isFile()) {
      throw new Error("Backup payload is not a regular file.");
    }
  }
  const canonical = realpathSync(current);
  if (!nested(rootPath, canonical)) throw new Error("Backup payload escapes the backup root.");
  return current;
}

function readAndValidateManifest(backupPath: string): BackupManifest {
  const manifestPath = checkedRegularFile(backupPath, [manifestName]);
  return manifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
}

function validateBackupFile(
  backupPath: string,
  segments: readonly string[],
  expected: { size: number; sha256: string },
): string {
  const filePath = checkedRegularFile(backupPath, segments);
  const status = lstatSync(filePath);
  if (status.size !== expected.size || hashFile(filePath) !== expected.sha256) {
    throw new Error("Backup payload integrity check failed.");
  }
  return filePath;
}

function validateDatabaseBackup(backupPath: string, manifest: BackupManifest): void {
  const databasePath = validateBackupFile(backupPath, [databaseName], manifest.database);
  rejectDatabaseSidecars(databasePath);
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const integrity = database.prepare("PRAGMA integrity_check").get() as Record<string, unknown> | undefined;
    if (!integrity || Object.values(integrity)[0] !== "ok") throw new Error("Backup database integrity check failed.");
    const migrations = readMigrationRows(database);
    validateWorkspaceMigrationHistory(migrations);
    if (JSON.stringify(migrations) !== JSON.stringify(manifest.database.migrations)) {
      throw new Error("Backup database migration metadata does not match the manifest.");
    }
  } finally {
    database.close();
    removeDatabaseSidecars(databasePath);
  }
}

function validateFilePayloads(backupPath: string, manifest: BackupManifest): void {
  const seen = new Set<string>();
  for (const file of manifest.files) {
    const segments = safeRelativePath(file.path);
    if (file.path === databaseName || excludedNames.has(file.path) || isSecretName(segments.at(-1) ?? "")) {
      throw new Error("Backup manifest contains a forbidden file.");
    }
    if (seen.has(file.path)) throw new Error("Backup manifest contains duplicate files.");
    seen.add(file.path);
    validateBackupFile(backupPath, [filesDirectory, ...segments], file);
  }
}

export function restoreWorkspaceBackup(backupPath: string, destinationPath: string): void {
  const source = canonicalDirectory(backupPath);
  const destination = emptyDirectory(destinationPath);
  rejectOverlap(source, destination);

  const manifest = readAndValidateManifest(source);
  validateDatabaseBackup(source, manifest);
  validateFilePayloads(source, manifest);

  try {
    const databaseSource = checkedRegularFile(source, [databaseName]);
    copyFileSync(databaseSource, path.join(destination, databaseName));
    for (const file of manifest.files) {
      const segments = safeRelativePath(file.path);
      const payload = checkedRegularFile(source, [filesDirectory, ...segments]);
      const target = path.join(destination, ...segments);
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(payload, target);
    }
    openWorkspace(destination);
  } catch (error) {
    cleanDirectory(destination);
    throw error;
  }
}

function writeResponse(stdout: Writable, response: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    stdout.write(JSON.stringify(response) + "\n", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function runWorkspaceRecoveryProcess(argv: readonly string[], stdout: Writable): Promise<number> {
  try {
    if (isWorkspaceBackupInvocation(argv)) {
      const invocation = parseWorkspaceBackupInvocation(argv);
      await createWorkspaceBackup(invocation.workspacePath, invocation.destinationPath);
      await writeResponse(stdout, { ok: true, operation: "workspace.backup", created: true });
      return 0;
    }
    if (isWorkspaceRestoreInvocation(argv)) {
      const invocation = parseWorkspaceRestoreInvocation(argv);
      restoreWorkspaceBackup(invocation.backupPath, invocation.destinationPath);
      await writeResponse(stdout, { ok: true, operation: "workspace.restore", restored: true });
      return 0;
    }
    throw new Error("Invalid recovery invocation.");
  } catch {
    await writeResponse(stdout, { ok: false, error: "recovery-failed" });
    return 2;
  }
}
