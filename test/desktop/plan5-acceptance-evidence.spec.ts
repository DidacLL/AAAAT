import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Locator, type Page } from "@playwright/test";

import { createDemoWorkspace } from "../../src/main/demo-workspace";
import { createOrOpenWorkspace } from "../../src/main/workspace";

test.skip(process.platform !== "win32", "Final acceptance evidence uses the packaged Windows desktop lane.");

const evidenceRoot = path.resolve("plan5-evidence");

function packagedExecutable(): string {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, "aaaat.exe");
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
        reject(new Error("Could not reserve evidence port"));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

interface RunningApp {
  readonly child: ChildProcess;
  readonly browser: Browser;
  readonly page: Page;
}

async function waitForDebugger(
  endpoint: string,
  processExit: () => number | null,
  processError: () => string,
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (processExit() !== null) throw new Error(`Packaged AAAAT exited: ${processError()}`);
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return;
    } catch {
      // Chromium is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Packaged AAAAT did not expose its debugger endpoint: ${processError()}`);
}

async function startPackagedApp(userData: string, appData: string): Promise<RunningApp> {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    APPDATA: appData,
    LOCALAPPDATA: appData,
    USERPROFILE: appData,
  };
  const child = spawn(
    packagedExecutable(),
    [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`],
    { env: environment, stdio: ["ignore", "ignore", "pipe"] },
  );
  let processError = "";
  child.stderr?.on("data", (chunk: Buffer) => { processError += chunk.toString(); });
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
    spawnSync("taskkill", ["/PID", String(running.child.pid), "/T", "/F"], { timeout: 5_000 });
  }
}

async function setWindowBounds(page: Page, width: number, height: number): Promise<void> {
  try {
    const session = await page.context().newCDPSession(page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: { width, height, windowState: "normal" },
    });
    await session.detach();
  } catch {
    await page.evaluate(({ width, height }) => window.resizeTo(width, height), { width, height });
  }
  await page.waitForTimeout(350);
}

async function capture(page: Page, label: string, width: number, height: number): Promise<void> {
  await setWindowBounds(page, width, height);
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    documentScrollWidth: document.documentElement.scrollWidth,
    documentScrollHeight: document.documentElement.scrollHeight,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    visibleText: document.body.innerText.slice(0, 20000),
  }));
  writeFileSync(
    path.join(evidenceRoot, `${label}-${width}x${height}.json`),
    JSON.stringify({ requestedOuter: { width, height }, ...metrics }, null, 2) + "\n",
    "utf8",
  );
  await page.screenshot({
    path: path.join(evidenceRoot, `${label}-${width}x${height}.png`),
    fullPage: false,
  });
}

async function capturePair(page: Page, label: string): Promise<void> {
  await capture(page, label, 720, 600);
  await capture(page, label, 1440, 900);
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
  const appData = mkdtempSync(path.join(tmpdir(), "aaaat-plan5-app-data-"));
  for (const directory of [
    userData,
    path.join(appData, "AAAAT"),
    path.join(appData, "aaaat"),
  ]) {
    rememberWorkspace(directory, workspacePath);
  }
  return appData;
}

function primaryNav(page: Page): Locator {
  return page.getByRole("navigation", { name: "Primary work areas" });
}

test("capture first-run hierarchy", async () => {
  mkdirSync(evidenceRoot, { recursive: true });
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-plan5-first-run-"));
  const userData = path.join(root, "user-data");
  const appData = path.join(root, "app-data");
  mkdirSync(userData);
  mkdirSync(appData);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(userData, appData);
    await expect(running.page.getByRole("heading", { name: "Welcome to AAAAT" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "New workspace" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Open folder" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Open demo" })).toBeVisible();
    await capturePair(running.page, "first-run");
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("capture coherent demo workspace surfaces", async () => {
  mkdirSync(evidenceRoot, { recursive: true });
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-plan5-demo-"));
  const workspacePath = path.join(root, "workspace");
  const userData = path.join(root, "user-data");
  mkdirSync(workspacePath);
  mkdirSync(userData);
  createDemoWorkspace(workspacePath);
  const appData = prepareAppData(userData, workspacePath);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(userData, appData);
    const page = running.page;

    await expect(page.getByRole("region", { name: "Home" })).toBeVisible();
    await capturePair(page, "home");

    const rail = page.getByLabel("Workspace controls");
    const tagSearch = rail.getByRole("searchbox", { name: "Search Tags" });
    await tagSearch.fill("Remote");
    await rail.getByRole("button", { name: "Remote", exact: true }).click();
    await expect(rail.getByRole("article", { name: "Selected Tag" })).toContainText("Remote-friendly opportunity.");
    await capture(page, "tag-visor", 1440, 900);
    await tagSearch.fill("");

    await primaryNav(page).getByRole("button", { name: "Applications", exact: true }).click();
    const applications = page.getByRole("region", { name: "Applications" });
    await expect(applications).toBeVisible();
    await expect(page.getByLabel("Application corpus")).toBeVisible();
    await capturePair(page, "applications-corpus");

    const applicationSearch = applications.getByRole("searchbox");
    await applicationSearch.fill("Northstar");
    await expect(page.getByLabel("Application corpus")).toContainText("Northstar Labs");
    await capture(page, "applications-search", 720, 600);
    await applicationSearch.fill("");

    await page.getByLabel("Application corpus").getByRole("button", { name: "Open saved application" }).first().click();
    const selected = page.getByRole("region", { name: "Application information" });
    await expect(selected).toBeVisible();
    await capturePair(page, "application-selected");
    await selected.getByText("More", { exact: true }).click();
    await expect(selected.getByRole("region", { name: "Application documents" })).toBeVisible();
    await capture(page, "application-more", 1440, 900);

    await selected.getByRole("button", { name: "← Applications" }).click();
    await expect(page.getByLabel("Application corpus")).toBeVisible();
    await page.getByRole("button", { name: "New application" }).click();
    const newApplication = page.getByRole("region", { name: "New application" });
    await expect(newApplication).toBeVisible();
    await capture(page, "new-application-start", 720, 600);

    await newApplication.getByRole("button", { name: /Enter information directly/ }).click();
    await expect(page.getByRole("form", { name: "Application information" })).toBeVisible();
    await capture(page, "new-application-direct", 720, 600);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("region", { name: "New application" })).toBeVisible();

    await page.getByRole("region", { name: "New application" }).getByRole("button", { name: /Retain raw material/ }).click();
    const rawCapture = page.getByRole("region", { name: "Retain raw material" });
    await expect(rawCapture).toBeVisible();
    await capture(page, "new-application-raw", 720, 600);
    await rawCapture.getByLabel("Application raw material").fill(
      "Evidence-only retained offer for a distributed systems engineer. Remote within Spain. TypeScript and PostgreSQL.",
    );
    await rawCapture.getByRole("button", { name: "Retain raw material" }).click();
    const continuation = page.getByRole("region", { name: "Raw material continuation" });
    await expect(continuation).toBeVisible();
    await expect(continuation.getByRole("button", { name: "Use AI to suggest information" })).toBeVisible();
    await expect(continuation.getByRole("button", { name: "Fill information manually" })).toBeVisible();
    await capture(page, "raw-retained-continuation", 720, 600);

    await primaryNav(page).getByRole("button", { name: "My information", exact: true }).click();
    await expect(page.getByRole("region", { name: "My information" })).toBeVisible();
    await capturePair(page, "my-information");

    await primaryNav(page).getByRole("button", { name: "CVs", exact: true }).click();
    const documents = page.getByRole("region", { name: "CV and document work" });
    await expect(documents).toBeVisible();
    await capturePair(page, "documents-collection");
    await documents.getByText(/Continue editing/).click();
    await documents.getByRole("button", { name: /Demo application CV/ }).click();
    await expect(page.getByRole("region", { name: "Working CV" })).toBeVisible();
    await capturePair(page, "working-cv");

    await primaryNav(page).getByRole("button", { name: "Settings", exact: true }).click();
    const settings = page.getByRole("region", { name: "Settings" });
    await expect(settings).toBeVisible();
    await capturePair(page, "settings-workspace");
    await settings.getByRole("button", { name: "AI", exact: true }).click();
    await expect(settings.getByRole("region", { name: "AI settings" })).toBeVisible();
    await capture(page, "settings-ai", 1440, 900);
    await settings.getByRole("button", { name: "Documents", exact: true }).click();
    await capture(page, "settings-documents", 1440, 900);
    await settings.getByRole("button", { name: "Backup", exact: true }).click();
    await capture(page, "settings-backup", 1440, 900);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(appData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("capture meaningful empty workspace states", async () => {
  mkdirSync(evidenceRoot, { recursive: true });
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-plan5-empty-"));
  const workspacePath = path.join(root, "workspace");
  const userData = path.join(root, "user-data");
  mkdirSync(workspacePath);
  mkdirSync(userData);
  createOrOpenWorkspace(workspacePath);
  const appData = prepareAppData(userData, workspacePath);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(userData, appData);
    const page = running.page;
    await expect(page.getByRole("region", { name: "Home" })).toBeVisible();
    await capture(page, "empty-home", 720, 600);
    await primaryNav(page).getByRole("button", { name: "Applications", exact: true }).click();
    await expect(page.getByText("No saved applications yet")).toBeVisible();
    await capture(page, "empty-applications", 720, 600);
    await primaryNav(page).getByRole("button", { name: "My information", exact: true }).click();
    await expect(page.getByRole("region", { name: "My information" })).toBeVisible();
    await capture(page, "empty-my-information", 720, 600);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(appData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
