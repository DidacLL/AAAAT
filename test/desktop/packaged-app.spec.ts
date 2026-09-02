import { spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  chromium,
  expect,
  test,
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

test("packaged desktop starts and initializes through the bounded bridge", async () => {
  const executablePath = packagedExecutable();
  const isolatedUserData = mkdtempSync(
    path.join(tmpdir(), "aaaat-packaged-"),
  );
  const port = await reservePort();
  const endpoint = "http://127.0.0.1:" + port;

  expect(existsSync(executablePath)).toBe(true);

  const child = spawn(
    executablePath,
    [
      "--user-data-dir=" + isolatedUserData,
      "--remote-debugging-port=" + port,
    ],
    {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    },
  );

  let processError = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    processError += chunk.toString();
  });

  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined;
  let page: Page | undefined;

  try {
    await waitForDebugger(
      endpoint,
      () => child.exitCode,
      () => processError,
    );

    browser = await chromium.connectOverCDP(endpoint);
    const context = browser.contexts()[0];
    page = context?.pages()[0];

    if (!page) {
      throw new Error("Packaged application opened no renderer page");
    }

    await expect(page).toHaveTitle("AAAAT");
    await expect(
      page.getByRole("heading", { name: "No workspace selected." }),
    ).toBeVisible();

    const boundary = await page.evaluate(() => ({
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
      workspace: ["initialize"],
    });

    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("ws://localhost:");

    await page
      .getByRole("button", { name: "Create local workspace" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Local workspace ready." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Workspace ready" }),
    ).toBeDisabled();
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    await stopProcess(child);
    rmSync(isolatedUserData, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
});
