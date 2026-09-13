import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  chromium,
  expect,
  test,
  type Browser,
  type Page,
} from "@playwright/test";

function packagedExecutable(): string {
  const packageRoot = path.resolve("out", "AAAAT-" + process.platform + "-" + process.arch);
  if (process.platform === "darwin") {
    const bundle = readdirSync(packageRoot).find((entry) => entry.endsWith(".app"));
    if (!bundle) throw new Error("Packaged macOS application bundle is missing");
    const executableDirectory = path.join(packageRoot, bundle, "Contents", "MacOS");
    const executable = readdirSync(executableDirectory)[0];
    if (!executable) throw new Error("Packaged macOS executable is missing");
    return path.join(executableDirectory, executable);
  }
  return path.join(packageRoot, process.platform === "win32" ? "aaaat.exe" : "aaaat");
}

async function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a smoke-test port"));
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
    if (processExit() !== null) {
      throw new Error("Packaged application exited before startup: " + processError());
    }
    try {
      const response = await fetch(endpoint + "/json/version");
      if (response.ok) return;
    } catch {
      // The packaged process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const error = processError().trim();
  throw new Error(
    "Packaged application did not expose its test endpoint" + (error ? ":\n" + error : ""),
  );
}

function processHasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

async function waitForProcessExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (processHasExited(child)) return;
  await new Promise<void>((resolve, reject) => {
    const onExit = () => {
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(() => {
      child.off("exit", onExit);
      reject(new Error(`Packaged application process ${child.pid ?? "unknown"} did not exit`));
    }, timeoutMs);
    child.once("exit", onExit);
  });
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (processHasExited(child)) return;

  let terminationError = "";
  if (process.platform === "win32") {
    if (!child.pid) throw new Error("Packaged Windows application has no process ID");
    const result = spawnSync(
      "taskkill.exe",
      ["/PID", String(child.pid), "/T", "/F"],
      {
        encoding: "utf8",
        timeout: 5_000,
        windowsHide: true,
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      terminationError = (result.stderr || result.stdout || "taskkill failed").trim();
    }
  } else if (!child.kill()) {
    terminationError = "could not signal packaged application process";
  }

  try {
    await waitForProcessExit(child, 5_000);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(terminationError ? `${detail}: ${terminationError}` : detail, { cause: error });
  }
}

interface RunningApp {
  readonly child: ChildProcess;
  readonly browser: Browser;
  readonly page: Page;
}

interface LinuxDocumentTools {
  readonly rootPath: string;
  readonly openLogPath: string;
}

async function startPackagedApp(
  userData: string,
  linuxHome?: string,
  linuxDocumentTools?: LinuxDocumentTools,
): Promise<RunningApp> {
  const port = await reservePort();
  const endpoint = "http://127.0.0.1:" + port;
  const child = spawn(
    packagedExecutable(),
    ["--user-data-dir=" + userData, "--remote-debugging-port=" + port],
    {
      env:
        process.platform === "linux"
          ? {
              ...process.env,
              GTK_USE_PORTAL: "0",
              ...(linuxHome
                ? { HOME: linuxHome, XDG_CONFIG_HOME: path.join(linuxHome, ".config") }
                : {}),
              ...(linuxDocumentTools
                ? {
                    PATH: `${linuxDocumentTools.rootPath}${path.delimiter}${process.env.PATH ?? ""}`,
                    AAAAT_TEST_OUTPUT_OPEN_LOG: linuxDocumentTools.openLogPath,
                  }
                : {}),
            }
          : process.env,
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    },
  );
  let processError = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    processError += chunk.toString();
  });
  await waitForDebugger(endpoint, () => child.exitCode, () => processError);
  const browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  const page = context?.pages()[0];
  if (!page) {
    await browser.close();
    await stopProcess(child);
    throw new Error("Packaged application opened no renderer page");
  }
  return { child, browser, page };
}

async function stopPackagedApp(app: RunningApp): Promise<void> {
  await app.page.close().catch(() => undefined);
  await app.browser.close().catch(() => undefined);
  await stopProcess(app.child);
}

