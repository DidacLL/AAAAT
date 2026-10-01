import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

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
  await page.waitForTimeout(400);
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

test("capture packaged first-run hierarchy at constrained and expanded sizes", async () => {
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

    await capture(running.page, "first-run", 720, 600);
    await capture(running.page, "first-run", 1440, 900);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
