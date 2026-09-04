import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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

async function startPackagedApp(userData: string, linuxHome?: string): Promise<RunningApp> {
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
  expect(existsSync(executablePath)).toBe(true);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page).toHaveTitle("AAAAT");
    await expect(
      running.page.getByRole("heading", {
        name: "Choose where AAAAT should keep your career workspace.",
      }),
    ).toBeVisible();

    const boundary = await running.page.evaluate(() => ({
      processType: typeof Reflect.get(window, "process"),
      requireType: typeof Reflect.get(window, "require"),
      systemInfo: typeof window.aaaat.system.info,
      workspaceCurrent: typeof window.aaaat.workspace.current,
      workspaceChoose: typeof window.aaaat.workspace.choose,
      profileCurrent: typeof window.aaaat.profile.current,
      documentList: typeof window.aaaat.documents.list,
      documentRender: typeof window.aaaat.documents.render,
      candidatureList: typeof window.aaaat.candidatures.list,
      candidatureCreate: typeof window.aaaat.candidatures.create,
      candidatureFilter: typeof window.aaaat.candidatures.filter,
      candidatureFieldList: typeof window.aaaat.candidatures.listFields,
      candidatureFieldCreate: typeof window.aaaat.candidatures.createField,
      candidatureFieldSet: typeof window.aaaat.candidatures.setFieldValue,
      candidatureSources: typeof window.aaaat.candidatures.listSources,
      candidatureDocuments: typeof window.aaaat.candidatures.setDocuments,
      candidatureConcepts: typeof window.aaaat.candidatures.setConcepts,
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
    await expect(running.page.getByRole("heading", { name: "Workspace ready." })).toBeVisible();
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Candidatures" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Documents" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "AI assist" })).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Settings" })).toBeVisible();

    const databasePath = path.join(ownedWorkspace, "workspace.sqlite");
    expect(existsSync(databasePath)).toBe(true);
    const database = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(
        database
          .prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.initialized_at'")
          .get(),
      ).toMatchObject({ value: expect.any(String) });
      expect(database.prepare("SELECT name FROM schema_migrations WHERE version = 8").get()).toEqual({
        name: "candidature-information",
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM candidature_fields").get()).toMatchObject({
        count: expect.any(Number),
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM candidature_field_values").get()).toEqual({
        count: 0,
      });
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
          values: [],
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

    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page.getByRole("heading", { name: "Workspace ready." })).toBeVisible();
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (linuxHome) {
      rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }
});
