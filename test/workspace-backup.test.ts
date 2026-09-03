// @vitest-environment node

import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createCandidature, listCandidatures } from "../src/main/candidature-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";
import {
  createWorkspaceBackup,
  parseWorkspaceBackupInvocation,
  parseWorkspaceRestoreInvocation,
  restoreWorkspaceBackup,
} from "../src/main/workspace-backup";

const roots: string[] = [];
const candidatureInput = {
  company: "Example Co",
  role: "Platform engineer",
  location: "Madrid",
  workMode: "Hybrid",
  salaryText: "",
  source: "Direct",
  sourceUrl: "",
  sourceText: "Private source text",
  status: "saved" as const,
  applicationDate: "",
  nextAction: "Review",
  nextActionDate: "",
  notes: "Private notes",
};

interface MutableBackupManifest {
  database: {
    size: number;
    sha256: string;
    migrations: [{ sha256: string }, ...Array<{ sha256: string }>];
  };
  files: [{ path: string }, ...Array<{ path: string }>];
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-recovery-"));
  const workspace = path.join(root, "workspace");
  const backup = path.join(root, "backup");
  const restore = path.join(root, "restore");
  mkdirSync(workspace);
  mkdirSync(backup);
  mkdirSync(restore);
  createOrOpenWorkspace(workspace);
  createCandidature(workspace, candidatureInput);

  const files = new Map([
    ["documents/cv.tex", "user cv"],
    ["artifacts/cv.pdf", "rendered artifact"],
    ["templates/custom.tex", "template"],
    ["integrations/vscode-mcp.json", '{"state":"proposed"}'],
    ["exports/candidatures.json", "export"],
  ]);
  for (const [relative, contents] of files) {
    const destination = path.join(workspace, ...relative.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, contents, "utf8");
  }
  writeFileSync(path.join(workspace, "ai-connection.json"), '{"endpoint":"local"}', "utf8");
  writeFileSync(path.join(workspace, ".env"), "TOKEN=secret", "utf8");
  mkdirSync(path.join(workspace, "private"));
  writeFileSync(path.join(workspace, "private", "identity.pem"), "secret", "utf8");

  roots.push(root);
  return { root, workspace, backup, restore, files };
}

function manifest(backup: string): MutableBackupManifest {
  return JSON.parse(
    readFileSync(path.join(backup, "manifest.json"), "utf8"),
  ) as MutableBackupManifest;
}

