import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "win32", "The packaged window-bounds journey is Windows owner-candidate evidence");

function packagedExecutable(): string {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, "aaaat.exe");
}

async function reservePort(): Promise<number> {
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

interface RunningApp {
  readonly child: ChildProcess;
  readonly browser: Browser;
  readonly page: Page;
}

async function startPackagedApp(userData: string): Promise<RunningApp> {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const child = spawn(
    packagedExecutable(),
    [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let processError = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    processError += chunk.toString();
  });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Packaged AAAAT exited: ${processError}`);
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) break;
    } catch {
      // Packaged Chromium is still starting.
    }
    if (attempt === 99) {
      throw new Error(`Packaged AAAAT did not expose its test endpoint: ${processError}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

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
  if (running.child.exitCode === null && running.child.signalCode === null && running.child.pid) {
    spawnSync("taskkill", ["/PID", String(running.child.pid), "/T", "/F"], { timeout: 5_000 });
  }
}

test("packaged Windows app does not enforce the old 720x600 product minimum", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-window-bounds-user-"));
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData);
    await expect(running.page).toHaveTitle("AAAAT");

    const session = await running.page.context().newCDPSession(running.page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: { width: 640, height: 520 },
    });
    const { bounds } = await session.send("Browser.getWindowBounds", { windowId });

    expect(bounds.width).toBeLessThan(720);
    expect(bounds.height).toBeLessThan(600);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
