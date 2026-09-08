import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "linux", "The packaged professional-information journey runs once on Linux");

function packagedExecutable(): string {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, "aaaat");
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

async function startPackagedApp(userData: string, linuxHome: string): Promise<RunningApp> {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const child = spawn(
    packagedExecutable(),
    [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`],
    {
      env: {
        ...process.env,
        GTK_USE_PORTAL: "0",
        HOME: linuxHome,
        XDG_CONFIG_HOME: path.join(linuxHome, ".config"),
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
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
    if (attempt === 99) throw new Error(`Packaged AAAAT did not expose its test endpoint: ${processError}`);
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
  if (running.child.exitCode === null && running.child.signalCode === null) {
    spawnSync("kill", ["-9", String(running.child.pid)], { timeout: 5_000 });
  }
}

function prepareLinuxChooserHome(workspacePath: string): string {
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-professional-home-"));
  const configPath = path.join(homePath, ".config");
  mkdirSync(configPath, { recursive: true });
  const escaped = workspacePath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  writeFileSync(path.join(configPath, "user-dirs.dirs"), `XDG_DOWNLOAD_DIR="${escaped}"\n`, "utf8");
  return homePath;
}

function chooseLinuxDirectory(): void {
  execFileSync(
    "bash",
    [
      "-lc",
      [
        "set -eu",
        "window=''",
        "for attempt in $(seq 1 100); do",
        "  window=$(xdotool search --onlyvisible --name 'Create or select an AAAAT workspace' 2>/dev/null | tail -n 1 || true)",
        "  if [ -n \"$window\" ]; then break; fi",
        "  sleep 0.1",
        "done",
        "test -n \"$window\"",
        "xdotool windowactivate --sync \"$window\"",
        "eval \"$(xdotool getwindowgeometry --shell \"$window\")\"",
        "xdotool mousemove --window \"$window\" $((WIDTH - 70)) $((HEIGHT - 35)) click 1",
      ].join("\n"),
    ],
    { stdio: "inherit" },
  );
}

function resizeLinuxAppWindow(width: number, height: number): { width: number; height: number } {
  const output = execFileSync(
    "bash",
    [
      "-lc",
      [
        "set -eu",
        "window=''",
        "for attempt in $(seq 1 100); do",
        "  window=$(xdotool search --onlyvisible --name '^AAAAT$' 2>/dev/null | tail -n 1 || true)",
        "  if [ -n \"$window\" ]; then break; fi",
        "  sleep 0.1",
        "done",
        "test -n \"$window\"",
        "xdotool windowactivate --sync \"$window\"",
        `xdotool windowsize --sync "$window" ${String(width)} ${String(height)}`,
        "sleep 0.15",
        "eval \"$(xdotool getwindowgeometry --shell \"$window\")\"",
        "printf '%s %s\\n' \"$WIDTH\" \"$HEIGHT\"",
      ].join("\n"),
    ],
    { encoding: "utf8" },
  ).trim();
  const match = output.match(/(\d+)\s+(\d+)$/);
  if (!match) throw new Error(`Could not read packaged AAAAT window geometry: ${output}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function expectNoHorizontalOverflow(page: Page, width: number, height: number, state: string) {
  expect(resizeLinuxAppWindow(width, height)).toEqual({ width, height });
  await page.waitForTimeout(150);
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.innerWidth).toBe(width);
  expect(geometry.innerHeight).toBe(height);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  console.log(
    `[packaged professional information] window=${String(width)}x${String(height)} state=${state} horizontal-overflow=${String(geometry.scrollWidth - geometry.clientWidth)}`,
  );
}

test("packaged Professional information is read-first and compact-task oriented", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-professional-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-professional-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page).toHaveTitle("AAAAT");
    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();

    const primary = running.page.getByRole("navigation", { name: "Primary work areas" });
    await primary.getByRole("button", { name: "Professional information" }).click();
    const workspace = running.page.getByRole("region", { name: "Professional information" });
    await expect(workspace.getByRole("heading", { name: "Professional information", exact: true })).toBeVisible();
    await expect(workspace.getByRole("button", { name: "Add information" })).toBeVisible();
    await expect(running.page.getByText("Canonical profile", { exact: true })).toHaveCount(0);
    await expect(running.page.getByText("Focused variants", { exact: true })).toHaveCount(0);

    const order = await running.page.evaluate(() => {
      const profile = document.querySelector('[aria-label="Professional information"]');
      const career = document.querySelector('[aria-label="Current career context"]');
      if (!profile || !career) return null;
      return Boolean(profile.compareDocumentPosition(career) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(order).toBe(true);

    await expectNoHorizontalOverflow(running.page, 1200, 800, "overview");
    await expectNoHorizontalOverflow(running.page, 720, 600, "overview");

    await workspace.getByRole("button", { name: "Add information" }).click();
    await expect(workspace.getByRole("heading", { name: "Add information" })).toBeVisible();
    await expect(workspace.getByRole("button", { name: "Back to professional information" })).toBeVisible();
    await workspace.getByLabel("Type", { exact: true }).selectOption("skill");
    await workspace.getByLabel("Title", { exact: true }).fill("TypeScript");
    await expectNoHorizontalOverflow(running.page, 720, 600, "item-editor");
    await workspace.getByRole("button", { name: "Add information" }).click();
    await expect(workspace.getByText("TypeScript", { exact: true })).toBeVisible();

    await workspace.getByRole("button", { name: "Create saved variation" }).click();
    await expect(workspace.getByRole("heading", { name: "Saved variations" })).toBeVisible();
    await expect(workspace.getByText(/default professional information/i)).toBeVisible();
    await expect(running.page.getByText("Difference-only", { exact: true })).toHaveCount(0);
    await expect(running.page.getByText("Override title", { exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(running.page, 720, 600, "saved-variations");

    await workspace.getByRole("button", { name: "Back to professional information" }).click();
    await expect(workspace.getByText("TypeScript", { exact: true })).toBeVisible();
    await expect(running.page.getByRole("region", { name: "Current career context" })).toBeVisible();
    console.log("[packaged professional information] compact return=true career-context-reachable=true");
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
