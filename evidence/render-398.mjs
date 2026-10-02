import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "@playwright/test";

const output = path.resolve("evidence-output");
mkdirSync(output, { recursive: true });

function packagedExecutable() {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, process.platform === "win32" ? "aaaat.exe" : "aaaat");
}

async function reservePort() {
  const { createServer } = await import("node:net");
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("No debug port"));
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForDebugger(endpoint, child, stderr) {
  for (let i = 0; i < 120; i += 1) {
    if (child.exitCode !== null) throw new Error(`AAAAT exited early: ${stderr.value}`);
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`AAAAT did not expose CDP: ${stderr.value}`);
}

async function launchApp(userData, appData) {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const env = { ...process.env, GTK_USE_PORTAL: "0", HOME: appData, XDG_CONFIG_HOME: appData };
  const child = spawn(packagedExecutable(), [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`], {
    env,
    stdio: ["ignore", "ignore", "pipe"],
  });
  const stderr = { value: "" };
  child.stderr?.on("data", (chunk) => { stderr.value += chunk.toString(); });
  await waitForDebugger(endpoint, child, stderr);
  const browser = await chromium.connectOverCDP(endpoint);
  const page = browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("AAAAT opened no renderer page");
  return { child, browser, page };
}

async function stopApp(running) {
  await running.browser.close().catch(() => undefined);
  if (running.child.exitCode === null) {
    running.child.kill();
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
}

function rememberWorkspace(directory, workspacePath) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "workspace-settings.json"), JSON.stringify({ lastWorkspacePath: workspacePath }, null, 2) + "\n");
}

function prepareAppData(userData, workspacePath) {
  const appData = mkdtempSync(path.join(tmpdir(), "aaaat-evidence-appdata-"));
  rememberWorkspace(userData, workspacePath);
  rememberWorkspace(path.join(appData, "AAAAT"), workspacePath);
  rememberWorkspace(path.join(appData, "aaaat"), workspacePath);
  return appData;
}

function seedWorkspace(rootPath) {
  const db = new DatabaseSync(path.join(rootPath, "workspace.sqlite"));
  const schema = readFileSync(path.resolve("src/main/schema.sql"), "utf8");
  const now = new Date().toISOString();
  const org = "00000000-0000-4000-8000-000000000101";
  const role = "00000000-0000-4000-8000-000000000102";
  const location = "00000000-0000-4000-8000-000000000103";
  const compensation = "00000000-0000-4000-8000-000000000104";
  const notes = "00000000-0000-4000-8000-000000000106";

  db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
  try {
    db.exec(schema);
    db.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)").run("workspace.initialized_at", now);
    db.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)").run("workspace.demo", "1");

    const tagA = "30000000-0000-4000-8000-000000000001";
    const tagB = "30000000-0000-4000-8000-000000000002";
    const insertTag = db.prepare("INSERT INTO tags(id, name, definition, notes, aliases_json, created_at, updated_at) VALUES (?, ?, ?, '', '[]', ?, ?)");
    insertTag.run(tagA, "Remote", "Remote-friendly opportunity.", now, now);
    insertTag.run(tagB, "Backend", "Backend and platform engineering work.", now, now);

    const insertC = db.prepare("INSERT INTO candidatures(id, archived, opportunity_research_selected, created_at, updated_at) VALUES (?, 0, 0, ?, ?)");
    const insertV = db.prepare("INSERT INTO candidature_field_values(candidature_id, field_id, value_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
    const insertS = db.prepare("INSERT INTO candidature_sources(id, candidature_id, kind, title, url, source_text, created_at, updated_at) VALUES (?, ?, 'job_posting', ?, ?, ?, ?, ?)");
    const attach = db.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)");

    const orgs = ["Northstar Labs","Lumen Health","Aster Dynamics","Boreal Systems","Cinder Works","Deepfield Research","Eon Transit","Faro Robotics"];
    const roles = ["Platform Engineer","ML Product Engineer","Backend Engineer","Data Engineer","Systems Engineer","Developer Tools Engineer"];
    const locations = ["Spain · Remote","Barcelona · Hybrid","Madrid · Hybrid","Remote EU"];
    for (let i = 0; i < 24; i += 1) {
      const id = `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
      const sourceId = `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
      insertC.run(id, now, now);
      const rows = [
        [org, orgs[i % orgs.length]],
        [role, roles[i % roles.length]],
        [location, locations[i % locations.length]],
        [notes, i === 0 ? "Fictional evidence workspace. Recruiter screen expected next week." : `Follow up on team scope and ownership for opportunity ${i + 1}.`],
      ];
      if (i % 4 === 0) rows.push([compensation, `€${50 + i}k–€${62 + i}k`]);
      for (const [fieldId, value] of rows) insertV.run(id, fieldId, JSON.stringify(value), now, now);
      insertS.run(sourceId, id, `${roles[i % roles.length]} — ${orgs[i % orgs.length]}`, `https://example.test/${i + 1}`, `Retained opportunity source for ${orgs[i % orgs.length]} and ${roles[i % roles.length]}.`, now, now);
      attach.run(id, i % 2 === 0 ? tagA : tagB);
      if (i === 0) attach.run(id, tagB);
    }

    const profile = db.prepare("INSERT INTO profile_items(id, kind, title, subtitle, description, start_date, end_date, url, sort_order, ai_use_allowed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 1, ?, ?)");
    profile.run("40000000-0000-4000-8000-000000000001", "identity", "Alex Morgan", "Software engineer", "Backend systems, developer tooling and practical ML products.", 0, now, now);
    profile.run("40000000-0000-4000-8000-000000000002", "experience", "Software Engineer", "Example Cooperative", "Built TypeScript services, PostgreSQL data flows and internal automation used by distributed teams.", 1, now, now);
    profile.run("40000000-0000-4000-8000-000000000003", "education", "BSc Computer Science", "Example University", "Software engineering and distributed systems.", 2, now, now);
    profile.run("40000000-0000-4000-8000-000000000004", "skill", "Backend engineering", null, "TypeScript, Python, SQL, API design and observability.", 3, now, now);
    profile.run("40000000-0000-4000-8000-000000000005", "language", "English", "Professional working proficiency", null, 4, now, now);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

async function snap(page, name, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: path.join(output, name), fullPage: false });
}

