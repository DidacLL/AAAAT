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
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-sparse-candidature-home-"));
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

async function createWorkspace(running: RunningApp): Promise<void> {
  await running.page.getByRole("button", { name: "Create workspace" }).click();
  chooseLinuxDirectory();
  await expect(running.page.getByRole("heading", { name: "Turn a job offer into application documents." })).toBeVisible();
  await running.page.getByRole("button", { name: "Applications" }).click();
  await expect(running.page.getByRole("region", { name: "Applications" })).toBeVisible();
}

test("packaged no-AI raw capture and manual completion uses the real renderer process", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-capture-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-capture-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  const rawMaterial =
    "Aster Aviation seeks a captain in Madrid. Salary 120000. International routes.";
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await createWorkspace(running);

    const creation = running.page.getByRole("group", { name: "Create candidature" });
    await expect(creation.getByRole("button", { name: "Fill fields directly" })).toBeVisible();
    await expect(creation.getByRole("button", { name: "Paste raw material" })).toBeVisible();

    await creation.getByRole("button", { name: "Paste raw material" }).click();
    await expect(running.page.getByRole("heading", { name: "Paste raw material" })).toBeVisible();
    await running.page.getByLabel("Raw material").fill(rawMaterial);
    expect(await running.page.evaluate(() => window.aaaat.candidatures.list())).toHaveLength(0);
    await running.page.getByRole("button", { name: "Save Source" }).click();

    const saved = running.page.getByRole("region", { name: "Raw candidature saved" });
    await expect(saved).toBeVisible();
    const continuations = saved.getByRole("group", { name: "Continue from saved Source" });
    await expect(continuations.getByRole("button", { name: "Set up AI suggestions" })).toBeEnabled();
    await expect(continuations.getByRole("button", { name: "Fill candidature yourself" })).toBeEnabled();
    await expect(saved).toContainText(rawMaterial);

    await continuations.getByRole("button", { name: "Fill candidature yourself" }).click();
    const manual = running.page.getByRole("region", { name: "Fill candidature yourself" });
    await expect(manual.getByRole("region", { name: "Pasted candidature material" })).toContainText(rawMaterial);
    const fields = manual.getByRole("form", { name: "Candidature information" });
    const roleInput = fields.getByRole("textbox", { name: /Role/ });
    await roleInput.fill("Captain");
    await fields.getByRole("button", { name: "Save details" }).click();

    const corpus = running.page.getByLabel("Application corpus");
    await expect(corpus).toBeVisible();
    const card = corpus.locator(".candidature-corpus-card").first();
    await expect(card).toBeVisible();
    await card.locator("button.candidature-corpus-entry").click();

    const selectedApplication = running.page.getByRole("region", { name: "Application information" });
    await selectedApplication.getByText("More", { exact: true }).click();
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
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
