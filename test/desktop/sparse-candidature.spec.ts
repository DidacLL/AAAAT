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
        `xdotool windowactivate --sync "$window"`,
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

async function expectNoHorizontalOverflow(page: Page, width: number, height: number): Promise<void> {
  const actual = resizeLinuxAppWindow(width, height);
  expect(actual).toEqual({ width, height });
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
}

async function selectSection(page: Page, name: string): Promise<void> {
  const tab = page.getByRole("tab", { name, exact: true });
  if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

test("packaged sparse candidature accepts a runtime field and survives close/reopen", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-sparse-candidature-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-sparse-candidature-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page).toHaveTitle("AAAAT");
    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();

    const created = await running.page.evaluate(async () => {
      const candidature = await window.aaaat.candidatures.create({ values: [] });
      const field = await window.aaaat.candidatures.createField({
        label: "Minimum flight hours",
        description: "Minimum total flight hours requested by the opportunity.",
        valueType: "number",
        cardinality: "one",
        choices: [],
        enabled: true,
      });
      await window.aaaat.candidatures.setFieldValue({
        candidatureId: candidature.id,
        fieldId: field.definition.id,
        value: 1500,
      });
      await window.aaaat.candidatures.updateFieldPreferences({
        ...field.preferences,
        focusVisible: true,
        focusOrder: 0,
      });
      await window.aaaat.candidatures.addSource({
        candidatureId: candidature.id,
        kind: "job_posting",
        title: "Pilot vacancy",
        url: "https://example.invalid/pilot",
        sourceText: "Regional Air requires at least 1,500 total flight hours.",
      });
      const records = await window.aaaat.candidatures.list();
      const sources = await window.aaaat.candidatures.listSources(candidature.id);
      return {
        candidatureId: candidature.id,
        fieldId: field.definition.id,
        values: records.find((record) => record.id === candidature.id)?.values ?? [],
        sourceTitles: sources.map((source) => source.title),
      };
    });

    expect(created.values).toEqual([
      expect.objectContaining({ fieldId: created.fieldId, value: 1500 }),
    ]);
    expect(created.sourceTitles).toEqual(["Pilot vacancy"]);
    expect(existsSync(path.join(ownedWorkspace, "ai-connection.json"))).toBe(false);
    expect(existsSync(path.join(ownedWorkspace, "integrations", "vscode-mcp.json"))).toBe(false);

    await stopPackagedApp(running);
    running = undefined;

    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();

    const focus = running.page.getByRole("region", { name: "Candidature Focus" });
    await expect(focus.getByRole("heading", { name: "Minimum flight hours" })).toBeVisible();
    await expect(focus).toContainText("1500");

    await selectSection(running.page, "Sources");
    const sources = running.page.getByRole("region", { name: "Sources" });
    await expect(sources.getByText("Pilot vacancy", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(running.page, 1200, 800);

    await sources.getByRole("button", { name: "Read source" }).click();
    const sourceReader = sources.getByRole("article", { name: "Source content" });
    await expect(sourceReader).toContainText("Regional Air requires at least 1,500 total flight hours.");
    await expect(sourceReader.getByText("https://example.invalid/pilot", { exact: true })).toBeVisible();
    await expect(sources.getByRole("textbox", { name: "Source material" })).toHaveCount(0);
    await expectNoHorizontalOverflow(running.page, 1200, 800);
    await expectNoHorizontalOverflow(running.page, 720, 600);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("packaged first-use candidature loop remains information-first at normal and 720x600 sizes", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-capture-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-capture-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  const rawMaterial =
    "Recruiter asks whether I can start in October and mentions a Madrid-based role.";
  const secondMaterial =
    "Nimbus Labs is hiring a platform engineer in Barcelona with hybrid work.";
  const secondTitle = "Nimbus platform role";
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);

    await expectNoHorizontalOverflow(running.page, 720, 600);
    await expect(running.page.getByRole("button", { name: "Create workspace" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Open existing workspace" })).toBeVisible();
    await expect(running.page.getByText("Restore a backup", { exact: true })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Choose backup to restore" })).toBeHidden();

    await expectNoHorizontalOverflow(running.page, 1200, 800);
    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();

    await running.page.getByTestId("new-candidature-capture").click();
    await expect(
      running.page.getByRole("heading", { name: "Paste or add whatever you have." }),
    ).toBeVisible();
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

    await selectSection(running.page, "Information");
    const information = running.page.getByRole("region", { name: "Candidature information" });
    await information.getByText("+ Add information", { exact: true }).click();
    await information.getByText("+ Add something not listed", { exact: true }).click();
    await information.getByLabel("What is it?").fill("Availability");
    await information.getByRole("button", { name: "Continue", exact: true }).click();
    const addInformation = information.locator(".add-information-panel");
    const newValue = addInformation.locator(".candidature-value-editor input[type='text']");
    await expect(newValue).toBeVisible();
    await newValue.fill("October or November");
    await addInformation.getByRole("button", { name: "Save", exact: true }).click();
    await expect(information.getByRole("heading", { name: "Availability" })).toBeVisible();

    await running.page.getByTestId("new-candidature-capture").click();
    await running.page.getByLabel(/Short title/).fill(secondTitle);
    await running.page.getByLabel("What you have").fill(secondMaterial);
    await running.page.getByRole("button", { name: "Save candidature" }).click();

    const collection = running.page.getByLabel("Candidature list");
    await expect(collection.locator(":scope > button")).toHaveCount(2);
    const firstCandidature = collection.locator(":scope > button").filter({ hasText: "Availability" });
    await expect(firstCandidature).toContainText("October or November");
    const secondCandidature = collection.locator(":scope > button").filter({ hasText: secondTitle });
    await expect(secondCandidature).toContainText("Source");
    await expect(secondCandidature).toContainText(secondMaterial);

    await firstCandidature.click();
    await selectSection(running.page, "Information");
    await expect(information.getByRole("heading", { name: "Availability" })).toBeVisible();
    await expectNoHorizontalOverflow(running.page, 720, 600);

    const availability = information.locator(".retained-information-card").filter({ hasText: "Availability" });
    await expect(availability).toContainText("October or November");
    await expect(availability.locator("input[type='text']")).toHaveCount(0);
    await availability.getByRole("button", { name: "Edit", exact: true }).click();
    const availabilityInput = availability.locator("input[type='text']");
    await expect(availabilityInput).toBeVisible();
    await availabilityInput.fill("October through December");
    await availability.getByRole("button", { name: "Save", exact: true }).click();
    await expect(availability.locator("input[type='text']")).toHaveCount(0);
    await expect(availability).toContainText("October through December");
    await expectNoHorizontalOverflow(running.page, 720, 600);

    await selectSection(running.page, "Focus");
    await expect(focus).toContainText(rawMaterial);
    await running.page.getByTestId("new-candidature-capture").click();
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
    expect(existsSync(path.join(ownedWorkspace, "ai-connection.json"))).toBe(false);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
