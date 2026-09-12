import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "@playwright/test";

function packagedExecutable(): string {
  const packageRoot = path.resolve("out", "AAAAT-" + process.platform + "-" + process.arch);
  if (process.platform === "darwin") {
    const bundle = readdirSync(packageRoot).find((entry) => entry.endsWith(".app"));
    if (!bundle) throw new Error("Packaged macOS application bundle is missing");
    const executableDirectory = path.join(packageRoot, bundle, "Contents", "MacOS");
    const executable = readdirSync(executableDirectory)[0];
    if (!executable) throw new Error("Packaged macOS executable is missing");
    return path.join(executableDirectory, executable);
  }
  return path.join(packageRoot, process.platform === "win32" ? "aaaat.exe" : "aaaat");
}

function initializeCurrentWorkspace(root: string): string {
  const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
  const now = "2026-09-03T00:00:00.000Z";
  const candidatureId = "packaged-recovery-candidature";

  try {
    database.exec(readFileSync(path.resolve("src/main/schema.sql"), "utf8"));
    database.exec("BEGIN IMMEDIATE");
    try {
      const metadata = database.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)");
      metadata.run("workspace.product", "AAAAT");
      metadata.run("workspace.initialized_at", now);
      database
        .prepare(
          "INSERT INTO candidatures(id, archived, created_at, updated_at) VALUES (?, 0, ?, ?)",
        )
        .run(candidatureId, now, now);
      database
        .prepare("INSERT INTO candidature_activity(occurred_at, candidature_id, action) VALUES (?, ?, ?)")
        .run(now, candidatureId, "candidature.created");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }

  return candidatureId;
}

function run(executable: string, args: readonly string[]) {
  return spawnSync(executable, [...args], {
    encoding: "utf8",
    env: process.env,
    timeout: 30_000,
  });
}

function response(stdout: string): unknown {
  return JSON.parse(stdout.trim());
}

test("packaged recovery preserves a sparse workspace and user-owned data without secret or transient state", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-recovery-"));
  const workspace = path.join(root, "workspace");
  const backup = path.join(root, "backup");
  const restored = path.join(root, "restored");
  mkdirSync(workspace);
  mkdirSync(backup);
  mkdirSync(restored);
  const candidatureId = initializeCurrentWorkspace(workspace);
  mkdirSync(path.join(workspace, "documents"));
  mkdirSync(path.join(workspace, "integrations"));
  writeFileSync(path.join(workspace, "documents", "cv.tex"), "portable cv", "utf8");
  writeFileSync(
    path.join(workspace, "integrations", "vscode-mcp.json"),
    '{"state":"proposed"}\n',
    "utf8",
  );
  writeFileSync(path.join(workspace, "ai-connection.json"), '{"endpoint":"local"}\n', "utf8");
  writeFileSync(path.join(workspace, ".env"), "TOKEN=secret\n", "utf8");
  const executable = packagedExecutable();

  try {
    const backedUp = run(executable, [
      "--workspace-backup",
      "--workspace",
      workspace,
      "--destination",
      backup,
    ]);
    expect(backedUp.error).toBeUndefined();
    expect(backedUp.status).toBe(0);
    expect(response(backedUp.stdout)).toEqual({
      ok: true,
      operation: "workspace.backup",
      created: true,
    });

    const manifestText = readFileSync(path.join(backup, "manifest.json"), "utf8");
    expect(manifestText).not.toContain(root);
    expect(manifestText).not.toContain("schema_migrations");
    expect(manifestText).toContain("ai-connection.json");
    expect(readFileSync(path.join(backup, "files", "documents", "cv.tex"), "utf8")).toBe(
      "portable cv",
    );
    expect(
      readFileSync(path.join(backup, "files", "integrations", "vscode-mcp.json"), "utf8"),
    ).toBe('{"state":"proposed"}\n');
    expect(existsSync(path.join(backup, "files", "ai-connection.json"))).toBe(false);
    expect(existsSync(path.join(backup, "files", ".env"))).toBe(false);
    expect(existsSync(path.join(backup, "workspace.sqlite-wal"))).toBe(false);
    expect(existsSync(path.join(backup, "workspace.sqlite-shm"))).toBe(false);

    const restoredResult = run(executable, [
      "--workspace-restore",
      "--backup",
      backup,
      "--destination",
      restored,
    ]);
    expect(restoredResult.error).toBeUndefined();
    expect(restoredResult.status).toBe(0);
    expect(response(restoredResult.stdout)).toEqual({
      ok: true,
      operation: "workspace.restore",
      restored: true,
    });
    expect(readFileSync(path.join(restored, "documents", "cv.tex"), "utf8")).toBe("portable cv");
    expect(
      readFileSync(path.join(restored, "integrations", "vscode-mcp.json"), "utf8"),
    ).toBe('{"state":"proposed"}\n');
    expect(existsSync(path.join(restored, "ai-connection.json"))).toBe(false);

    const database = new DatabaseSync(path.join(restored, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        database
          .prepare("SELECT id, archived FROM candidatures WHERE id = ?")
          .get(candidatureId),
      ).toEqual({ id: candidatureId, archived: 0 });
      expect(
        database
          .prepare("SELECT action FROM candidature_activity WHERE candidature_id = ?")
          .get(candidatureId),
      ).toEqual({ action: "candidature.created" });
      expect(
        database.prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.product'").get(),
      ).toEqual({ value: "AAAAT" });
      expect(
        database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get(),
      ).toBeUndefined();
    } finally {
      database.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
