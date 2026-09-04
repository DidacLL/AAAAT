import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "linux", "The packaged sparse-candidature journey runs once on Linux");

function packagedExecutable(): string {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, "aaaat");
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
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-m6-home-"));
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

function resizeLinuxWindow(width: number, height: number): void {
  execFileSync(
    "bash",
    [
      "-lc",
      [
        "set -eu",
        "window=$(xdotool search --onlyvisible --name '^AAAAT$' 2>/dev/null | tail -n 1)",
        "test -n \"$window\"",
        `xdotool windowsize --sync "$window" ${width} ${height}`,
      ].join("\n"),
    ],
    { stdio: "inherit" },
  );
}

async function selectSection(page: Page, name: string): Promise<void> {
  await page.getByRole("tab", { name, exact: true }).click();
  await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
}

test("packaged sparse candidature gains runtime information progressively and survives close/reopen", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-m6-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-m6-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  const visualDirectory = path.resolve("test-results", "m6-visual");
  mkdirSync(visualDirectory, { recursive: true });
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page).toHaveTitle("AAAAT");
    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByRole("heading", { name: "Workspace ready." })).toBeVisible();

    await running.page.getByRole("button", { name: "Candidatures" }).click();
    await running.page.getByRole("button", { name: "New candidature" }).click();
    await expect(running.page.getByRole("tab", { name: "Information" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const addInformation = running.page.locator("details.add-information-panel");
    await addInformation.getByText("+ Add information", { exact: true }).click();
    await addInformation.getByText("+ New field", { exact: true }).click();
    await addInformation.getByLabel("Name").fill("Minimum flight hours");
    await addInformation.getByLabel("Type").selectOption("number");
    await addInformation.getByRole("button", { name: "Create field" }).click();

    await expect(addInformation.getByLabel("Existing field")).toContainText("Minimum flight hours");
    await addInformation.getByRole("spinbutton").fill("1500");
    await addInformation.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      running.page.getByRole("heading", { name: "Minimum flight hours" }),
    ).toBeVisible();

    const fieldManagement = running.page.locator("details.field-management");
    await fieldManagement.getByText("Manage candidature fields", { exact: true }).click();
    await expect(fieldManagement.getByLabel("Field")).toHaveValue(/.+/);
    await fieldManagement.getByLabel("Show in Focus when retained").check();
    await fieldManagement.getByRole("button", { name: "Save behavior" }).click();

    await selectSection(running.page, "Sources");
    const sources = running.page.getByRole("region", { name: "Sources" });
    await sources.getByRole("button", { name: "Add source" }).click();
    const sourceEditor = sources.getByLabel("Add source");
    await sourceEditor.getByLabel("Kind").selectOption("job_posting");
    await sourceEditor.getByLabel("Title").fill("Pilot vacancy");
    await sourceEditor
      .getByLabel("Source material")
      .fill("Regional Air requires at least 1,500 total flight hours.");
    await sourceEditor.getByRole("button", { name: "Add source" }).click();
    await expect(sources.getByText("Pilot vacancy", { exact: true })).toBeVisible();

    await selectSection(running.page, "Focus");
    const focus = running.page.getByRole("region", { name: "Candidature Focus" });
    await expect(focus.getByRole("heading", { name: "Minimum flight hours" })).toBeVisible();
    await expect(focus).toContainText("1500");

    expect(existsSync(path.join(ownedWorkspace, "ai-connection.json"))).toBe(false);
    expect(existsSync(path.join(ownedWorkspace, "integrations", "vscode-mcp.json"))).toBe(false);

    resizeLinuxWindow(1280, 900);
    await running.page.screenshot({
      path: path.join(visualDirectory, "m6-sparse-focus-normal.png"),
      fullPage: true,
    });

    await stopPackagedApp(running);
    running = undefined;

    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page.getByRole("heading", { name: "Workspace ready." })).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();
    const reopenedFocus = running.page.getByRole("region", { name: "Candidature Focus" });
    await expect(
      reopenedFocus.getByRole("heading", { name: "Minimum flight hours" }),
    ).toBeVisible();
    await expect(reopenedFocus).toContainText("1500");

    await selectSection(running.page, "Sources");
    await expect(
      running.page.getByRole("region", { name: "Sources" }).getByText("Pilot vacancy", { exact: true }),
    ).toBeVisible();

    resizeLinuxWindow(900, 700);
    await selectSection(running.page, "Focus");
    await running.page.screenshot({
      path: path.join(visualDirectory, "m6-sparse-focus-small.png"),
      fullPage: true,
    });
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