async function click(page, role, name) {
  await page.getByRole(role, { name, exact: true }).click();
  await new Promise((r) => setTimeout(r, 450));
}

async function captureFirstRun() {
  const userData = mkdtempSync(path.join(tmpdir(), "aaaat-evidence-first-user-"));
  const appData = mkdtempSync(path.join(tmpdir(), "aaaat-evidence-first-app-"));
  const running = await launchApp(userData, appData);
  try {
    await snap(running.page, "01-first-run-wide.png");
    await snap(running.page, "02-first-run-constrained.png", 960, 700);
    try {
      await running.page.reload({ waitUntil: "commit", timeout: 5000 });
      await new Promise((r) => setTimeout(r, 40));
      await running.page.screenshot({ path: path.join(output, "03-startup-transient.png"), fullPage: false });
    } catch {}
  } finally {
    await stopApp(running);
    rmSync(userData, { recursive: true, force: true });
    rmSync(appData, { recursive: true, force: true });
  }
}

async function captureWorkspace() {
  const userData = mkdtempSync(path.join(tmpdir(), "aaaat-evidence-user-"));
  const workspace = mkdtempSync(path.join(tmpdir(), "aaaat-evidence-workspace-"));
  seedWorkspace(workspace);
  const appData = prepareAppData(userData, workspace);
  const running = await launchApp(userData, appData);
  const page = running.page;
  try {
    await snap(page, "10-home-wide.png");

    await click(page, "button", "Applications");
    await snap(page, "20-applications-corpus-wide.png");

    const inspect = page.locator('[aria-label^="Inspect saved application:"]').first();
    await inspect.click();
    await new Promise((r) => setTimeout(r, 350));
    await snap(page, "21-application-preselected-wide.png");

    await page.getByRole("button", { name: "Open / Edit", exact: true }).click();
    await new Promise((r) => setTimeout(r, 350));
    await snap(page, "22-application-selected-wide.png");

    await click(page, "button", "My information");
    await snap(page, "30-my-information-wide.png");

    await click(page, "button", "CVs");
    await snap(page, "40-cvs-wide.png");
    await page.getByRole("button", { name: "＋ New CV", exact: true }).click();
    await new Promise((r) => setTimeout(r, 500));
    await snap(page, "41-working-cv-wide.png");

    await click(page, "button", "Settings");
    await snap(page, "50-settings-wide.png");

    await click(page, "button", "Applications");
    await snap(page, "60-applications-constrained.png", 960, 700);
    const inspectConstrained = page.locator('[aria-label^="Inspect saved application:"]').first();
    await inspectConstrained.click();
    await new Promise((r) => setTimeout(r, 350));
    await snap(page, "61-application-preselected-constrained.png", 960, 700);

    await click(page, "button", "CVs");
    const cvCard = page.locator(".working-cv-document-card").first();
    if (await cvCard.count()) {
      await cvCard.click();
      await new Promise((r) => setTimeout(r, 350));
      await snap(page, "62-working-cv-constrained.png", 960, 700);
    }
  } finally {
    await stopApp(running);
    rmSync(userData, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
    rmSync(appData, { recursive: true, force: true });
  }
}

await captureFirstRun();
await captureWorkspace();
console.log("Rendered evidence saved to", output);
