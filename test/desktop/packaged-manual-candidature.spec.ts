import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(
  process.platform !== "linux" && process.platform !== "win32",
  "The packaged no-AI manual journey runs on Linux and Windows",
);

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

async function startPackagedApp(userData: string, appData: string): Promise<RunningApp> {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const environment = { ...process.env };
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
    {
      env: environment,
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
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(running.child.pid), "/T", "/F"], { timeout: 5_000 });
    } else {
      spawnSync("kill", ["-9", String(running.child.pid)], { timeout: 5_000 });
    }
  }
}

function initializeWorkspaceFixture(rootPath: string): void {
  const database = new DatabaseSync(path.join(rootPath, "workspace.sqlite"));
  const schemaSql = readFileSync(path.resolve("src/main/schema.sql"), "utf8");
  try {
    database.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
    try {
      database.exec(schemaSql);
      database
        .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
        .run("workspace.initialized_at", "2026-09-21T00:00:00.000Z");

      const recent = new Date().toISOString();
      const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const reliabilityTagId = "30000000-0000-4000-8000-000000000001";
      const accessibilityTagId = "30000000-0000-4000-8000-000000000002";
      const insertCandidature = database.prepare(
        "INSERT INTO candidatures(id, archived, opportunity_research_selected, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
      );
      const insertSource = database.prepare(
        "INSERT INTO candidature_sources(id, candidature_id, kind, title, url, source_text, created_at, updated_at) VALUES (?, ?, 'job_posting', ?, '', ?, ?, ?)",
      );
      const insertTag = database.prepare(
        "INSERT INTO tags(id, name, definition, notes, aliases_json, created_at, updated_at) VALUES (?, ?, ?, '', ?, ?, ?)",
      );
      const attachTag = database.prepare(
        "INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)",
      );
      const insertFieldValue = database.prepare(
        "INSERT INTO candidature_field_values(candidature_id, field_id, value_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      );
      insertTag.run(
        reliabilityTagId,
        "Reliability",
        "Dependable production ownership",
        JSON.stringify(["SRE"]),
        recent,
        recent,
      );
      insertTag.run(
        accessibilityTagId,
        "Accessibility",
        "Inclusive product and interface practice",
        JSON.stringify(["A11y"]),
        recent,
        recent,
      );
      for (let index = 0; index < 105; index += 1) {
        const suffix = String(index + 1).padStart(12, "0");
        const candidatureId = `10000000-0000-4000-8000-${suffix}`;
        const sourceId = `20000000-0000-4000-8000-${suffix}`;
        const archived = index === 3 ? 1 : 0;
        const createdAt = index === 2 ? old : recent;
        const sourceText =
          index === 0 ? "Fixture tagged Alpha — current and recent"
            : index === 1 ? "Fixture tagged Beta — current and recent"
              : index === 2 ? "Fixture tagged Old — current but older than one month"
                : index === 3 ? "Fixture archived target — archived and recent"
                  : `Fixture bulk retained application ${index + 1}`;
        insertCandidature.run(candidatureId, archived, createdAt, recent);
        insertSource.run(sourceId, candidatureId, "Seeded retained source", sourceText, createdAt, recent);
        if (index === 0 || index === 2) attachTag.run(candidatureId, reliabilityTagId);
        if (index === 1 || index === 3) attachTag.run(candidatureId, accessibilityTagId);
        if (index === 0 || index === 1) {
          const values: ReadonlyArray<readonly [string, string]> = index === 0
            ? [
                ["00000000-0000-4000-8000-000000000101", "Alpha Systems"],
                ["00000000-0000-4000-8000-000000000102", "Reliability Engineer"],
                ["00000000-0000-4000-8000-000000000103", "Barcelona"],
                ["00000000-0000-4000-8000-000000000104", "EUR 70k"],
                ["00000000-0000-4000-8000-000000000105", "2020-01-01"],
                ["00000000-0000-4000-8000-000000000106", "Own production reliability, incident learning, service health and cross-team operational improvements. ".repeat(10)],
              ]
            : [
                ["00000000-0000-4000-8000-000000000101", "Beta Inclusive"],
                ["00000000-0000-4000-8000-000000000102", "Accessibility Engineer"],
                ["00000000-0000-4000-8000-000000000103", "Remote"],
                ["00000000-0000-4000-8000-000000000104", "EUR 72k"],
                ["00000000-0000-4000-8000-000000000105", "2020-01-01"],
                ["00000000-0000-4000-8000-000000000106", "Drive inclusive product practice, accessible interaction design and durable accessibility guidance. ".repeat(10)],
              ];
          for (const [fieldId, value] of values) {
            insertFieldValue.run(candidatureId, fieldId, JSON.stringify(value), createdAt, recent);
          }
        }
      }
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
  const appData = mkdtempSync(path.join(tmpdir(), "aaaat-capture-app-data-"));
  for (const directory of [
    userData,
    path.join(appData, "AAAAT"),
    path.join(appData, "aaaat"),
  ]) {
    rememberWorkspace(directory, workspacePath);
  }
  return appData;
}

test("packaged no-AI raw capture continues manually in the same saved application", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-capture-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-capture-workspace-"));
  initializeWorkspaceFixture(ownedWorkspace);
  const appData = prepareAppData(isolatedUserData, ownedWorkspace);
  const rawMaterial =
    "Aster Aviation seeks a captain in Madrid. Salary 120000. International routes.";
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, appData);
    await running.page.getByRole("button", { name: "Applications", exact: true }).click();
    await expect(running.page.getByRole("region", { name: "Applications" })).toBeVisible();

    await running.page.getByRole("button", { name: "New application" }).click();
    const start = running.page.getByRole("region", { name: "New application" });
    await expect(start.getByRole("button", { name: /Enter information directly/ })).toBeVisible();
    await expect(start.getByRole("button", { name: /Retain raw material/ })).toBeVisible();
    await start.getByRole("button", { name: /Retain raw material/ }).click();

    const rawCapture = running.page.getByRole("region", { name: "Retain raw material" });
    await rawCapture.getByLabel("Application raw material").fill(rawMaterial);
    const retainedBeforeCapture = await running.page.evaluate(() => window.aaaat.candidatures.list());
    expect(retainedBeforeCapture).toHaveLength(105);
    await rawCapture.getByRole("button", { name: "Retain raw material" }).click();
    expect(await running.page.evaluate(() => window.aaaat.candidatures.list())).toHaveLength(106);

    const continuation = running.page.getByRole("region", { name: "Raw material continuation" });
    await expect(continuation.getByRole("button", { name: "Use AI to suggest information" })).toBeVisible();
    await expect(continuation.getByRole("button", { name: "Fill information manually" })).toBeVisible();
    const retainedSelection = running.page.getByRole("region", { name: "Application information" });
    await retainedSelection.getByRole("button", { name: "← Applications" }).click();
    const corpus = running.page.getByLabel("Application corpus");
    const candidatureEntries = corpus.getByRole("button", { name: "Inspect saved application" });
    await expect(candidatureEntries).toHaveCount(1);
    const rawOnlyEntry = candidatureEntries.first();
    await expect(rawOnlyEntry).toContainText("Retained source");
    await expect(rawOnlyEntry).toContainText("Aster Aviation seeks a captain in Madrid");
    await rawOnlyEntry.click();
    await corpus.getByRole("button", { name: "Open application" }).click();

    const reopened = running.page.getByRole("region", { name: "Application information" });
    await reopened.getByText("Sources, documents & history").click();
    const roleBlock = reopened.getByRole("article", { name: "Role information" });
    await roleBlock.getByRole("button", { name: "Edit Role", exact: true }).click();
    await roleBlock.getByLabel("Value").fill("Captain");
    await expect(reopened.getByRole("button", { name: "Send to my AI" })).toBeDisabled();
    await roleBlock.getByRole("button", { name: "Save", exact: true }).click();
    await expect(roleBlock).toContainText("Captain");

    const sources = reopened.getByRole("region", { name: "Sources" });
    await expect(sources).toContainText(rawMaterial);
    await sources.getByRole("button", { name: "Read source" }).click();
    await expect(sources.getByRole("article", { name: "Source content" })).toContainText(rawMaterial);
    await sources.getByRole("button", { name: "Back to Sources" }).click();

    const primary = reopened.getByRole("region", { name: "Starred application information" });
    const externalAi = reopened.getByRole("region", { name: "Send to my AI" });
    await expect(externalAi.getByRole("button", { name: "Send to my AI" })).toBeVisible();
    await expect(reopened.getByLabel("Task instructions")).toHaveCount(0);
    const primaryBox = await primary.boundingBox();
    const externalAiBox = await externalAi.boundingBox();
    expect(primaryBox).not.toBeNull();
    expect(externalAiBox).not.toBeNull();
    expect(primaryBox!.y).toBeLessThan(externalAiBox!.y);

    expect(existsSync(path.join(ownedWorkspace, "ai-connection.json"))).toBe(false);

    await reopened.getByRole("button", { name: "← Applications" }).click();
    const corpusAfterEdit = running.page.getByLabel("Application corpus");
    const search = running.page.getByLabel("Search");
    const archive = running.page.getByLabel("Show");
    const from = running.page.getByLabel("From");
    await expect(from).toHaveValue("all");

    await running.page.setViewportSize({ width: 1440, height: 900 });
    await search.fill("Fixture archived target");
    await archive.selectOption("archived");
    await from.selectOption("24h");
    await expect(corpusAfterEdit.getByRole("button", { name: "Inspect saved application" })).toHaveCount(1);
    await expect(corpusAfterEdit).toContainText("Fixture archived target");

    await search.fill("Fixture tagged");
    await archive.selectOption("active");
    const tagged = corpusAfterEdit.getByRole("button", { name: "Inspect saved application" });
    await expect(tagged).toHaveCount(2);
    const alpha = tagged.filter({ hasText: "Fixture tagged Alpha" });
    const beta = tagged.filter({ hasText: "Fixture tagged Beta" });
    await expect(alpha).toContainText("Alpha Systems");
    await expect(alpha).toContainText("Reliability Engineer");
    await expect(alpha).toContainText("Reliability");
    await expect(beta).toContainText("Beta Inclusive");
    await expect(beta).toContainText("Accessibility Engineer");
    await expect(beta).toContainText("Accessibility");
    const wideBoxes = await Promise.all([alpha.boundingBox(), beta.boundingBox()]);
    expect(wideBoxes[0]).not.toBeNull();
    expect(wideBoxes[1]).not.toBeNull();
    expect(wideBoxes[0]!.x).not.toBe(wideBoxes[1]!.x);

    await running.page.setViewportSize({ width: 720, height: 600 });
    await expect(search).toBeVisible();
    await expect(archive).toBeVisible();
    await expect(from).toBeVisible();
    expect(await running.page.evaluate(() => (
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    ))).toBe(true);
    await running.page.setViewportSize({ width: 1440, height: 900 });

    const collapsedAlphaText = (await alpha.textContent()) ?? "";
    await alpha.click();
    await expect(running.page.getByRole("region", { name: "Application information" })).toHaveCount(0);
    await expect(corpusAfterEdit.getByLabel("Application inspection")).toHaveCount(1);
    const expandedAlpha = corpusAfterEdit.getByRole("button", { name: "Collapse saved application" });
    await expect(expandedAlpha).toContainText("2020-01-01");
    await expect(expandedAlpha).toContainText("Own production reliability");
    const expandedAlphaText = (await expandedAlpha.textContent()) ?? "";
    expect(expandedAlphaText.length).toBeGreaterThan(collapsedAlphaText.length);
    const railTags = running.page.getByRole("region", { name: "Tags glossary" });
    await expect(railTags).toContainText("Reliability");
    await expect(railTags).toContainText("Dependable production ownership");
    await expect(railTags.getByRole("searchbox")).toHaveCount(0);

    await beta.click();
    await expect(corpusAfterEdit.getByLabel("Application inspection")).toHaveCount(1);
    await expect(railTags).toContainText("Accessibility");
    await expect(railTags).not.toContainText("Reliability");

    await corpusAfterEdit.getByRole("button", { name: "Open application" }).click();
    const selectedFixture = running.page.getByRole("region", { name: "Application information" });
    await expect(selectedFixture).toBeVisible();
    await selectedFixture.getByText("Sources, documents & history").click();
    await expect(selectedFixture.getByRole("region", { name: "Sources" })).toContainText("Fixture tagged Beta");
    await expect(selectedFixture.getByRole("region", { name: "Remaining application information" })).toBeVisible();
    await expect(selectedFixture.getByText("More", { exact: true })).toHaveCount(0);
    const notesReadout = selectedFixture.getByRole("article", { name: "Notes information" })
      .locator(".candidature-value-reader > p");
    await expect(notesReadout).toContainText("Drive inclusive product practice");
    expect(await notesReadout.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await expect(railTags).toContainText("Accessibility");

    const selectedTags = selectedFixture.getByRole("region", { name: "Tags" });
    await expect(selectedTags).toContainText("Inclusive product and interface practice");
    await selectedTags.getByRole("button", { name: "Edit shared Tag" }).click();
    await selectedTags.getByLabel("Definition").fill("Inclusive product practice, updated locally");
    await selectedTags.getByRole("button", { name: "Save Tag" }).click();
    await expect(selectedTags).toContainText("Inclusive product practice, updated locally");
    await expect(railTags).toContainText("Inclusive product practice, updated locally");

    const fixtureRole = selectedFixture.getByRole("article", { name: "Role information" });
    await fixtureRole.getByRole("button", { name: "Edit Role", exact: true }).click();
    await fixtureRole.getByLabel("Value").fill("Platform test lead");
    await fixtureRole.getByRole("button", { name: "Save", exact: true }).click();
    await expect(fixtureRole).toContainText("Platform test lead");

    const applicationDocuments = selectedFixture.getByRole("region", { name: "Application documents" });
    await applicationDocuments.getByRole("button", { name: "New CV" }).click();
    await expect(running.page.getByRole("heading", { name: "Application CV" })).toBeVisible();
    const cvPaper = running.page.locator(".working-cv-composition");
    await expect(cvPaper).toBeVisible();
    const widePaper = await cvPaper.boundingBox();
    expect(widePaper).not.toBeNull();
    expect(widePaper!.width).toBeLessThanOrEqual(980);
    await expect(running.page.getByText("Document details", { exact: false })).toBeVisible();

    await running.page.getByText("＋ Add section").click();
    await running.page.getByLabel("Section name").fill("Experience");
    await running.page.getByRole("button", { name: "Add section", exact: true }).click();
    await expect(running.page.getByRole("region", { name: "Experience section" })).toBeVisible();
    await running.page.getByRole("button", { name: "Save", exact: true }).click();

    await running.page.setViewportSize({ width: 720, height: 600 });
    await expect(cvPaper).toBeVisible();
    expect(await running.page.evaluate(() => (
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    ))).toBe(true);
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(appData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
