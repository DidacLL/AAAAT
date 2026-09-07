import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "linux", "The packaged sparse-capture UX proof runs once on Linux");

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
        reject(new Error("Could not reserve a packaged capture port"));
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
    spawnSync("kill", ["-9", String(running.child.pid)], { timeout: 5_000 });
  }
}

function prepareLinuxChooserHome(workspacePath: string): string {
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-capture-home-"));
  const configPath = path.join(homePath, ".config");
  mkdirSync(configPath, { recursive: true });
  const escaped = workspacePath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  writeFileSync(
    path.join(configPath, "user-dirs.dirs"),
    `XDG_DOWNLOAD_DIR="${escaped}"\n`,
    "utf8",
  );
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

function resizePackagedWindow(width: number, height: number): void {
  execFileSync(
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
        `xdotool windowsize --sync \"$window\" ${String(width)} ${String(height)}`,
        "eval \"$(xdotool getwindowgeometry --shell \"$window\")\"",
        `test \"$WIDTH\" -eq ${String(width)}`,
        `test \"$HEIGHT\" -eq ${String(height)}`,
      ].join("\n"),
    ],
    { stdio: "inherit" },
  );
}

async function expectNoHorizontalOverflow(page: Page, width: number, height: number): Promise<void> {
  await page.waitForTimeout(100);
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
    `[capture UX] window=${String(width)}x${String(height)} viewport=${String(geometry.innerWidth)}x${String(geometry.innerHeight)} horizontal-overflow=${String(geometry.scrollWidth - geometry.clientWidth)}`,
  );
}

test("packaged sparse capture retains raw Source material and returns to Focus at normal and minimum size", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-capture-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-capture-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  const rawMaterial = "Recruiter asks whether I can start in October and mentions a Madrid-based role.";
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();

    resizePackagedWindow(1200, 800);
    await running.page.getByRole("button", { name: "New candidature" }).click();
    await expect(
      running.page.getByRole("heading", { name: "Paste or add whatever you have." }),
    ).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Save candidature" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expectNoHorizontalOverflow(running.page, 1200, 800);

    await running.page.getByLabel("What you have").fill(rawMaterial);
    expect(await running.page.evaluate(() => window.aaaat.candidatures.list())).toHaveLength(0);
    await running.page.getByRole("button", { name: "Save candidature" }).click();

    const focus = running.page.getByRole("region", { name: "Candidature Focus" });
    await expect(focus).toBeVisible();
    await expect(focus).toContainText(rawMaterial);
    const retained = await running.page.evaluate(async () => {
      const [record] = await window.aaaat.candidatures.list();
      if (!record) return [];
      return window.aaaat.candidatures.listSources(record.id);
    });
    expect(retained).toHaveLength(1);
    expect(retained[0]).toMatchObject({ sourceText: rawMaterial });

    resizePackagedWindow(720, 600);
    await running.page.getByRole("button", { name: "New candidature" }).click();
    await expect(
      running.page.getByRole("heading", { name: "Paste or add whatever you have." }),
    ).toBeVisible();
    await expect(running.page.getByLabel("What you have")).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Save candidature" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expectNoHorizontalOverflow(running.page, 720, 600);

    await running.page.getByLabel("What you have").fill("Unsaved narrow-window capture");
    running.page.once("dialog", (dialog) => void dialog.accept());
    await running.page.getByRole("button", { name: "Cancel" }).click();
    await expect(focus).toBeVisible();
    await expect(focus).toContainText(rawMaterial);
    await expectNoHorizontalOverflow(running.page, 720, 600);

    expect(existsSync(path.join(ownedWorkspace, "ai-connection.json"))).toBe(false);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});