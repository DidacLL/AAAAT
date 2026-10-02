import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "win32", "PLAN5 rendered evidence uses the packaged Windows desktop lane.");

const evidenceRoot = path.resolve("plan5-evidence");
const richId = "00000000-0000-4000-8000-00000000e001";
const rawId = "00000000-0000-4000-8000-00000000e002";
const orgField = "00000000-0000-4000-8000-000000000101";
const roleField = "00000000-0000-4000-8000-000000000102";
const locationField = "00000000-0000-4000-8000-000000000103";
const notesField = "00000000-0000-4000-8000-000000000106";

function packagedExecutable(): string {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, "aaaat.exe");
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
        reject(new Error("Could not reserve evidence port"));
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

async function waitForDebugger(endpoint: string, processExit: () => number | null, processError: () => string): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (processExit() !== null) throw new Error(`Packaged AAAAT exited: ${processError()}`);
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return;
    } catch {
      // Chromium is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Packaged AAAAT did not expose its debugger endpoint: ${processError()}`);
}

async function startPackagedApp(userData: string, appData: string): Promise<RunningApp> {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    APPDATA: appData,
    LOCALAPPDATA: appData,
    USERPROFILE: appData,
  };
  const child = spawn(
    packagedExecutable(),
    [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`],
    { env: environment, stdio: ["ignore", "ignore", "pipe"] },
  );
  let processError = "";
  child.stderr?.on("data", (chunk: Buffer) => { processError += chunk.toString(); });
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
    spawnSync("taskkill", ["/PID", String(running.child.pid), "/T", "/F"], { timeout: 5_000 });
  }
}

async function setWindowBounds(page: Page, width: number, height: number): Promise<void> {
  try {
    const session = await page.context().newCDPSession(page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: { width, height, windowState: "normal" },
    });
    await session.detach();
  } catch {
    await page.evaluate(({ width, height }) => window.resizeTo(width, height), { width, height });
  }
  await page.waitForTimeout(250);
}

async function capture(page: Page, label: string, width: number, height: number): Promise<void> {
  await setWindowBounds(page, width, height);
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    documentScrollWidth: document.documentElement.scrollWidth,
    documentScrollHeight: document.documentElement.scrollHeight,
    bodyScrollWidth: document.body.scrollWidth,
    bodyScrollHeight: document.body.scrollHeight,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth,
    visibleText: (document.body.innerText || "").slice(0, 16000),
  }));
  writeFileSync(
    path.join(evidenceRoot, `${label}-${width}x${height}.json`),
    JSON.stringify({ requestedOuter: { width, height }, ...metrics }, null, 2) + "\n",
    "utf8",
  );
  await page.screenshot({ path: path.join(evidenceRoot, `${label}-${width}x${height}.png`), fullPage: false });
}

async function capturePair(page: Page, label: string): Promise<void> {
  await capture(page, label, 720, 600);
  await capture(page, label, 1024, 720);
}

function initializeWorkspaceFixture(rootPath: string): void {
  const database = new DatabaseSync(path.join(rootPath, "workspace.sqlite"));
  const schemaSql = readFileSync(path.resolve("src/main/schema.sql"), "utf8");
  const now = "2026-10-02T00:00:00.000Z";
  try {
    database.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
    try {
      database.exec(schemaSql);
      database.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)").run("workspace.initialized_at", now);

      const insertCandidature = database.prepare(
        "INSERT INTO candidatures(id, archived, opportunity_research_selected, created_at, updated_at) VALUES (?, 0, 0, ?, ?)",
      );
      insertCandidature.run(richId, now, now);
      insertCandidature.run(rawId, "2026-10-01T18:00:00.000Z", "2026-10-01T18:00:00.000Z");

      const value = database.prepare(
        "INSERT INTO candidature_field_values(candidature_id, field_id, value_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      );
      value.run(richId, orgField, JSON.stringify("Northstar Labs"), now, now);
      value.run(richId, roleField, JSON.stringify("Platform Engineer"), now, now);
      value.run(richId, locationField, JSON.stringify("Spain · Remote"), now, now);
      value.run(
        richId,
        notesField,
        JSON.stringify("Discuss ownership, platform scope, and the distributed-team operating model."),
        now,
        now,
      );

      const source = database.prepare(
        "INSERT INTO candidature_sources(id, candidature_id, kind, title, url, source_text, created_at, updated_at) VALUES (?, ?, 'job_posting', ?, ?, ?, ?, ?)",
      );
      source.run(
        "00000000-0000-4000-8000-00000000e101",
        richId,
        "Platform Engineer — Northstar Labs",
        "https://example.test/northstar",
        "Northstar Labs seeks a Platform Engineer for developer infrastructure. TypeScript, PostgreSQL, observability, and distributed-team experience are useful. Remote within Spain.",
        now,
        now,
      );
      source.run(
        "00000000-0000-4000-8000-00000000e102",
        rawId,
        "",
        "",
        "Recruiter note: small climate-tech team hiring someone to own integrations and internal tooling. Barcelona or remote Spain. Conversation was informal; no structured role title was supplied.",
        "2026-10-01T18:00:00.000Z",
        "2026-10-01T18:00:00.000Z",
      );

      const tag = database.prepare(
        "INSERT INTO tags(id, name, definition, notes, aliases_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );
      tag.run(
        "00000000-0000-4000-8000-00000000e201",
        "Backend",
        "Backend and platform engineering work.",
        "Useful when infrastructure ownership is central.",
        JSON.stringify(["platform"]),
        now,
        now,
      );
      tag.run(
        "00000000-0000-4000-8000-00000000e202",
        "Remote",
        "Remote-friendly opportunity.",
        "",
        JSON.stringify(["distributed"]),
        now,
        now,
      );
      database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)").run(
        richId,
        "00000000-0000-4000-8000-00000000e201",
      );
      database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)").run(
        rawId,
        "00000000-0000-4000-8000-00000000e202",
      );

      const profile = database.prepare(
        "INSERT INTO profile_items(id, kind, title, subtitle, description, start_date, end_date, url, sort_order, ai_use_allowed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
      );
      profile.run(
        "00000000-0000-4000-8000-00000000e301",
        "identity",
        "Alex Morgan",
        "Software engineer",
        "Backend systems, developer tooling, and practical ML products.",
        null,
        null,
        null,
        0,
        now,
        now,
      );
      profile.run(
        "00000000-0000-4000-8000-00000000e302",
        "experience",
        "Software Engineer",
        "Example Cooperative",
        "Built TypeScript services, PostgreSQL data flows, and internal automation for distributed teams.",
        "2022",
        "2026",
        null,
        1,
        now,
        now,
      );
      profile.run(
        "00000000-0000-4000-8000-00000000e303",
        "skill",
        "Backend engineering",
        null,
        "TypeScript, Python, SQL, API design, testing, and observability.",
        null,
        null,
        null,
        2,
        now,
        now,
      );
      profile.run(
        "00000000-0000-4000-8000-00000000e304",
        "language",
        "English",
        "Professional working proficiency",
        null,
        null,
        null,
        null,
        3,
        now,
        now,
      );

      database.prepare(
        "UPDATE career_context SET career_direction = ?, objectives = ?, constraints_text = ?, target_roles = ?, target_markets_locations = ?, work_preferences = ?, application_writing_preferences = ?, updated_at = ? WHERE id = 1",
      ).run(
        "Backend/platform engineering.",
        "Find a product team with strong engineering ownership.",
        "Prefer Spain or remote EU roles.",
        "Backend Engineer; Platform Engineer",
        "Spain; Remote EU",
        "Pragmatic product teams.",
        "Concise, concrete, avoid inflated claims.",
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
  const appData = mkdtempSync(path.join(tmpdir(), "aaaat-plan5-app-data-"));
  for (const directory of [userData, path.join(appData, "AAAAT"), path.join(appData, "aaaat")]) {
    rememberWorkspace(directory, workspacePath);
  }
  return appData;
}

test("capture integrated PLAN5 rendered evidence without stopping at the first visual defect", async () => {
  mkdirSync(evidenceRoot, { recursive: true });

  const firstRoot = mkdtempSync(path.join(tmpdir(), "aaaat-plan5-first-"));
  const firstUserData = path.join(firstRoot, "user-data");
  const firstAppData = path.join(firstRoot, "app-data");
  mkdirSync(firstUserData);
  mkdirSync(firstAppData);
  let first: RunningApp | undefined;

  try {
    first = await startPackagedApp(firstUserData, firstAppData);
    await expect(first.page.getByRole("heading", { name: "Welcome to AAAAT" })).toBeVisible();
    await capturePair(first.page, "01-first-run");
  } finally {
    if (first) await stopPackagedApp(first);
    rmSync(firstRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }

  const root = mkdtempSync(path.join(tmpdir(), "aaaat-plan5-integrated-"));
  const workspace = path.join(root, "workspace");
  const userData = path.join(root, "user-data");
  mkdirSync(workspace);
  mkdirSync(userData);
  initializeWorkspaceFixture(workspace);
  const appData = prepareAppData(userData, workspace);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(userData, appData);
    const page = running.page;
    await expect(page.getByRole("region", { name: "Home", exact: true })).toBeVisible();

    const documentIds = await page.evaluate(async (applicationId) => {
      const working = await window.aaaat.documentDomain.createWorkingCv({
        title: "Evidence Working CV",
        candidatureId: applicationId,
        source: { kind: "profile" },
      });
      const letter = await window.aaaat.documentDomain.createLetter({
        candidatureId: applicationId,
        title: "Evidence application letter",
        bodyParagraphs: [
          "I am interested in the Platform Engineer role because it matches my backend and developer-tooling experience.",
          "My recent work includes TypeScript services, PostgreSQL workflows, and practical production automation.",
        ],
      });
      return { workingId: working.id, letterId: letter.id };
    }, richId);
    writeFileSync(path.join(evidenceRoot, "document-ids.json"), JSON.stringify(documentIds, null, 2) + "\n", "utf8");

    await page.reload();
    await expect(page.getByRole("region", { name: "Home", exact: true })).toBeVisible();
    await capturePair(page, "02-loaded-home");

    const tagVisor = page.getByRole("region", { name: "Tags glossary" });
    await tagVisor.getByLabel("Search Tags").fill("Backend");
    await tagVisor.getByRole("button", { name: "Backend", exact: true }).click();
    await capturePair(page, "03-tags-glossary");

    await page.getByRole("button", { name: "Applications", exact: true }).click();
    const applications = page.getByRole("region", { name: "Applications", exact: true });
    await expect(applications).toBeVisible();
    await expect(page.getByLabel("Application corpus")).toBeVisible();
    await capturePair(page, "04-applications-corpus");

    const search = applications.getByPlaceholder("Search fields, Sources and Tags…");
    await search.fill("Backend");
    await page.waitForTimeout(250);
    await capturePair(page, "05-applications-search");
    await search.fill("");
    await page.waitForTimeout(150);

    const richCard = page.locator(".candidature-corpus-card").filter({ hasText: "Northstar Labs" });
    await richCard.getByRole("button", { name: "Open saved application" }).click();
    await expect(page.getByRole("region", { name: "Application information", exact: true })).toBeVisible();
    await capturePair(page, "06-selected-application-rich");

    await page.getByRole("button", { name: "← Applications" }).click();
    const rawCard = page.locator(".candidature-corpus-card").filter({ hasText: "Retained source" }).first();
    await rawCard.getByRole("button", { name: "Open saved application" }).click();
    await expect(page.getByRole("region", { name: "Application information", exact: true })).toBeVisible();
    await capturePair(page, "07-selected-application-raw");

    await page.reload();
    await page.getByRole("button", { name: "Applications", exact: true }).click();
    await page.getByRole("button", { name: "New application" }).click();
    await expect(page.getByRole("region", { name: "New application", exact: true })).toBeVisible();
    await capturePair(page, "08-new-application-start");

    await page.getByRole("button", { name: /Enter information directly/ }).click();
    await expect(page.getByRole("form", { name: "Application information" })).toBeVisible();
    await capturePair(page, "09-new-application-direct");

    await page.reload();
    await page.getByRole("button", { name: "Applications", exact: true }).click();
    await page.getByRole("button", { name: "New application" }).click();
    await page.getByRole("button", { name: /Retain raw material/ }).click();
    const rawCapture = page.getByRole("region", { name: "Retain raw material", exact: true });
    await rawCapture.getByLabel("Application raw material").fill(
      "A small robotics company is hiring for systems integration work in Valencia. Recruiter asked for a concise CV and noted that remote days are possible.",
    );
    await rawCapture.getByRole("button", { name: "Retain raw material" }).click();
    await expect(page.getByRole("region", { name: "Raw material continuation", exact: true })).toBeVisible();
    await capturePair(page, "10-new-application-raw-continuation");

    await page.reload();
    await page.getByRole("button", { name: "My information", exact: true }).click();
    await expect(page.getByRole("region", { name: "My information", exact: true })).toBeVisible();
    await capturePair(page, "11-my-information");

    await page.getByRole("button", { name: "CVs", exact: true }).click();
    await expect(page.getByRole("region", { name: "CV and document work", exact: true })).toBeVisible();
    await capturePair(page, "12-documents-start");

    const continueCvs = page.locator('details[aria-label="Continue editing CVs"]');
    await expect(continueCvs).toHaveCount(1);
    await continueCvs.locator("summary").click();
    await page.getByRole("button", { name: /Evidence Working CV/ }).click();
    await expect(page.getByRole("region", { name: "Working CV", exact: true })).toBeVisible();
    await capturePair(page, "13-working-cv");

    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("region", { name: "Settings", exact: true })).toBeVisible();
    await capturePair(page, "14-settings-workspace");

    await page.getByRole("button", { name: "AI", exact: true }).click();
    await expect(page.getByRole("region", { name: "AI settings", exact: true })).toBeVisible();
    await capturePair(page, "15-settings-ai");

    writeFileSync(
      path.join(evidenceRoot, "surface-index.json"),
      JSON.stringify({
        candidate: "0a3ee56b13f2974ae6d1fe98c14f9d05c4c66a3e",
        sizes: [[720, 600], [1024, 720]],
        surfaces: [
          "first run",
          "loaded Home",
          "Tags glossary",
          "Applications corpus",
          "Applications search",
          "selected rich application",
          "selected raw-only application",
          "New application intentions",
          "direct entry",
          "raw retention continuation",
          "My information",
          "Documents collection",
          "Working CV",
          "Settings workspace",
          "Settings AI",
        ],
      }, null, 2) + "\n",
      "utf8",
    );
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(appData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
