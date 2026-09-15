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

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

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
  throw new Error("Packaged application did not expose its test endpoint" + (error ? ":\n" + error : ""));
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
    const result = spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) terminationError = (result.stderr || result.stdout || "taskkill failed").trim();
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
  const child = spawn(packagedExecutable(), ["--user-data-dir=" + userData, "--remote-debugging-port=" + port], {
    env:
      process.platform === "linux"
        ? {
            ...process.env,
            GTK_USE_PORTAL: "0",
            ...(linuxHome ? { HOME: linuxHome, XDG_CONFIG_HOME: path.join(linuxHome, ".config") } : {}),
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
  });
  let processError = "";
  child.stderr?.on("data", (chunk: Buffer) => { processError += chunk.toString(); });
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
  writeFileSync(path.join(configPath, "user-dirs.dirs"), `XDG_DOWNLOAD_DIR="${escapedWorkspacePath}"\n`, "utf8");
  return homePath;
}

function prepareLinuxDocumentTools(): LinuxDocumentTools {
  const rootPath = mkdtempSync(path.join(tmpdir(), "aaaat-document-tools-"));
  const openLogPath = path.join(rootPath, "opened-output.log");
  writeFileSync(
    path.join(rootPath, "latexmk"),
    ["#!/bin/sh", "set -eu", "mkdir -p build", "printf '%s\\n' '%PDF-1.4' '%%EOF' > build/main.pdf", ""].join("\n"),
    { encoding: "utf8", mode: 0o755 },
  );
  writeFileSync(
    path.join(rootPath, "xdg-open"),
    ["#!/bin/sh", "set -eu", "printf '%s\\n' \"$1\" >> \"$AAAAT_TEST_OUTPUT_OPEN_LOG\"", ""].join("\n"),
    { encoding: "utf8", mode: 0o755 },
  );
  return { rootPath, openLogPath };
}

