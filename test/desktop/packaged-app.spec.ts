import { execFileSync, spawn, type ChildProcess } from "node:child_process";
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
  const packageRoot = path.resolve(
    "out",
    "AAAAT-" + process.platform + "-" + process.arch,
  );

  if (process.platform === "darwin") {
    const bundle = readdirSync(packageRoot).find((entry) =>
      entry.endsWith(".app"),
    );
    if (!bundle) {
      throw new Error("Packaged macOS application bundle is missing");
    }

    const executableDirectory = path.join(
      packageRoot,
      bundle,
      "Contents",
      "MacOS",
    );
    const executable = readdirSync(executableDirectory)[0];
    if (!executable) {
      throw new Error("Packaged macOS executable is missing");
    }

    return path.join(executableDirectory, executable);
  }

  return path.join(
    packageRoot,
    process.platform === "win32" ? "aaaat.exe" : "aaaat",
  );
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

      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(address.port);
        }
      });
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
      throw new Error(
        "Packaged application exited before startup: " + processError(),
      );
    }

    try {
      const response = await fetch(endpoint + "/json/version");
      if (response.ok) {
        return;
      }
    } catch {
      // The packaged process is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const error = processError().trim();
  throw new Error(
    "Packaged application did not expose its test endpoint" +
      (error ? ":\n" + error : ""),
  );
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }

  const exited = new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
  });

  child.kill();

  await Promise.race([
    exited,
    new Promise<void>((resolve) => {
      setTimeout(resolve, 5_000);
    }),
  ]);
}

interface RunningApp {
  readonly child: ChildProcess;
  readonly browser: Browser;
  readonly page: Page;
}

async function startPackagedApp(
  userData: string,
  linuxHome?: string,
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
                ? {
                    HOME: linuxHome,
                    XDG_CONFIG_HOME: path.join(linuxHome, ".config"),
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

  await waitForDebugger(
    endpoint,
    () => child.exitCode,
    () => processError,
  );

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
  const escapedWorkspacePath = workspacePath
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
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

test("packaged desktop preserves the bounded workspace boundary", async () => {
  const executablePath = packagedExecutable();
  const isolatedUserData = mkdtempSync(
    path.join(tmpdir(), "aaaat-packaged-"),
  );
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-owned-"));
  const linuxHome =
    process.platform === "linux"
      ? prepareLinuxChooserHome(ownedWorkspace)
      : undefined;

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
      root: Object.keys(window.aaaat),
      system: Object.keys(window.aaaat.system),
      workspace: Object.keys(window.aaaat.workspace),
    }));

    expect(boundary).toEqual({
      processType: "undefined",
      requireType: "undefined",
      root: ["system", "workspace"],
      system: ["info"],
      workspace: ["current", "choose"],
    });

    const csp = await running.page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("ws://localhost:");

    if (process.platform !== "linux") {
      return;
    }

    await running.page
      .getByRole("button", { name: "Create workspace" })
      .click();
    chooseLinuxDirectory();

    await expect(
      running.page.getByRole("heading", { name: "Workspace ready." }),
    ).toBeVisible();
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();

    const databasePath = path.join(ownedWorkspace, "workspace.sqlite");
    expect(existsSync(databasePath)).toBe(true);

    const database = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(
        database
          .prepare(
            "SELECT value FROM workspace_metadata WHERE key = 'workspace.initialized_at'",
          )
          .get(),
      ).toMatchObject({ value: expect.any(String) });
    } finally {
      database.close();
    }

    await stopPackagedApp(running);
    running = undefined;

    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(
      running.page.getByRole("heading", { name: "Workspace ready." }),
    ).toBeVisible();
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
  } finally {
    if (running) {
      await stopPackagedApp(running);
    }
    rmSync(isolatedUserData, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
    rmSync(ownedWorkspace, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
    if (linuxHome) {
      rmSync(linuxHome, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  }
});
