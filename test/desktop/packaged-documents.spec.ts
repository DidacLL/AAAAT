import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(
  process.platform !== "linux" && process.platform !== "win32",
  "The packaged document-production journey runs on Linux and Windows",
);

const candidatureId = "00000000-0000-4000-8000-000000000711";
const profileItemId = "00000000-0000-4000-8000-000000000712";

function packagedExecutable(): string {
  return path.resolve(
    "out",
    `AAAAT-${process.platform}-${process.arch}`,
    process.platform === "win32" ? "aaaat.exe" : "aaaat",
  );
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
        reject(new Error("Could not reserve a packaged document port"));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

interface RunningApp {
  readonly child: ChildProcess;
  readonly browser: Browser;
  readonly page: Page;
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

function installFakeLatexmk(root: string): string {
  const tools = path.join(root, "tools");
  mkdirSync(tools);
  const script = path.join(tools, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");
const path = require("node:path");
fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), "%PDF-1.4\\n% packaged AAAAT fixture\\n");
`,
    "utf8",
  );
  const executable = path.join(tools, "latexmk");
  writeFileSync(executable, `#!/usr/bin/env node
require(${JSON.stringify(script)});
`, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(path.join(tools, "latexmk.cmd"), `@node "${script}" %*\r\n`, "utf8");
  return tools;
}

function initializeWorkspaceFixture(rootPath: string): void {
  const database = new DatabaseSync(path.join(rootPath, "workspace.sqlite"));
  const schemaSql = readFileSync(path.resolve("src/main/schema.sql"), "utf8");
  const now = "2026-09-21T00:00:00.000Z";
  try {
    database.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
    try {
      database.exec(schemaSql);
      database
        .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
        .run("workspace.initialized_at", now);
      database
        .prepare(
          "INSERT INTO candidatures(id, archived, opportunity_research_selected, created_at, updated_at) VALUES (?, 0, 0, ?, ?)",
        )
        .run(candidatureId, now, now);
      database
        .prepare(
          `INSERT INTO profile_items(
            id, kind, title, subtitle, description, start_date, end_date, url,
            sort_order, ai_use_allowed, created_at, updated_at
          ) VALUES (?, 'experience', ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
        )
        .run(
          profileItemId,
          "Núria Müller & R&D",
          "Platform Engineering",
          "Built reliable systems with C++ and TypeScript.",
          "2022",
          "2026",
          "https://example.test/nuria_muller",
          now,
          now,
        );
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }
}

function rememberWorkspace(directory: string, workspacePath: string): void {
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "workspace-settings.json"),
    JSON.stringify({ lastWorkspacePath: workspacePath }, null, 2) + "\n",
    "utf8",
  );
}

function prepareAppData(userData: string, workspacePath: string): string {
  const appData = mkdtempSync(path.join(tmpdir(), "aaaat-documents-app-data-"));
  for (const directory of [
    userData,
    path.join(appData, "AAAAT"),
    path.join(appData, "aaaat"),
  ]) {
    rememberWorkspace(directory, workspacePath);
  }
  return appData;
}

async function startPackagedApp(
  userData: string,
  appData: string,
  toolsPath: string,
): Promise<RunningApp> {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const environment = {
    ...process.env,
    PATH: `${toolsPath}${path.delimiter}${process.env.PATH ?? ""}`,
  };
  if (process.platform === "linux") {
    environment.GTK_USE_PORTAL = "0";
    environment.HOME = appData;
    environment.XDG_CONFIG_HOME = appData;
  } else if (process.platform === "win32") {
    environment.APPDATA = appData;
    environment.LOCALAPPDATA = appData;
    environment.USERPROFILE = appData;
  }

  const child = spawn(
    packagedExecutable(),
    [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`],
    { env: environment, stdio: ["ignore", "ignore", "pipe"] },
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
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(running.child.pid), "/T", "/F"], { timeout: 5_000 });
    } else {
      spawnSync("kill", ["-9", String(running.child.pid)], { timeout: 5_000 });
    }
  }
}

test("packaged app produces CV, cover-letter and packet artifacts through the privileged document boundary", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-documents-"));
  const workspace = path.join(root, "workspace");
  const userData = path.join(root, "user-data");
  mkdirSync(workspace);
  mkdirSync(userData);
  initializeWorkspaceFixture(workspace);
  const toolsPath = installFakeLatexmk(root);
  const appData = prepareAppData(userData, workspace);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(userData, appData, toolsPath);
    await running.page.getByRole("button", { name: "Open CVs" }).click();
    await expect(running.page.getByRole("region", { name: "CV and document work" })).toBeVisible();

    const result = await running.page.evaluate(async (applicationId) => {
      const working = await window.aaaat.documentDomain.createWorkingCv({
        title: "Packaged application CV",
        candidatureId: applicationId,
        source: { kind: "profile" },
      });
      const standaloneLetter = await window.aaaat.documentDomain.createLetter({
        candidatureId: null,
        title: "Standalone packaged letter",
        bodyParagraphs: ["Local manual letter."],
      });
      const applicationLetter = await window.aaaat.documentDomain.createLetter({
        candidatureId: applicationId,
        title: "Packaged application letter",
        bodyParagraphs: ["Exact packet letter."],
      });
      const renderedCv = await window.aaaat.documentDomain.renderCv(working.id);
      const renderedStandalone = await window.aaaat.documentDomain.renderLetter(standaloneLetter.id);
      const renderedApplication = await window.aaaat.documentDomain.renderLetter(applicationLetter.id);
      const packet = await window.aaaat.documentDomain.createPacket({
        candidatureId: applicationId,
        renderedCvId: renderedCv.id,
        coverLetterId: applicationLetter.id,
      });
      const collections = await window.aaaat.documentDomain.collections();
      return {
        renderedCv,
        renderedStandalone,
        renderedApplication,
        packet,
        counts: {
          renderedCvs: collections.renderedCvs.length,
          renderedLetters: collections.renderedLetters.length,
          packets: collections.applicationPackets.length,
        },
      };
    }, candidatureId);

    expect(result.renderedCv.hasPdf).toBe(true);
    expect(result.renderedStandalone.hasPdf).toBe(true);
    expect(result.renderedApplication.hasPdf).toBe(true);
    expect(result.packet.hasPdf).toBe(true);
    expect(result.counts).toEqual({ renderedCvs: 1, renderedLetters: 2, packets: 1 });
    expect(JSON.stringify(result)).not.toContain(workspace);

    expect(
      existsSync(path.join(workspace, "rendered-cvs", result.renderedCv.id, "aaaat.sty")),
    ).toBe(true);
    expect(
      existsSync(
        path.join(
          workspace,
          "rendered-cover-letters",
          result.renderedStandalone.id,
          "aaaat.sty",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(path.join(workspace, "application-packets", result.packet.id, "main.tex")),
    ).toBe(true);
    expect(
      existsSync(
        path.join(
          workspace,
          "application-packets",
          result.packet.id,
          "cover-letter",
          "data.tex",
        ),
      ),
    ).toBe(true);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(appData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