function chooseLinuxDirectory(windowTitle: string): void {
  execFileSync(
    "bash",
    [
      "-lc",
      [
        "set -eu",
        "window=''",
        "for attempt in $(seq 1 100); do",
        `  window=$(xdotool search --onlyvisible --name '${windowTitle}' 2>/dev/null | tail -n 1 || true)`,
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

async function proveIntentShell(page: Page, width: number, height: number): Promise<void> {
  expect(resizeLinuxAppWindow(width, height)).toEqual({ width, height });
  await page.waitForTimeout(150);
  const primary = page.getByRole("navigation", { name: "Primary work areas" });
  await expect(primary.getByRole("button", { name: "From a job offer" })).toBeVisible();
  await expect(primary.getByRole("button", { name: "CV & cover letter" })).toBeVisible();
  await expect(primary.getByRole("button", { name: "Saved applications" })).toBeVisible();
  await expect(primary.getByRole("button", { name: "My information" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change workspace" })).toBeVisible();
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
}

function documentId(workspacePath: string, title: string): string {
  const database = new DatabaseSync(path.join(workspacePath, "workspace.sqlite"), { readOnly: true });
  try {
    const row = database.prepare("SELECT id FROM documents WHERE title = ?").get(title) as { id: string } | undefined;
    if (!row) throw new Error(`Document ${title} was not persisted`);
    return row.id;
  } finally {
    database.close();
  }
}

async function expectLastOpenedOutput(openLogPath: string, expectedOutputPath: string): Promise<void> {
  await expect.poll(() => {
    if (!existsSync(openLogPath)) return "";
    return readFileSync(openLogPath, "utf8").trim().split(/\r?\n/).at(-1) ?? "";
  }).toBe(expectedOutputPath);
}

test("packaged external command rejects unsupported authority without opening desktop", () => {
  const uninitializedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-command-smoke-"));
  try {
    const result = spawnSync(packagedExecutable(), ["--external-command", "candidature.update", "--workspace", uninitializedWorkspace], {
      input: "{}",
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(result.stdout.trim()).toBe('{"ok":false,"error":"unsupported-capability"}');
    expect(existsSync(path.join(uninitializedWorkspace, "workspace.sqlite"))).toBe(false);
  } finally {
    rmSync(uninitializedWorkspace, { recursive: true, force: true });
  }
});

test("packaged desktop keeps the sandboxed boundary and first-run ownership choices", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-boundary-"));
  let running: RunningApp | undefined;
  try {
    running = await startPackagedApp(isolatedUserData);
    await expect(running.page).toHaveTitle("AAAAT");
    await expect(running.page.getByRole("heading", { name: "Choose where AAAAT should keep your career workspace." })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Create workspace" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Open existing workspace" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Try with demo data" })).toBeVisible();

    const boundary = await running.page.evaluate(() => ({
      processType: typeof Reflect.get(window, "process"),
      requireType: typeof Reflect.get(window, "require"),
      workspaceCurrent: typeof window.aaaat.workspace.current,
      candidatureCreate: typeof window.aaaat.candidatures.create,
      documentCreate: typeof window.aaaat.documents.create,
      documentRender: typeof window.aaaat.documents.render,
      setupEnvironment: typeof window.aaaat.setupEnvironment.current,
    }));
    expect(boundary.processType).toBe("undefined");
    expect(boundary.requireType).toBe("undefined");
    expect(boundary.workspaceCurrent).toBe("function");
    expect(boundary.candidatureCreate).toBe("function");
    expect(boundary.documentCreate).toBe("function");
    expect(boundary.documentRender).toBe("function");
    expect(boundary.setupEnvironment).toBe("function");
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("packaged Linux follows the raw-offer-to-document journey and keeps standalone work and host-agnostic settings", async () => {
  test.skip(process.platform !== "linux", "Linux chooser automation exercises the full packaged desktop journey");
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-journey-"));
  const workspace = mkdtempSync(path.join(tmpdir(), "aaaat-owned-"));
  const home = prepareLinuxChooserHome(workspace);
  const tools = prepareLinuxDocumentTools();
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, home, tools);
    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory("Create or select an AAAAT workspace");

    await expect(running.page.getByText(workspace)).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Turn a job offer into application documents." })).toBeVisible();
    await proveIntentShell(running.page, 1200, 800);
    await proveIntentShell(running.page, 720, 600);

    const offer = "Acme Platform Engineer. Build Python distributed systems. Remote in Spain.";
    await running.page.getByLabel("Job offer").fill(offer);
    await running.page.getByRole("button", { name: "Start application documents" }).click();
    await expect(running.page.getByRole("heading", { name: "Application CV" })).toBeVisible();

    const databasePath = path.join(workspace, "workspace.sqlite");
    const database = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(database.prepare("SELECT COUNT(*) AS count FROM candidatures").get()).toEqual({ count: 1 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM documents").get()).toEqual({ count: 2 });
      expect(database.prepare("SELECT source_text AS sourceText FROM candidature_sources").get()).toEqual({ sourceText: offer });
    } finally {
      database.close();
    }

    const primary = running.page.getByRole("navigation", { name: "Primary work areas" });
    await primary.getByRole("button", { name: "Saved applications" }).click();
    const search = running.page.getByRole("searchbox", { name: "Search" });
    await search.fill("Acme");
    await expect(running.page.locator('[aria-label="Candidature corpus Focus"]')).toBeVisible();

    await primary.getByRole("button", { name: "CV & cover letter" }).click();
    await expect(running.page.getByRole("button", { name: "Application CV" })).toBeVisible();
    await running.page.getByLabel("Title").fill("Standalone acceptance CV");
    await running.page.getByRole("button", { name: "Create CV" }).click();
    await expect(running.page.getByRole("heading", { name: "Standalone acceptance CV" })).toBeVisible();

    const localNav = running.page.getByRole("tablist", { name: "Document work" });
    await localNav.getByRole("tab", { name: "Output" }).click();
    await running.page.getByRole("button", { name: "Render PDF" }).click();
    await expect(running.page.getByText("PDF rendered successfully. Open the result below.")).toBeVisible();
    const outputPath = path.join(workspace, "documents", documentId(workspace, "Standalone acceptance CV"), "build", "main.pdf");
    expect(existsSync(outputPath)).toBe(true);
    await running.page.getByRole("button", { name: "Open PDF" }).click();
    await expectLastOpenedOutput(tools.openLogPath, outputPath);

    await running.page.getByRole("button", { name: "Settings" }).click();
    await running.page.getByRole("button", { name: /External assistants & portability/ }).click();
    await expect(running.page.getByRole("heading", { name: "Use AAAAT from a compatible assistant" })).toBeVisible();
    await expect(running.page.getByRole("article", { name: "installer.ai" })).toBeVisible();
    await expect(running.page.getByRole("article", { name: "configurator.ai" })).toBeVisible();
    await expect(running.page.getByText("Optional VS Code adapter", { selector: "summary" })).toBeVisible();
    await expect(running.page.getByText(/ChatGPT, Claude, local agents, editors/i)).toBeVisible();
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(tools.rootPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("packaged demo remains isolated and reset returns the workspace to a clean intention-first surface", async () => {
  test.skip(process.platform !== "linux", "Linux chooser automation exercises the packaged demo path");
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-demo-packaged-"));
  const workspace = mkdtempSync(path.join(tmpdir(), "aaaat-demo-owned-"));
  const home = prepareLinuxChooserHome(workspace);
  let running: RunningApp | undefined;
  try {
    running = await startPackagedApp(isolatedUserData, home);
    await running.page.getByRole("button", { name: "Try with demo data" }).click();
    chooseLinuxDirectory("Create a demo AAAAT workspace");

    await expect(running.page.getByText("Demo workspace", { exact: true })).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Turn a job offer into application documents." })).toBeVisible();
    await running.page.getByRole("button", { name: "Saved applications" }).click();
    await expect(running.page.locator('[aria-label="Candidature corpus Focus"]').getByRole("button", { name: /Northstar Labs/i }).first()).toBeVisible();

    await running.page.getByRole("button", { name: "Settings" }).click();
    await running.page.getByRole("button", { name: /^Workspace\b/ }).click();
    const reset = running.page.getByRole("region", { name: "Reset workspace" });
    running.page.once("dialog", (dialog) => void dialog.accept());
    await reset.getByRole("button", { name: "Reset workspace" }).click();
    await expect(running.page.getByRole("heading", { name: "Turn a job offer into application documents." })).toBeVisible();

    const database = new DatabaseSync(path.join(workspace, "workspace.sqlite"), { readOnly: true });
    try {
      expect(database.prepare("SELECT COUNT(*) AS count FROM candidatures").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM profile_items").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM documents").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.demo'").get()).toBeUndefined();
    } finally {
      database.close();
    }
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