function writeManifest(backup: string, value: unknown): void {
  writeFileSync(path.join(backup, "manifest.json"), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function expectEmpty(directory: string): void {
  expect(readdirSync(directory)).toEqual([]);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("workspace backup and restore", () => {
  it("creates a portable consistent backup and restores user-owned data without secrets", async () => {
    const { root, workspace, backup, restore, files } = fixture();
    const before = listCandidatures(workspace);

    const created = await createWorkspaceBackup(
      workspace,
      backup,
      () => new Date("2026-09-03T12:00:00.000Z"),
    );

    expect(created).toMatchObject({ format: "aaaat-workspace-backup", version: 1 });
    const text = readFileSync(path.join(backup, "manifest.json"), "utf8");
    expect(text).not.toContain(root);
    expect(created.exclusions.join("\n")).toMatch(/ai-connection\.json/);
    expect(created.exclusions.join("\n")).toMatch(/\.env/);
    expect(created.files.map((file) => file.path).sort()).toEqual([...files.keys()].sort());
    expect(() => readFileSync(path.join(backup, "files", "ai-connection.json"))).toThrow();
    expect(() => readFileSync(path.join(backup, "files", ".env"))).toThrow();
    expect(() => readFileSync(path.join(backup, "files", "private", "identity.pem"))).toThrow();

    restoreWorkspaceBackup(backup, restore);
    expect(openWorkspace(restore).rootPath).toBe(restore);
    expect(listCandidatures(restore)).toEqual(before);
    for (const [relative, contents] of files) {
      expect(readFileSync(path.join(restore, ...relative.split("/")), "utf8")).toBe(contents);
    }
    expect(() => readFileSync(path.join(restore, "ai-connection.json"))).toThrow();
  });

  it("rejects payload corruption, traversal, incompatible migration metadata, and unsafe destinations before activation", async () => {
    const first = fixture();
    await createWorkspaceBackup(first.workspace, first.backup);
    writeFileSync(path.join(first.backup, "files", "documents", "cv.tex"), "tampered", "utf8");
    expect(() => restoreWorkspaceBackup(first.backup, first.restore)).toThrow();
    expectEmpty(first.restore);

    const second = fixture();
    await createWorkspaceBackup(second.workspace, second.backup);
    const traversing = manifest(second.backup);
    traversing.files[0].path = "../escape";
    writeManifest(second.backup, traversing);
    expect(() => restoreWorkspaceBackup(second.backup, second.restore)).toThrow(/unsafe path/);
    expectEmpty(second.restore);
    expect(() => readFileSync(path.join(second.root, "escape"))).toThrow();

    const third = fixture();
    await createWorkspaceBackup(third.workspace, third.backup);
    const incompatible = manifest(third.backup);
    incompatible.database.migrations[0].sha256 = "0".repeat(64);
    writeManifest(third.backup, incompatible);
    expect(() => restoreWorkspaceBackup(third.backup, third.restore)).toThrow(/migration metadata/);
    expectEmpty(third.restore);

    const fourth = fixture();
    await createWorkspaceBackup(fourth.workspace, fourth.backup);
    writeFileSync(path.join(fourth.restore, "existing.txt"), "occupied", "utf8");
    expect(() => restoreWorkspaceBackup(fourth.backup, fourth.restore)).toThrow(/must be empty/);

    const nestedBackup = path.join(fourth.workspace, "nested-backup");
    mkdirSync(nestedBackup);
    await expect(createWorkspaceBackup(fourth.workspace, nestedBackup)).rejects.toThrow(/must not overlap/);
  });

  it("rejects corrupted SQLite even when the manifest hash is rewritten to match", async () => {
    const { workspace, backup, restore } = fixture();
    await createWorkspaceBackup(workspace, backup);
    const databasePath = path.join(backup, "workspace.sqlite");
    const bytes = Buffer.from(readFileSync(databasePath));
    bytes.fill(0, 0, Math.min(128, bytes.length));
    writeFileSync(databasePath, bytes);
    const changed = manifest(backup);
    changed.database.size = bytes.length;
    changed.database.sha256 = createHash("sha256").update(bytes).digest("hex");
    writeManifest(backup, changed);

    expect(() => restoreWorkspaceBackup(backup, restore)).toThrow();
    expectEmpty(restore);
  });

  it("rejects manifest, database, payload, and payload-directory symlinks before reading or copying", async () => {
    if (process.platform === "win32") return;

    const manifestFixture = fixture();
    await createWorkspaceBackup(manifestFixture.workspace, manifestFixture.backup);
    const outsideManifest = path.join(manifestFixture.root, "outside-manifest.json");
    copyFileSync(path.join(manifestFixture.backup, "manifest.json"), outsideManifest);
    unlinkSync(path.join(manifestFixture.backup, "manifest.json"));
    symlinkSync(outsideManifest, path.join(manifestFixture.backup, "manifest.json"), "file");
    expect(() => restoreWorkspaceBackup(manifestFixture.backup, manifestFixture.restore)).toThrow(/symbolic-link/);
    expectEmpty(manifestFixture.restore);

    const databaseFixture = fixture();
    await createWorkspaceBackup(databaseFixture.workspace, databaseFixture.backup);
    const outsideDatabase = path.join(databaseFixture.root, "outside.sqlite");
    copyFileSync(path.join(databaseFixture.backup, "workspace.sqlite"), outsideDatabase);
    unlinkSync(path.join(databaseFixture.backup, "workspace.sqlite"));
    symlinkSync(outsideDatabase, path.join(databaseFixture.backup, "workspace.sqlite"), "file");
    expect(() => restoreWorkspaceBackup(databaseFixture.backup, databaseFixture.restore)).toThrow(/symbolic-link/);
    expectEmpty(databaseFixture.restore);

    const payloadFixture = fixture();
    await createWorkspaceBackup(payloadFixture.workspace, payloadFixture.backup);
    const payload = path.join(payloadFixture.backup, "files", "documents", "cv.tex");
    const outsidePayload = path.join(payloadFixture.root, "outside-cv.tex");
    copyFileSync(payload, outsidePayload);
    unlinkSync(payload);
    symlinkSync(outsidePayload, payload, "file");
    expect(() => restoreWorkspaceBackup(payloadFixture.backup, payloadFixture.restore)).toThrow(/symbolic-link/);
    expectEmpty(payloadFixture.restore);

    const directoryFixture = fixture();
    await createWorkspaceBackup(directoryFixture.workspace, directoryFixture.backup);
    const documents = path.join(directoryFixture.backup, "files", "documents");
    const outsideDocuments = path.join(directoryFixture.root, "outside-documents");
    renameSync(documents, outsideDocuments);
    symlinkSync(outsideDocuments, documents, "dir");
    expect(() => restoreWorkspaceBackup(directoryFixture.backup, directoryFixture.restore)).toThrow(/symbolic-link/);
    expectEmpty(directoryFixture.restore);
  });

  it("keeps the command surface to the two fixed recovery operations", () => {
    expect(
      parseWorkspaceBackupInvocation([
        "aaaat",
        "--workspace-backup",
        "--workspace",
        "workspace",
        "--destination",
        "backup",
      ]),
    ).toEqual({ workspacePath: "workspace", destinationPath: "backup" });
    expect(
      parseWorkspaceRestoreInvocation([
        "aaaat",
        "--workspace-restore",
        "--backup",
        "backup",
        "--destination",
        "workspace",
      ]),
    ).toEqual({ backupPath: "backup", destinationPath: "workspace" });
    expect(() =>
      parseWorkspaceBackupInvocation([
        "aaaat",
        "--workspace-backup",
        "--workspace-restore",
        "--workspace",
        "workspace",
        "--destination",
        "backup",
      ]),
    ).toThrow(/Invalid recovery invocation/);
  });
});