function prepareLinuxChooserHome(workspacePath: string): string {
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-home-"));
  const configPath = path.join(homePath, ".config");
  mkdirSync(configPath, { recursive: true });
  const escapedWorkspacePath = workspacePath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  writeFileSync(
    path.join(configPath, "user-dirs.dirs"),
    `XDG_DOWNLOAD_DIR="${escapedWorkspacePath}"\n`,
    "utf8",
  );
  return homePath;
}

function prepareLinuxDocumentTools(): LinuxDocumentTools {
  const rootPath = mkdtempSync(path.join(tmpdir(), "aaaat-document-tools-"));
  const openLogPath = path.join(rootPath, "opened-output.log");
  writeFileSync(
    path.join(rootPath, "latexmk"),
    [
      "#!/bin/sh",
      "set -eu",
      "mkdir -p build",
      "printf '%s\\n' '%PDF-1.4' '%%EOF' > build/main.pdf",
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o755 },
  );
  writeFileSync(
    path.join(rootPath, "xdg-open"),
    [
      "#!/bin/sh",
      "set -eu",
      "printf '%s\\n' \"$1\" >> \"$AAAAT_TEST_OUTPUT_OPEN_LOG\"",
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o755 },
  );
  return { rootPath, openLogPath };
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

async function proveAcceptedShellAtWindowSize(
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  const actual = resizeLinuxAppWindow(width, height);
  expect(actual).toEqual({ width, height });
  await page.waitForTimeout(150);

  const primary = page.getByRole("navigation", { name: "Primary work areas" });
  await expect(primary).toBeVisible();
  await expect(primary.getByRole("button", { name: "Candidatures" })).toBeVisible();
  await expect(primary.getByRole("button", { name: "CVs & letters" })).toBeVisible();
  await expect(primary.getByRole("button", { name: "Professional information" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch workspace" })).toBeVisible();

  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);

  console.log(
    `[packaged UX] window=${String(actual.width)}x${String(actual.height)} viewport=${String(geometry.innerWidth)}x${String(geometry.innerHeight)} horizontal-overflow=${String(geometry.scrollWidth - geometry.clientWidth)}`,
  );
}

async function proveCandidatureFlowAtWindowSize(
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  await proveAcceptedShellAtWindowSize(page, width, height);

  await expect(page.getByRole("heading", { name: "Candidatures" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search candidatures" });
  const show = page.getByLabel("Show");
  const corpus = page.locator('[aria-label="Candidature corpus Focus"]');
  await expect(search).toBeVisible();
  await expect(show).toBeVisible();
  await expect(corpus).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Candidature sections" })).toHaveCount(0);

  await search.fill("packaged smoke");
  await show.selectOption("all");
  const focusEntry = corpus.getByRole("button", { name: /packaged smoke/i }).first();
  await expect(focusEntry).toBeVisible();
  await focusEntry.click();

  const selected = page.getByRole("region", { name: "Candidature Focus" });
  await expect(selected).toBeVisible();
  await expect(selected.getByRole("button", { name: "Back to candidatures" })).toBeVisible();
  await expect(selected.getByRole("button", { name: "Edit full candidature" })).toBeVisible();
  await expect(selected.getByRole("region", { name: "Selected candidature Focus" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Sources" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Application material" })).toHaveCount(0);
  await expect(page.getByText("Activity", { selector: "summary" })).toHaveCount(0);
  await expect(page.getByText(/Concept/i)).toHaveCount(0);

  await selected.getByRole("button", { name: "Back to candidatures" }).click();
  await expect(search).toHaveValue("packaged smoke");
  await expect(show).toHaveValue("all");
  await expect(corpus).toBeVisible();

  await page.getByRole("button", { name: "Edit candidature" }).click();
  const complete = page.getByRole("region", { name: "Complete candidature" });
  await expect(complete).toBeVisible();
  await expect(complete.getByRole("region", { name: "Candidature information" })).toBeVisible();
  await expect(complete.getByRole("region", { name: "Sources" })).toBeVisible();
  await expect(complete.getByRole("region", { name: "Tags" })).toBeVisible();
  await expect(complete.getByRole("region", { name: "Application material" })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Candidature sections" })).toHaveCount(0);
  await expect(page.getByText(/Concept/i)).toHaveCount(0);
  await complete.getByRole("button", { name: "Back to candidatures" }).click();

  await expect(search).toHaveValue("packaged smoke");
  await expect(show).toHaveValue("all");
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  console.log(
    `[packaged candidature] window=${String(width)}x${String(height)} corpus-focus=true selected-focus=true direct-complete-edit=true state-preserved=true horizontal-overflow=${String(geometry.scrollWidth - geometry.clientWidth)}`,
  );
}

function packagedDocumentId(workspacePath: string): string {
  const database = new DatabaseSync(path.join(workspacePath, "workspace.sqlite"), { readOnly: true });
  try {
    const row = database
      .prepare("SELECT id FROM documents WHERE title = ?")
      .get("Packaged CV") as { id: string } | undefined;
    if (!row) throw new Error("Packaged document was not persisted");
    return row.id;
  } finally {
    database.close();
  }
}

async function expectLastOpenedOutput(openLogPath: string, expectedOutputPath: string): Promise<void> {
  await expect
    .poll(() => {
      if (!existsSync(openLogPath)) return "";
      return readFileSync(openLogPath, "utf8").trim().split(/\r?\n/).at(-1) ?? "";
    })
    .toBe(expectedOutputPath);
}

async function proveDocumentWorkspace(
  page: Page,
  workspacePath: string,
  openLogPath: string,
): Promise<void> {
  const primary = page.getByRole("navigation", { name: "Primary work areas" });
  await primary.getByRole("button", { name: "CVs & letters" }).click();

  await proveAcceptedShellAtWindowSize(page, 720, 600);
  const workspace = page.getByRole("region", { name: "CVs & letters" });
  const collection = workspace.locator(".documents-sidebar");
  const local = page.getByRole("tablist", { name: "Document work" });
  await expect(collection).toBeVisible();
  await expect(local).not.toBeVisible();
  await expect(collection.getByRole("heading", { name: "CVs & letters" })).toBeVisible();
  await expect(collection.getByLabel("Professional information")).toBeVisible();
  await expect(page.getByText("Canonical profile", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Profile basis", { exact: true })).toHaveCount(0);

  await collection.getByLabel("Title").fill("Packaged CV");
  await collection.getByRole("button", { name: "Create CV" }).click();
  await expect(page.getByRole("button", { name: "Back to CVs & letters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Packaged CV" })).toBeVisible();
  await expect(local).toBeVisible();
  await expect(local.getByRole("tab")).toHaveCount(3);
  await expect(local.getByRole("tab", { name: "Content" })).toBeVisible();
  await expect(local.getByRole("tab", { name: "Professional information" })).toBeVisible();
  await expect(local.getByRole("tab", { name: "Output" })).toBeVisible();

  const content = page.getByRole("tabpanel", { name: "Document content" });
  await content.getByLabel("Language").fill("en");
  await content.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Document changes saved.")).toBeVisible();

  const localGeometry = await local.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  const pageGeometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(localGeometry.scrollWidth).toBeLessThanOrEqual(localGeometry.clientWidth);
  expect(pageGeometry.scrollWidth).toBeLessThanOrEqual(pageGeometry.clientWidth);
  console.log(
    `[packaged documents] window=720x600 state=selected local-nav-overflow=${String(localGeometry.scrollWidth - localGeometry.clientWidth)} horizontal-overflow=${String(pageGeometry.scrollWidth - pageGeometry.clientWidth)}`,
  );

  await local.getByRole("tab", { name: "Professional information" }).click();
  await expect(page.getByRole("tabpanel", { name: "Professional information in this document" })).toBeVisible();
  await local.getByRole("tab", { name: "Output" }).click();
  await expect(page.getByRole("tabpanel", { name: "Document output" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rendered PDF result" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Render PDF" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI-visible CV description" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Retained application artifacts" })).toHaveCount(0);

  const documentId = packagedDocumentId(workspacePath);
  const expectedOutputPath = path.join(workspacePath, "documents", documentId, "build", "main.pdf");
  await expect(page.getByText(expectedOutputPath)).not.toBeVisible();
  await page.getByRole("button", { name: "Render PDF" }).click();
  await expect(page.getByText("PDF rendered successfully. Open the result below.")).toBeVisible();
  expect(existsSync(expectedOutputPath)).toBe(true);
  await page.getByRole("button", { name: "Open PDF" }).click();
  await expectLastOpenedOutput(openLogPath, expectedOutputPath);
  console.log("[packaged documents] window=720x600 create-edit-render-open=true");

  await local.getByRole("tab", { name: "Content" }).click();
  await expect(content).toBeVisible();
  await page.getByRole("button", { name: "Back to CVs & letters" }).click();
  await expect(collection).toBeVisible();
  await expect(local).not.toBeVisible();
  console.log("[packaged documents] window=720x600 state=collection return=true");

  await proveAcceptedShellAtWindowSize(page, 1200, 800);
  await expect(collection).toBeVisible();
  await expect(local).toBeVisible();
  await expect(page.getByRole("heading", { name: "Packaged CV" })).toBeVisible();
  await local.getByRole("tab", { name: "Output" }).click();
  await expect(page.getByRole("button", { name: "Open PDF" })).toBeVisible();
  await page.getByRole("button", { name: "Open PDF" }).click();
  await expectLastOpenedOutput(openLogPath, expectedOutputPath);
  const wideGeometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(wideGeometry.scrollWidth).toBeLessThanOrEqual(wideGeometry.clientWidth);
  console.log(
    `[packaged documents] window=1200x800 result-access=true horizontal-overflow=${String(wideGeometry.scrollWidth - wideGeometry.clientWidth)}`,
  );
}

test("packaged external command rejects unsupported authority without opening desktop", () => {
  const uninitializedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-command-smoke-"));
  try {
    const result = spawnSync(
      packagedExecutable(),
      ["--external-command", "candidature.update", "--workspace", uninitializedWorkspace],
      {
        input: "{}",
        encoding: "utf8",
        timeout: 5_000,
        windowsHide: true,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(result.stdout.trim()).toBe('{"ok":false,"error":"unsupported-capability"}');
    expect(existsSync(path.join(uninitializedWorkspace, "workspace.sqlite"))).toBe(false);
  } finally {
    rmSync(uninitializedWorkspace, { recursive: true, force: true });
  }
});

test("packaged desktop preserves security gates and required bounded capabilities", async () => {
  const executablePath = packagedExecutable();
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-owned-"));
  const linuxHome = process.platform === "linux" ? prepareLinuxChooserHome(ownedWorkspace) : undefined;
  const linuxDocumentTools = process.platform === "linux" ? prepareLinuxDocumentTools() : undefined;
  expect(existsSync(executablePath)).toBe(true);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome, linuxDocumentTools);
    await expect(running.page).toHaveTitle("AAAAT");
    await expect(
      running.page.getByRole("heading", {
        name: "Choose where AAAAT should keep your career workspace.",
      }),
    ).toBeVisible();
    await expect(running.page.getByText(/workspace data stays local/i)).toBeVisible();
    await expect(running.page.getByText(/works without AI/i)).toBeVisible();

    const boundary = await running.page.evaluate(() => ({
      processType: typeof Reflect.get(window, "process"),
      requireType: typeof Reflect.get(window, "require"),
      systemInfo: typeof window.aaaat.system.info,
      workspaceCurrent: typeof window.aaaat.workspace.current,
      workspaceChoose: typeof window.aaaat.workspace.choose,
      profileCurrent: typeof window.aaaat.profile.current,
      documentList: typeof window.aaaat.documents.list,
      documentRender: typeof window.aaaat.documents.render,
      documentOutputOpen: typeof window.aaaat.documentOutput.open,
      candidatureList: typeof window.aaaat.candidatures.list,
      candidatureCreate: typeof window.aaaat.candidatures.create,
      candidatureFilter: typeof window.aaaat.candidatures.filter,
      candidatureFieldList: typeof window.aaaat.candidatures.listFields,
      candidatureFieldCreate: typeof window.aaaat.candidatures.createField,
      candidatureFieldSet: typeof window.aaaat.candidatures.setFieldValue,
      candidatureSources: typeof window.aaaat.candidatures.listSources,
      candidatureDocuments: typeof window.aaaat.candidatures.setDocuments,
      candidatureTags: typeof window.aaaat.candidatures.setTags,
      aiConnection: typeof window.aaaat.ai.connection,
      aiExtract: typeof window.aaaat.ai.extractJob,
      aiDiscoverField: typeof window.aaaat.ai.discoverField,
    }));

    expect(boundary.processType).toBe("undefined");
    expect(boundary.requireType).toBe("undefined");
    for (const [name, value] of Object.entries(boundary)) {
      if (name === "processType" || name === "requireType") continue;
      expect(value, `${name} should be available through the bounded preload API`).toBe("function");
    }

    const csp = await running.page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("ws://localhost:");

    if (process.platform !== "linux") return;

    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();

    await proveAcceptedShellAtWindowSize(running.page, 1200, 800);
    await proveAcceptedShellAtWindowSize(running.page, 720, 600);

    const primary = running.page.getByRole("navigation", { name: "Primary work areas" });
    await expect(primary.getByRole("button", { name: "Candidatures" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(running.page.getByRole("button", { name: "ToDos" })).toHaveCount(0);
    await expect(running.page.getByRole("button", { name: "AI assist" })).toHaveCount(0);
    await expect(running.page.getByRole("button", { name: "Profile" })).toHaveCount(0);
    await expect(running.page.getByRole("button", { name: "Documents" })).toHaveCount(0);

    const databasePath = path.join(ownedWorkspace, "workspace.sqlite");
    expect(existsSync(databasePath)).toBe(true);
    const database = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(
        database
          .prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.initialized_at'")
          .get(),
      ).toMatchObject({ value: expect.any(String) });
      const migrations = database
        .prepare("SELECT version, name, sha256 FROM schema_migrations ORDER BY version")
        .all() as Array<{ version: number; name: string; sha256: string }>;
      expect(migrations).not.toHaveLength(0);
      for (const migration of migrations) {
        expect(migration.version).toEqual(expect.any(Number));
        expect(migration.name).toEqual(expect.any(String));
        expect(migration.sha256).toMatch(/^[a-f0-9]{64}$/);
      }
    } finally {
      database.close();
    }

    await stopPackagedApp(running);
    running = undefined;

    const commandResult = spawnSync(
      executablePath,
      ["--external-command", "candidature.create", "--workspace", ownedWorkspace],
      {
        input: JSON.stringify({
          source: {
            kind: "other",
            title: "packaged smoke",
            url: "",
            sourceText: "private smoke source",
          },
        }),
        encoding: "utf8",
        timeout: 5_000,
        windowsHide: true,
      },
    );
    expect(commandResult.error).toBeUndefined();
    expect(commandResult.status).toBe(0);
    expect(commandResult.stdout.trim()).toBe(
      '{"ok":true,"capability":"candidature.create","created":true}',
    );
    expect(commandResult.stdout).not.toContain("private smoke source");
    expect(commandResult.stdout).not.toContain(ownedWorkspace);

    const commandDatabase = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(commandDatabase.prepare("SELECT COUNT(*) AS count FROM candidatures").get()).toEqual({
        count: 1,
      });
      expect(
        commandDatabase
          .prepare("SELECT kind, title, source_text AS sourceText FROM candidature_sources")
          .all(),
      ).toEqual([
        { kind: "other", title: "packaged smoke", sourceText: "private smoke source" },
      ]);
      expect(commandDatabase.prepare("SELECT COUNT(*) AS count FROM candidature_field_values").get()).toEqual({
        count: 0,
      });
      expect(commandDatabase.prepare("SELECT action FROM candidature_activity").all()).toEqual([
        { action: "candidature.created" },
      ]);
    } finally {
      commandDatabase.close();
    }

    running = await startPackagedApp(isolatedUserData, linuxHome, linuxDocumentTools);
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();
    await proveCandidatureFlowAtWindowSize(running.page, 1200, 800);
    await proveCandidatureFlowAtWindowSize(running.page, 720, 600);
    if (!linuxDocumentTools) throw new Error("Linux document tools are required for packaged evidence");
    await proveDocumentWorkspace(running.page, ownedWorkspace, linuxDocumentTools.openLogPath);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (linuxHome) {
      rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
    if (linuxDocumentTools) {
      rmSync(linuxDocumentTools.rootPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }
});
