import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "linux", "The packaged AI diagnostics journey runs once on Linux");

function packagedExecutable(): string {
  return path.resolve("out", `AAAAT-${process.platform}-${process.arch}`, "aaaat");
}

async function reservePort(): Promise<number> {
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
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-ai-diagnostics-home-"));
  const configPath = path.join(homePath, ".config");
  mkdirSync(configPath, { recursive: true });
  const escaped = workspacePath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  writeFileSync(path.join(configPath, "user-dirs.dirs"), `XDG_DOWNLOAD_DIR="${escaped}"\n`, "utf8");
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

interface CapturedRequest {
  readonly responseFormatName: string | null;
  readonly reasoningEffort: unknown;
  readonly enableThinking: unknown;
}

async function startValidationProvider(): Promise<{
  readonly server: Server;
  readonly endpoint: string;
  readonly requests: CapturedRequest[];
}> {
  const requests: CapturedRequest[] = [];
  let opportunityAttempts = 0;
  const server = createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
      response.writeHead(404).end();
      return;
    }
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        const payload = JSON.parse(body) as {
          readonly reasoning_effort?: unknown;
          readonly chat_template_kwargs?: { readonly enable_thinking?: unknown };
          readonly response_format?: { readonly json_schema?: { readonly name?: string } };
          readonly messages?: Array<{ readonly content?: string }>;
        };
        const responseFormatName = payload.response_format?.json_schema?.name ?? null;
        requests.push({
          responseFormatName,
          reasoningEffort: payload.reasoning_effort,
          enableThinking: payload.chat_template_kwargs?.enable_thinking,
        });
        const context = JSON.parse(payload.messages?.at(-1)?.content ?? "{}") as {
          readonly variants?: Array<{ readonly variantRef?: string }>;
          readonly items?: Array<{ readonly itemRef?: string }>;
        };

        let content: unknown;
        switch (responseFormatName) {
          case "aaaat_opportunity_review":
            opportunityAttempts += 1;
            content = opportunityAttempts === 1
              ? { summary: 42 }
              : {
                  summary: "Synthetic validation review.",
                  relevantEvidence: [],
                  uncertainties: [],
                  questions: [],
                };
            break;
          case "aaaat_job_extraction":
            content = { proposals: [], newFields: [] };
            break;
          case "aaaat_variant_recommendation":
            content = {
              variantRef: context.variants?.[0]?.variantRef,
              rationale: "Synthetic validation recommendation.",
            };
            break;
          case "aaaat_cv_tailoring":
            content = {
              recommendations: [{
                itemRef: context.items?.[0]?.itemRef,
                rationale: "Synthetic validation recommendation.",
              }],
            };
            break;
          case "aaaat_cover_letter_draft":
            content = {
              recipient: "",
              subject: "Validation",
              bodyParagraphs: ["Synthetic validation draft."],
              closing: "",
            };
            break;
          default:
            throw new Error(`Unexpected structured operation ${String(responseFormatName)}`);
        }

        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
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
  if (!address || typeof address === "string") throw new Error("Validation provider did not bind a port");
  return { server, endpoint: `http://127.0.0.1:${address.port}/v1`, requests };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("packaged Settings preserves an incompatible operation exchange while the connection remains usable", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-ai-diagnostics-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-ai-diagnostics-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  const provider = await startValidationProvider();
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByRole("heading", { name: "Turn a job offer into application documents." })).toBeVisible();

    await running.page.getByRole("button", { name: "Settings" }).click();
    const overview = running.page.getByRole("region", { name: "Settings overview" });
    await overview.getByRole("button", { name: /AI connections/ }).click();
    await running.page.getByRole("button", { name: "Add connection" }).click();
    await running.page.getByLabel("Connection name").fill("Qwen3 local validation");
    await running.page.getByLabel("Model").fill("Qwen3-8B-Q4_K_M");
    await running.page.getByLabel("Connection address").fill(provider.endpoint);
    await running.page.getByRole("button", { name: "Add connection", exact: true }).last().click();

    await expect(running.page.getByText("Qwen3 local validation", { exact: true })).toBeVisible();
    await running.page.getByRole("button", { name: "Validate AI capabilities" }).click();

    await expect(running.page.getByText("Connected", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(running.page.getByText("Incompatible · failed validation")).toBeVisible();
    await expect(running.page.getByText("5/6 ready")).toBeVisible();
    await expect(running.page.getByRole("button", { name: "Retry failed validation" })).toBeEnabled();

    const opportunity = running.page.locator(".ai-capability-entry").filter({ hasText: "Opportunity review" });
    await opportunity.getByText("Inspect AI exchange").click();
    await expect(opportunity.getByText("Operation:").locator("xpath=.." )).toContainText("Opportunity review");
    await expect(opportunity.getByText("Model:").locator("xpath=.." )).toContainText("Qwen3-8B-Q4_K_M");
    await expect(opportunity.getByText("Raw model response").locator("xpath=.." )).toContainText('{"summary":42}');
    await expect(opportunity.getByText("Why AAAAT rejected it").locator("xpath=.." )).toContainText(/summary|Expected string/i);
    await expect(opportunity.getByText("System instruction sent").locator("xpath=.." )).toContainText("Review one opportunity");
    await expect(opportunity.getByText("User/context payload sent").locator("xpath=.." )).toContainText("Validation opportunity");

    expect(provider.requests[0]).toMatchObject({
      responseFormatName: "aaaat_opportunity_review",
      reasoningEffort: "none",
      enableThinking: false,
    });

    await running.page.getByRole("button", { name: "Retry failed validation" }).click();
    await expect(running.page.getByText("6/6 ready")).toBeVisible({ timeout: 15_000 });
    await expect(running.page.getByText("AI ready.", { exact: false })).toBeVisible();
    await expect(opportunity).toContainText(/Ready/);
  } finally {
    if (running) await stopPackagedApp(running);
    await closeServer(provider.server);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
