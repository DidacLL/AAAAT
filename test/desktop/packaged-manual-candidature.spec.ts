import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(
  process.platform !== "linux" && process.platform !== "win32",
  "The packaged no-AI manual journey runs on Linux and Windows",
);

function packagedExecutable(): string {
  return path.resolve(
    "out",
    `AAAAT-${process.platform}-${process.arch}`,
    process.platform === "win32" ? "aaaat.exe" : "aaaat",
  );
}

async function reservePort(): Promise<number> {
  const { createServer } = await import("node:net");
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a packaged acceptance port"));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function waitForDebugger(
  endpoint: string,
  processExit: () => number | null,
  processError: () => string,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processExit() !== null) throw new Error(`Packaged AAAAT exited: ${processError()}`);
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return;
    } catch {
      // Packaged Chromium is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Packaged AAAAT did not expose its test endpoint: ${processError()}`);
}

interface RunningApp {
  readonly child: ChildProcess;
  readonly browser: Browser;
  readonly page: Page;
}

async function startPackagedApp(userData: string, appData: string): Promise<RunningApp> {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const environment = { ...process.env };
  if (process.platform === "linux") {
    environment.GTK_USE_PORTAL = "0";
    environment.HOME = appData;
    environment.XDG_CONFIG_HOME = appData;
  } else if (process.platform === "win32") {
    environment.APPDATA = appData;
    environment.LOCALAPPDATA = appData;
    environment.USERPROFILE = appData;
  }

  const child = spawn(
    packagedExecutable(),
    [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`],
    {
      env: environment,
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let processError = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    processError += chunk.toString();
  });
  await waitForDebugger(endpoint, () => child.exitCode, () => processError);
  const browser = await chromium.connectOverCDP(endpoint);
  const page = browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("Packaged AAAAT opened no renderer page");
  return { child, browser, page };
}

async function stopPackagedApp(running: RunningApp): Promise<void> {
  await running.page.close().catch(() => undefined);
  await running.browser.close().catch(() => undefined);
  if (running.child.exitCode !== null || running.child.signalCode !== null) return;
  running.child.kill();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 5_000);
    running.child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  if (running.child.exitCode === null && running.child.signalCode === null) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(running.child.pid), "/T", "/F"], { timeout: 5_000 });
    } else {
      spawnSync("kill", ["-9", String(running.child.pid)], { timeout: 5_000 });
    }
  }
}

function initializeWorkspaceFixture(rootPath: string): void {
  const database = new DatabaseSync(path.join(rootPath, "workspace.sqlite"));
  const schemaSql = readFileSync(path.resolve("src/main/schema.sql"), "utf8");
  try {
    database.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
    try {
      database.exec(schemaSql);
      database
        .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
        .run("workspace.initialized_at", "2026-09-21T00:00:00.000Z");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }
}

function rememberWorkspace(directory: string, workspacePath: string): void {
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "workspace-settings.json"),
    JSON.stringify({ lastWorkspacePath: workspacePath }, null, 2) + "\n",
    "utf8",
  );
}

function prepareAppData(userData: string, workspacePath: string): string {
  const appData = mkdtempSync(path.join(tmpdir(), "aaaat-capture-app-data-"));
  for (const directory of [
    userData,
    path.join(appData, "AAAAT"),
    path.join(appData, "aaaat"),
  ]) {
    rememberWorkspace(directory, workspacePath);
  }
  return appData;
}

test("packaged no-AI raw capture and manual completion uses the real renderer process", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-capture-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-capture-workspace-"));
  initializeWorkspaceFixture(ownedWorkspace);
  const appData = prepareAppData(isolatedUserData, ownedWorkspace);
  const rawMaterial =
    "Aster Aviation seeks a captain in Madrid. Salary 120000. International routes.";
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, appData);
    await expect(running.page.getByRole("region", { name: "Applications" })).toBeVisible();

    await running.page.getByRole("button", { name: "New application" }).click();
    const manual = running.page.getByRole("region", { name: "New application" });
    await manual.getByLabel("Application notes or offer").fill(rawMaterial);
    expect(await running.page.evaluate(() => window.aaaat.candidatures.list())).toHaveLength(0);

    const fields = manual.getByRole("form", { name: "Application information" });
    await fields.getByLabel("Role", { exact: true }).fill("Captain");
    await expect(fields.getByRole("checkbox", { name: "Parse with AI" })).not.toBeChecked();
    await fields.getByRole("button", { name: "Save application" }).click();

    const corpus = running.page.getByLabel("Application corpus");
    await expect(corpus).toBeVisible();
    const candidatureEntries = corpus.getByRole("button", { name: "Open saved application" });
    await expect(candidatureEntries).toHaveCount(1);
    await candidatureEntries.first().click();

    const selectedApplication = running.page.getByRole("region", { name: "Application information" });
    await selectedApplication.getByText("More", { exact: true }).click();

    const sources = selectedApplication.getByRole("region", { name: "Sources" });
    await expect(sources).toContainText(rawMaterial);
    await sources.getByRole("button", { name: "Read source" }).click();
    await expect(sources.getByRole("article", { name: "Source content" })).toContainText(rawMaterial);

    const roleBlock = selectedApplication.getByRole("article", { name: "Role information" });
    await expect(roleBlock).toContainText("Captain");
    await roleBlock.getByRole("button", { name: "Edit Role", exact: true }).click();
    await roleBlock.getByLabel("Value").fill("Senior Captain");
    await roleBlock.getByRole("button", { name: "Save", exact: true }).click();
    await expect(roleBlock).toContainText("Senior Captain");

    expect(existsSync(path.join(ownedWorkspace, "ai-connection.json"))).toBe(false);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(appData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
