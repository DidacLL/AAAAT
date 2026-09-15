import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "linux", "The packaged local-AI recovery journey runs once on Linux");

function packagedExecutable(): string {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, "aaaat");
}

async function reservePort(): Promise<number> {
  const { createServer: createNetServer } = await import("node:net");
  return new Promise((resolve, reject) => {
    const server = createNetServer();
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
      },
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
    spawnSync("kill", ["-9", String(running.child.pid)], { timeout: 5_000 });
  }
}

function prepareLinuxChooserHome(workspacePath: string): string {
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-owner-ai-home-"));
  const configPath = path.join(homePath, ".config");
  mkdirSync(configPath, { recursive: true });
  const escaped = workspacePath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  writeFileSync(
    path.join(configPath, "user-dirs.dirs"),
    `XDG_DOWNLOAD_DIR="${escaped}"\n`,
    "utf8",
  );
  return homePath;
}

function chooseLinuxDirectory(): void {
  spawnSync(
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

async function createWorkspace(running: RunningApp): Promise<void> {
  await running.page.getByRole("button", { name: "Create workspace" }).click();
  chooseLinuxDirectory();
  await expect(running.page.getByRole("heading", { name: "Candidatures", exact: true })).toBeVisible();
}

interface ProviderContext {
  readonly fields?: Array<{ readonly fieldRef?: string; readonly label?: string }>;
}

async function startSlowProvider(): Promise<{ server: Server; endpoint: string }> {
  let requestCount = 0;
  const server = createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
      response.writeHead(404).end();
      return;
    }

    requestCount += 1;
    const thisRequest = requestCount;
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        const payload = JSON.parse(body) as {
          readonly messages?: Array<{ readonly content?: string }>;
        };
        const userMessage = payload.messages?.at(-1)?.content ?? "{}";
        const context = JSON.parse(userMessage) as ProviderContext;
        const organisation = context.fields?.find((field) => field.label === "Organisation");
        if (!organisation?.fieldRef) throw new Error("Organisation discovery field was not supplied");
        const content = JSON.stringify({
          proposals: [{ fieldRef: organisation.fieldRef, value: "Aster Aviation" }],
          newFields: [{
            label: "Base airport",
            description: "Primary operating base stated in the offer.",
            valueType: "text",
            cardinality: "one",
            choices: [],
            value: "Madrid Barajas",
          }],
        });
        const timer = setTimeout(() => {
          if (response.destroyed) return;
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ choices: [{ message: { content } }] }));
        }, thisRequest === 1 ? 20_000 : 1_200);
        timer.unref();
        response.once("close", () => clearTimeout(timer));
      } catch (reason) {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: reason instanceof Error ? reason.message : "invalid request" }));
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Slow provider did not bind a port");
  return { server, endpoint: `http://127.0.0.1:${address.port}/v1` };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("packaged candidature cancels slow local AI then auto-fills safe information", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-owner-ai-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-owner-ai-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  const provider = await startSlowProvider();
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await createWorkspace(running);

    const connectionId = "00000000-0000-4000-8000-00000000a901";
    writeFileSync(
      path.join(ownedWorkspace, "ai-connection.json"),
      `${JSON.stringify({
        version: 4,
        connections: [{
          id: connectionId,
          name: "Slow local test model",
          endpoint: provider.endpoint,
          model: "slow-local",
          validatedOperations: ["job_extraction"],
        }],
        defaultConnectionId: connectionId,
        operationDefaults: { job_extraction: connectionId },
      }, null, 2)}\n`,
      "utf8",
    );

    const ids = await running.page.evaluate(async () => {
      const fields = await window.aaaat.candidatures.listFields();
      const role = fields.find((field) => field.definition.label === "Role");
      const organisation = fields.find((field) => field.definition.label === "Organisation");
      if (!role || !organisation) throw new Error("Expected shipped candidature information");
      const candidature = await window.aaaat.candidatures.create({
        source: {
          kind: "job_posting",
          title: "Aster vacancy",
          url: "https://example.invalid/aster",
          sourceText: "Aster Aviation seeks a Captain based at Madrid Barajas.",
        },
        values: [{ fieldId: role.definition.id, value: "Captain" }],
      });
      return {
        candidatureId: candidature.id,
        organisationId: organisation.definition.id,
        roleId: role.definition.id,
      };
    });

    await running.page.reload();
    await expect(running.page.getByRole("heading", { name: "Candidatures", exact: true })).toBeVisible();

    const corpus = running.page.getByLabel("Candidature corpus Focus");
    let card = corpus.locator(".candidature-corpus-card").filter({ hasText: "Captain" }).first();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "All details" }).click();

    let complete = running.page.getByRole("region", { name: "Complete candidature" });
    await expect(complete.getByRole("heading", { name: "Work arrangement" })).toBeVisible();

    await complete.getByRole("button", { name: "Add information" }).click();
    const addInformation = complete.getByRole("form", { name: "Add information" });
    await addInformation.getByLabel("Name").fill("Notice period");
    await addInformation.getByRole("button", { name: "Add", exact: true }).click();
    await expect(complete.getByRole("heading", { name: "Notice period" })).toBeVisible();

    await complete.getByRole("button", { name: "Ask AI to fill missing information" }).click();
    await expect(running.page.getByText(/AI tasks · 1 working/)).toBeVisible();

    const taskRail = running.page.locator("details.shell-ai-task-status");
    await taskRail.getByRole("button", { name: "Cancel" }).click();
    await expect(taskRail.locator("summary")).toContainText("cancelled");
    await taskRail.locator("summary").click();
    await taskRail.getByRole("button", { name: "Dismiss" }).click();

    await expect(running.page.getByText(/AI tasks · 1 working/)).toBeVisible();

    const roleCard = complete.getByRole("heading", { name: "Role" }).locator("xpath=ancestor::article[1]");
    await roleCard.getByRole("button", { name: "Edit Role" }).click();
    await roleCard.getByLabel("Value").fill("Senior Captain");
    await roleCard.getByRole("button", { name: "Save" }).click();
    await expect(roleCard.getByText("Senior Captain", { exact: true })).toBeVisible();

    await complete.getByRole("button", { name: "Back", exact: true }).click();
    await expect(corpus).toBeVisible();
    await expect(running.page.getByText(/AI tasks · 1 working/)).toBeVisible();

    await expect(running.page.getByText(/AI tasks · 1 completed/)).toBeVisible({ timeout: 10_000 });
    card = corpus.locator(".candidature-corpus-card").filter({ hasText: "Senior Captain" }).first();
    await card.getByRole("button", { name: "All details" }).click();
    complete = running.page.getByRole("region", { name: "Complete candidature" });

    const organisationCard = complete.getByRole("heading", { name: "Organisation" }).locator("xpath=ancestor::article[1]");
    await expect(organisationCard.getByText("Aster Aviation", { exact: true })).toBeVisible();
    await expect(organisationCard.getByText(/AI filled/)).toBeVisible();

    const newFieldCard = complete.getByRole("heading", { name: "Base airport" }).locator("xpath=ancestor::article[1]");
    await expect(newFieldCard.getByText("Madrid Barajas", { exact: true })).toBeVisible();
    await expect(newFieldCard.getByText(/AI filled/)).toBeVisible();

    const retainedValues = await running.page.evaluate(async ({ candidatureId, organisationId, roleId }) => {
      const record = (await window.aaaat.candidatures.list()).find((candidate) => candidate.id === candidatureId);
      const fields = await window.aaaat.candidatures.listFields();
      const baseAirport = fields.find((field) => field.definition.label === "Base airport");
      return {
        organisation: record?.values.find((value) => value.fieldId === organisationId)?.value ?? null,
        role: record?.values.find((value) => value.fieldId === roleId)?.value ?? null,
        baseAirport: baseAirport
          ? record?.values.find((value) => value.fieldId === baseAirport.definition.id)?.value ?? null
          : null,
      };
    }, ids);
    expect(retainedValues).toEqual({
      organisation: "Aster Aviation",
      role: "Senior Captain",
      baseAirport: "Madrid Barajas",
    });

    await expect(complete.getByRole("region", { name: "Documents" })).toBeVisible();
    await running.page.getByRole("button", { name: "Documents", exact: true }).click();
    await expect(running.page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
    await expect(running.page.getByLabel("Use information from")).toHaveValue("");

    await running.page.getByRole("button", { name: "My information", exact: true }).click();
    await expect(running.page.getByRole("heading", { name: "My information", exact: true })).toBeVisible();
  } finally {
    if (running) await stopPackagedApp(running);
    await closeServer(provider.server);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
