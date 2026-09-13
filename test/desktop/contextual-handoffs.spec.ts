import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Locator, type Page } from "@playwright/test";

test.skip(process.platform !== "linux", "The packaged contextual-handoff journey runs once on Linux");

function packagedExecutable(): string {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, "aaaat");
}

async function reservePort(): Promise<number> {
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
        XDG_DATA_HOME: path.join(linuxHome, ".local", "share"),
        PATH: `${path.join(linuxHome, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let processError = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    processError += chunk.toString();
  });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Packaged AAAAT exited: ${processError}`);
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) break;
    } catch {
      // Packaged Chromium is still starting.
    }
    if (attempt === 99) throw new Error(`Packaged AAAAT did not expose its test endpoint: ${processError}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
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
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-handoff-home-"));
  const configPath = path.join(homePath, ".config");
  const binPath = path.join(homePath, "bin");
  mkdirSync(configPath, { recursive: true });
  mkdirSync(binPath, { recursive: true });
  const escaped = workspacePath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  writeFileSync(path.join(configPath, "user-dirs.dirs"), `XDG_DOWNLOAD_DIR="${escaped}"\n`, "utf8");

  const latexmk = path.join(binPath, "latexmk");
  writeFileSync(
    latexmk,
    [
      "#!/usr/bin/env node",
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });',
      'fs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), "packaged-retained-pdf");',
    ].join("\n"),
    "utf8",
  );
  chmodSync(latexmk, 0o755);
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

async function openAssociationManagement(material: Locator): Promise<void> {
  const details = material.locator("details.application-material-associations");
  if ((await details.getAttribute("open")) === null) await details.locator(":scope > summary").click();
  await expect(details).toHaveAttribute("open", "");
}

test("packaged candidature document handoff returns to complete candidature without reviving tabs", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-handoff-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-handoff-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByRole("heading", { name: "Candidatures" })).toBeVisible();

    await running.page.evaluate(async () => {
      await window.aaaat.candidatures.create({
        source: {
          kind: "other",
          title: "Handoff opportunity",
          url: "",
          sourceText: "A retained opportunity used to prove contextual document handoffs.",
        },
        values: [],
      });
    });
    await running.page.reload();

    const corpus = running.page.getByLabel("Candidature corpus Focus");
    const card = corpus.locator(".candidature-corpus-card").filter({ hasText: "Handoff opportunity" });
    await card.getByRole("button", { name: "Edit candidature" }).click();
    await expect(running.page.getByRole("tablist", { name: "Candidature sections" })).toHaveCount(0);

    const complete = running.page.getByRole("region", { name: "Complete candidature" });
    const material = complete.getByRole("region", { name: "Application material" });
    await material.getByRole("button", { name: "Create CV or letter for this candidature" }).click();

    const documents = running.page.getByRole("region", { name: "CVs & letters" });
    await expect(documents).toContainText("New work will be associated with Handoff opportunity.");
    await documents.locator(".document-create").getByLabel("Title").fill("Handoff CV");
    await documents.getByRole("button", { name: "Create CV" }).click();
    await expect(documents.getByRole("heading", { name: "Handoff CV" })).toBeVisible();
    await documents.getByRole("button", { name: "Return to Handoff opportunity" }).click();

    const returnedComplete = running.page.getByRole("region", { name: "Complete candidature" });
    const returnedMaterial = returnedComplete.getByRole("region", { name: "Application material" });
    const working = returnedMaterial.getByRole("region", { name: "Working application documents" });
    await expect(working.getByRole("heading", { name: "Handoff CV" })).toBeVisible();

    await openAssociationManagement(returnedMaterial);
    const firstAssociation = returnedMaterial.getByRole("checkbox", { name: "Handoff CV (CV)", exact: true });
    await expect(firstAssociation).toBeChecked();
    await firstAssociation.uncheck();
    await expect(returnedMaterial.getByRole("button", { name: "Save document associations" })).toBeEnabled();

    await returnedMaterial.getByRole("button", { name: "Create CV or letter for this candidature" }).click();
    const secondDocuments = running.page.getByRole("region", { name: "CVs & letters" });
    await secondDocuments.locator(".document-create").getByLabel("Title").fill("Second Handoff CV");
    await secondDocuments.getByRole("button", { name: "Create CV" }).click();
    await secondDocuments.getByRole("button", { name: "Return to Handoff opportunity" }).click();

    const reconciledMaterial = running.page
      .getByRole("region", { name: "Complete candidature" })
      .getByRole("region", { name: "Application material" });
    await openAssociationManagement(reconciledMaterial);
    await expect(
      reconciledMaterial.getByRole("checkbox", { name: "Handoff CV (CV)", exact: true }),
    ).not.toBeChecked();
    await expect(
      reconciledMaterial.getByRole("checkbox", { name: "Second Handoff CV (CV)", exact: true }),
    ).toBeChecked();
    await reconciledMaterial.getByRole("button", { name: "Save document associations" }).click();

    const association = await running.page.evaluate(async () => {
      const candidature = (await window.aaaat.candidatures.list()).find(
        (record) => record.label === "Handoff opportunity",
      );
      const documents = await window.aaaat.documents.list();
      const first = documents.find((record) => record.title === "Handoff CV");
      const second = documents.find((record) => record.title === "Second Handoff CV");
      return {
        firstAssociated: Boolean(candidature && first && candidature.documentIds.includes(first.id)),
        secondAssociated: Boolean(candidature && second && candidature.documentIds.includes(second.id)),
      };
    });
    expect(association).toEqual({ firstAssociated: false, secondAssociated: true });
    expect(existsSync(path.join(ownedWorkspace, "ai-connection.json"))).toBe(false);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
