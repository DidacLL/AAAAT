import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "linux", "M6 manual visual acceptance runs once on the Linux packaged app");

function packagedExecutable(): string {
  const packageRoot = path.resolve("out", `AAAAT-${process.platform}-${process.arch}`);
  return path.join(packageRoot, "aaaat");
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
  await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true");
}

async function fillTextarea(page: Page, label: RegExp | string, value: string): Promise<void> {
  const field = page.getByLabel(label, { exact: typeof label === "string" });
  await field.fill(value);
}

test("packaged M6 manual journey is recruiter-ready and survives close/reopen", async () => {
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

    // Current reusable career context is manual, workspace-owned, and independent from Profile evidence.
    await running.page.getByRole("button", { name: "Profile" }).click();
    await expect(running.page.getByRole("heading", { name: "Current career context" })).toBeVisible();
    await running.page.getByRole("button", { name: "Add career context" }).click();
    await fillTextarea(running.page, /^Career direction/, "Move toward staff-level platform work.");
    await fillTextarea(running.page, /^Constraints/, "No relocation.");
    await fillTextarea(running.page, /^Target roles/, "Staff or senior platform engineering roles.");
    await fillTextarea(running.page, /^Target markets \/ locations/, "Spain / EU remote or hybrid.");
    await running.page.getByRole("button", { name: "Save career context" }).click();
    await expect(running.page.getByText("Move toward staff-level platform work.")).toBeVisible();

    // Capture an incomplete opportunity first, then enrich only what becomes known.
    await running.page.getByRole("button", { name: "Candidatures" }).click();
    await running.page.getByRole("button", { name: "New candidature" }).click();
    await expect(running.page.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");
    await expect(running.page.getByRole("button", { name: "Add pitch" })).toBeVisible();

    await selectSection(running.page, "Sources");
    await running.page.getByRole("button", { name: "Add source" }).click();
    await running.page.getByLabel("Kind").selectOption("recruiter_message");
    await running.page.getByLabel("Title").fill("Recruiter message");
    await running.page
      .getByLabel("Source material")
      .fill("Example Systems is looking for a Senior Platform Engineer. Interested in a recruiter call?");
    await running.page.getByRole("button", { name: "Add source" }).click();
    await expect(running.page.getByText("Recruiter message", { exact: true })).toBeVisible();

    await selectSection(running.page, "Opportunity");
    const opportunity = running.page.getByRole("form", { name: "Opportunity" });
    await opportunity.getByLabel("Company").fill("Example Systems");
    await opportunity.getByLabel("Role").fill("Senior Platform Engineer");
    await opportunity.getByLabel("Location").fill("Spain / EU");
    await opportunity.getByLabel("Work mode").fill("Remote or hybrid");
    await opportunity.getByLabel("Status").selectOption("saved");
    await opportunity.getByLabel("Priority").selectOption("high");
    await opportunity.getByLabel("Next action").fill("Prepare for recruiter call");
    await opportunity.getByLabel("Next action date").fill("2026-09-11");
    await opportunity.getByLabel("Notes").fill("Clarify platform ownership and team scope.");
    await opportunity.getByRole("button", { name: "Save opportunity" }).click();

    await selectSection(running.page, "Sources");
    await running.page.getByRole("button", { name: "Add source" }).click();
    await running.page.getByLabel("Kind").selectOption("job_posting");
    await running.page.getByLabel("Title").fill("Job description");
    await running.page
      .getByLabel("Source material")
      .fill("Own internal platform reliability, distributed systems, developer experience, and cross-team technical direction.");
    await running.page.getByRole("button", { name: "Add source" }).click();
    await expect(running.page.getByText("Job description", { exact: true })).toBeVisible();

    await selectSection(running.page, "Evaluation & strategy");
    await running.page.getByLabel("Fit / suitability").fill("Strong fit for platform scope and backend systems ownership.");
    await running.page.getByLabel("Strengths / evidence").fill("Led multi-region backend migrations and improved platform reliability.");
    await running.page.getByLabel("Gaps / risks / constraints").fill("Confirm on-call expectations and remote boundaries.");
    await running.page.getByLabel("Current strategy").fill("Lead with reliability, platform leverage, and cross-team technical leadership.");
    await running.page.getByLabel("Company / role context").fill("The role owns an internal platform used by multiple product teams.");
    await running.page.getByRole("button", { name: "Save evaluation & strategy" }).click();

    await selectSection(running.page, "Recruiter preparation");
    await running.page
      .getByLabel("Pitch")
      .fill("I build reliable platform systems that let product teams move faster without trading away safety.");
    await running.page.getByLabel("Questions to ask").fill("How is platform impact measured, and how broad is the ownership scope?");
    await running.page
      .getByLabel("Recruiter-call preparation")
      .fill("Keep compensation discussion high-level; confirm remote expectations and reporting line.");
    await running.page.getByRole("button", { name: "Save recruiter preparation" }).click();

    await selectSection(running.page, "Focus");
    const focus = running.page.getByRole("region", { name: "Recruiter call focus" });
    await expect(focus.getByRole("heading", { name: /Example Systems — Senior Platform Engineer/ })).toBeVisible();
    await expect(focus).toContainText("saved · high priority");
    await expect(focus).toContainText("Prepare for recruiter call");
    await expect(focus).toContainText("I build reliable platform systems");
    await expect(focus).toContainText("Led multi-region backend migrations");
    await expect(focus).toContainText("Confirm on-call expectations");
    await expect(focus).toContainText("No relocation");
    await expect(focus).toContainText("How is platform impact measured");
    await expect(focus).toContainText("Lead with reliability");
    await expect(focus).toContainText("internal platform used by multiple product teams");
    await expect(focus).toContainText("Clarify platform ownership and team scope");

    // The core path never needs an AI connection or external-agent state.
    expect(existsSync(path.join(ownedWorkspace, "ai-connection.json"))).toBe(false);
    expect(existsSync(path.join(ownedWorkspace, "integrations", "vscode-mcp.json"))).toBe(false);

    resizeLinuxWindow(1280, 900);
    await running.page.screenshot({
      path: path.join(visualDirectory, "m6-focus-normal.png"),
      fullPage: true,
    });

    await stopPackagedApp(running);
    running = undefined;

    // Reopen the same user-owned workspace and verify the authoritative state is still understandable.
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page.getByRole("heading", { name: "Workspace ready." })).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();
    const reopenedFocus = running.page.getByRole("region", { name: "Recruiter call focus" });
    await expect(reopenedFocus.getByRole("heading", { name: /Example Systems — Senior Platform Engineer/ })).toBeVisible();
    await expect(reopenedFocus).toContainText("I build reliable platform systems");
    await expect(reopenedFocus).toContainText("No relocation");
    await expect(reopenedFocus).toContainText("Spain / EU remote or hybrid");
    await expect(reopenedFocus).toContainText("Prepare for recruiter call");

    resizeLinuxWindow(900, 700);
    await running.page.screenshot({
      path: path.join(visualDirectory, "m6-focus-small.png"),
      fullPage: true,
    });

    expect(readdirSync(visualDirectory).sort()).toEqual([
      "m6-focus-normal.png",
      "m6-focus-small.png",
    ]);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
