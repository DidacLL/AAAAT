import { createHash } from "node:crypto";
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

const migrationFiles = [
  [1, "workspace", "001_workspace.sql"],
  [2, "profile", "002_profile.sql"],
  [3, "documents", "003_documents.sql"],
  [4, "candidatures", "004_candidatures.sql"],
  [5, "concepts", "005_concepts.sql"],
  [6, "activity", "006_activity.sql"],
] as const;

function initializeWorkspaceFixture(root: string): void {
  const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
  const now = "2026-09-03T00:00:00.000Z";
  try {
    database.exec(
      "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;",
    );
    for (const [version, name, file] of migrationFiles) {
      const sql = readFileSync(path.resolve("src/main/migrations", file), "utf8");
      database.exec("BEGIN IMMEDIATE");
      try {
        database.exec(sql);
        database
          .prepare(
            "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
          )
          .run(version, name, createHash("sha256").update(sql).digest("hex"), now);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
    database
      .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
      .run("workspace.initialized_at", now);
    database
      .prepare(
        `INSERT INTO candidatures(
           id, company, role, location, work_mode, salary_text,
           source, source_url, source_text, status, application_date,
           next_action, next_action_date, notes, archived, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(
        "packaged-recovery-candidature",
        "Example Co",
        "Platform engineer",
        "Madrid",
        "Hybrid",
        "",
        "Direct",
        "",
        "Private source text",
        "saved",
        "",
        "Review",
        "",
        "Private notes",
        now,
        now,
      );
    database
      .prepare("INSERT INTO candidature_activity(occurred_at, candidature_id, action) VALUES (?, ?, ?)")
      .run(now, "packaged-recovery-candidature", "candidature.created");
  } finally {
    database.close();
  }
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

test("packaged executable backs up and restores a workspace without secret or transient state", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-recovery-"));
  const workspace = path.join(root, "workspace");
  const backup = path.join(root, "backup");
  const restored = path.join(root, "restored");
  mkdirSync(workspace);
  mkdirSync(backup);
  mkdirSync(restored);
  initializeWorkspaceFixture(workspace);
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
    expect(manifestText).toContain("ai-connection.json");
    expect(readFileSync(path.join(backup, "files", "documents", "cv.tex"), "utf8")).toBe("portable cv");
    expect(readFileSync(path.join(backup, "files", "integrations", "vscode-mcp.json"), "utf8")).toBe('{"state":"proposed"}\n');
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
    expect(readFileSync(path.join(restored, "integrations", "vscode-mcp.json"), "utf8")).toBe('{"state":"proposed"}\n');
    expect(existsSync(path.join(restored, "ai-connection.json"))).toBe(false);

    const database = new DatabaseSync(path.join(restored, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        database
          .prepare("SELECT company, role, notes, priority FROM candidatures WHERE id = ?")
          .get("packaged-recovery-candidature"),
      ).toEqual({ company: "Example Co", role: "Platform engineer", notes: "Private notes", priority: "" });
      expect(
        database
          .prepare("SELECT kind, title, source_text AS sourceText FROM candidature_sources WHERE candidature_id = ?")
          .get("packaged-recovery-candidature"),
      ).toEqual({ kind: "other", title: "Direct", sourceText: "Private source text" });
      expect(
        database
          .prepare("SELECT pitch, recruiter_preparation AS recruiterPreparation FROM candidature_working_briefs WHERE candidature_id = ?")
          .get("packaged-recovery-candidature"),
      ).toEqual({ pitch: "", recruiterPreparation: "" });
      expect(
        database
          .prepare("SELECT action FROM candidature_activity WHERE candidature_id = ?")
          .get("packaged-recovery-candidature"),
      ).toEqual({ action: "candidature.created" });
      expect(database.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all()).toEqual([
        { version: 1, name: "workspace" },
        { version: 2, name: "profile" },
        { version: 3, name: "documents" },
        { version: 4, name: "candidatures" },
        { version: 5, name: "concepts" },
        { version: 6, name: "activity" },
        { version: 7, name: "career-context" },
        { version: 8, name: "candidature-sources-brief" },
      ]);
    } finally {
      database.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
