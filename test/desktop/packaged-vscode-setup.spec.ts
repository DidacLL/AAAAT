import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
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
  } finally {
    database.close();
  }
}

function runSetup(executable: string, workspace: string, project: string, activate: boolean) {
  return spawnSync(
    executable,
    [
      "--vscode-mcp-setup",
      "--workspace",
      workspace,
      "--project",
      project,
      ...(activate ? ["--activate"] : []),
    ],
    { encoding: "utf8", env: process.env, timeout: 30_000 },
  );
}

function response(stdout: string): unknown {
  return JSON.parse(stdout.trim());
}

function expectedServerEntry(executable: string, workspace: string) {
  return {
    type: "stdio",
    command: realpathSync(executable),
    args: ["--mcp", "--workspace", realpathSync(workspace)],
    ...(process.platform === "win32"
      ? { env: { ELECTRON_NO_ATTACH_CONSOLE: "1" } }
      : {}),
  };
}

function verifyVsCodeAcceptsServer(root: string, server: Record<string, unknown>): void {
  if (process.platform !== "win32") return;
  const vscodeCli = process.env.AAAAT_VSCODE_CLI;
  const vscodeCliScript = process.env.AAAAT_VSCODE_CLI_SCRIPT;
  if (process.env.GITHUB_ACTIONS === "true") {
    expect(vscodeCli).toBeTruthy();
    expect(vscodeCliScript).toBeTruthy();
  }
  if (!vscodeCli || !vscodeCliScript) return;

  const userData = path.join(root, "vscode-user-data");
  const accepted = spawnSync(
    vscodeCli,
    [
      vscodeCliScript,
      "--user-data-dir",
      userData,
      "--add-mcp",
      JSON.stringify({ name: "aaaat", ...server }),
    ],
    {
      encoding: "utf8",
      timeout: 30_000,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    },
  );
  expect(accepted.error).toBeUndefined();
  expect(accepted.status).toBe(0);
}

test("packaged setup proposes, validates live MCP, and configures VS Code without bypassing trust", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-vscode-"));
  const workspace = path.join(root, "workspace");
  const project = path.join(root, "project");
  mkdirSync(workspace);
  mkdirSync(project);
  initializeWorkspaceFixture(workspace);
  const executable = packagedExecutable();

  try {
    const proposed = runSetup(executable, workspace, project, false);
    expect(proposed.error).toBeUndefined();
    expect(proposed.status).toBe(0);
    expect(response(proposed.stdout)).toEqual({ ok: true, host: "vscode", state: "proposed" });
    const manifestText = readFileSync(
      path.join(workspace, "integrations", "vscode-mcp.json"),
      "utf8",
    );
    expect(manifestText).not.toContain(workspace);
    expect(manifestText).not.toContain(project);
    expect(manifestText).not.toContain(executable);

    const activated = runSetup(executable, workspace, project, true);
    expect(activated.error).toBeUndefined();
    expect(activated.status).toBe(0);
    expect(response(activated.stdout)).toEqual({ ok: true, host: "vscode", state: "configured" });
    const config = JSON.parse(
      readFileSync(path.join(project, ".vscode", "mcp.json"), "utf8"),
    ) as { servers: { aaaat: Record<string, unknown> } };
    const expectedServer = expectedServerEntry(executable, workspace);
    expect(config).toEqual({ servers: { aaaat: expectedServer } });

    verifyVsCodeAcceptsServer(root, config.servers.aaaat);

    const repeated = runSetup(executable, workspace, project, true);
    expect(repeated.error).toBeUndefined();
    expect(repeated.status).toBe(0);
    expect(response(repeated.stdout)).toEqual({
      ok: true,
      host: "vscode",
      state: "already-configured",
    });
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
