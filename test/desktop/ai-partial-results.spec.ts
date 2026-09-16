import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

test.skip(process.platform !== "linux", "The packaged partial-result journey runs once on Linux");

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
    if (attempt === 99) {
      throw new Error(`Packaged AAAAT did not expose its test endpoint: ${processError}`);
    }
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
  const homePath = mkdtempSync(path.join(tmpdir(), "aaaat-partial-home-"));
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

interface PartialProvider {
  readonly server: Server;
  readonly endpoint: string;
  readonly realExtractionRequests: string[][];
}

async function startPartialProvider(): Promise<PartialProvider> {
  const realExtractionRequests: string[][] = [];
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
          readonly response_format?: { readonly json_schema?: { readonly name?: string } };
          readonly messages?: Array<{ readonly role?: string; readonly content?: string }>;
        };
        const responseFormatName = payload.response_format?.json_schema?.name ?? null;
        const userText = payload.messages?.find((message) => message.role === "user")?.content ?? "{}";
        const context = JSON.parse(userText) as {
          readonly sourceTitle?: string;
          readonly fields?: Array<{
            readonly fieldRef: string;
            readonly label: string;
          }>;
          readonly variants?: Array<{ readonly variantRef?: string }>;
          readonly items?: Array<{ readonly itemRef?: string }>;
        };

        let content: unknown;
        switch (responseFormatName) {
          case "aaaat_opportunity_review":
            content = {
              summary: "Synthetic validation review.",
              relevantEvidence: [],
              uncertainties: [],
              questions: [],
            };
            break;
          case "aaaat_job_extraction": {
            if (context.sourceTitle === "AAAAT capability validation") {
              content = { proposals: [], newFields: [] };
              break;
            }
            const fields = context.fields ?? [];
            const labels = fields.map((field) => field.label);
            realExtractionRequests.push(labels);
            const ref = (label: string) =>
              fields.find((field) => field.label === label)?.fieldRef ?? "";
            const ambiguous = "Ambiguous location partial acceptance";
            const conflict = "Existing conflict partial acceptance";
            if (labels.length === 1 && labels[0] === ambiguous) {
              content = { proposals: [{ fieldRef: ref(ambiguous), value: "Madrid" }], newFields: [] };
              break;
            }
            if (labels.length === 1 && labels[0] === conflict) {
              content = { proposals: [{ fieldRef: ref(conflict), value: "AI replacement" }], newFields: [] };
              break;
            }
            content = {
              proposals: [
                { fieldRef: ref("Idiomas partial acceptance"), value: "English" },
                { fieldRef: ref("Sibling partial acceptance"), value: "Preserved sibling" },
                { fieldRef: ref(ambiguous), value: ["Madrid", "Barcelona"] },
                { fieldRef: "aaaat_stale_partial_acceptance", value: "stale" },
              ],
              newFields: [
                {
                  label: "Malformed discovered information",
                  description: "Deliberately incompatible new field.",
                  valueType: "text",
                  cardinality: "one",
                  choices: ["not valid for text"],
                  value: "x",
                },
              ],
            };
            break;
          }
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
        response.end(
          JSON.stringify({ error: reason instanceof Error ? reason.message : "invalid request" }),
        );
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Partial-result provider did not bind a port");
  }
  return {
    server,
    endpoint: `http://127.0.0.1:${address.port}/v1`,
    realExtractionRequests,
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("packaged candidature AI keeps partial results from an imperfect OpenAI-compatible loopback model", async () => {
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-partial-user-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-partial-workspace-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  const provider = await startPartialProvider();
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
    await running.page.getByLabel("Connection name").fill("Partial-result local model");
    await running.page.getByLabel("Model").fill("small-local-model");
    await running.page.getByLabel("Connection address").fill(provider.endpoint);
    await running.page.getByRole("button", { name: "Add connection", exact: true }).last().click();
    await running.page.getByRole("button", { name: "Validate AI capabilities" }).click();
    await expect(running.page.getByText("6/6 ready")).toBeVisible({ timeout: 15_000 });

    const seeded = await running.page.evaluate(async () => {
      const makeField = async (label: string, cardinality: "one" | "many") => {
        const created = await window.aaaat.candidatures.createField({
          label,
          description: `${label} packaged acceptance field.`,
          valueType: "text",
          cardinality,
          choices: [],
          enabled: true,
        });
        await window.aaaat.candidatures.updateFieldPreferences({
          ...created.preferences,
          fieldId: created.definition.id,
          aiDiscovery: true,
          aiContextMode: "expose",
        });
        return created.definition.id;
      };
      const languagesId = await makeField("Idiomas partial acceptance", "many");
      const siblingId = await makeField("Sibling partial acceptance", "one");
      const ambiguousId = await makeField("Ambiguous location partial acceptance", "one");
      const conflictId = await makeField("Existing conflict partial acceptance", "one");
      const candidature = await window.aaaat.candidatures.create({
        source: {
          kind: "job_posting",
          title: "Partial result packaged acceptance",
          url: "https://example.invalid/partial-acceptance",
          sourceText: "English is required. The role has useful sibling information and location wording.",
        },
        values: [{ fieldId: conflictId, value: "Keep me" }],
      });
      return { candidatureId: candidature.id, languagesId, siblingId, ambiguousId, conflictId };
    });

    const primary = running.page.getByRole("navigation", { name: "Primary work areas" });
    await primary.getByRole("button", { name: "CV & cover letter" }).click();
    await primary.getByRole("button", { name: "Applications" }).click();
    const search = running.page.getByRole("searchbox", { name: "Search" });
    await search.fill("Partial result packaged acceptance");
    await running.page.getByRole("button", { name: "Full record" }).click();
    const complete = running.page.getByRole("region", { name: "Complete candidature" });
    await expect(complete).toBeVisible();

    await complete.getByRole("button", { name: "Ask AI to fill missing information" }).click();
    await expect(complete.getByText(/2 fields filled · 3 need review/i)).toBeVisible({ timeout: 15_000 });

    const fieldCard = (label: string) =>
      complete.getByRole("heading", { name: label }).locator("xpath=ancestor::article[1]");
    const languagesCard = fieldCard("Idiomas partial acceptance");
    const siblingCard = fieldCard("Sibling partial acceptance");
    const ambiguousCard = fieldCard("Ambiguous location partial acceptance");
    const conflictCard = fieldCard("Existing conflict partial acceptance");

    await expect(languagesCard.getByText("English", { exact: true })).toBeVisible();
    await expect(siblingCard.getByText("Preserved sibling", { exact: true })).toBeVisible();
    await expect(ambiguousCard.getByText("AI suggestion needs review")).toBeVisible();
    await expect(ambiguousCard.getByText(/Madrid, Barcelona/)).toBeVisible();
    await expect(ambiguousCard.getByText(/accepts one value, but AI proposed 2/i)).toBeVisible();

    const taskStatus = running.page.locator("details.shell-ai-task-status");
    await taskStatus.locator(":scope > summary").click();
    const bulkTask = taskStatus.locator("article.shell-ai-task").filter({ hasText: "Fill missing information" });
    await bulkTask.getByText("Inspect AI exchange").click();
    await expect(bulkTask.getByText("Raw model response").locator("xpath=.." )).toContainText("English");
    await expect(bulkTask.getByText("Raw model response").locator("xpath=.." )).toContainText("aaaat_stale_partial_acceptance");
    await expect(bulkTask.getByText("Provider contract detail").locator("xpath=.." )).toContainText(/choices|Broken|Malformed|text/i);

    await ambiguousCard.getByRole("button", { name: "Retry this field" }).click();
    await expect(ambiguousCard.getByText("Madrid", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(languagesCard.getByText("English", { exact: true })).toBeVisible();
    await expect(siblingCard.getByText("Preserved sibling", { exact: true })).toBeVisible();

    await conflictCard.getByRole("button", { name: "Ask AI to fill Existing conflict partial acceptance" }).click();
    await expect(conflictCard.getByText("AI found another value")).toBeVisible({ timeout: 15_000 });
    await expect(conflictCard.getByText("Keep me", { exact: true })).toBeVisible();
    await expect(conflictCard.getByText("AI replacement", { exact: true })).toBeVisible();

    expect(provider.realExtractionRequests).toHaveLength(3);
    expect(provider.realExtractionRequests[0]).toContain("Idiomas partial acceptance");
    expect(provider.realExtractionRequests[0]).toContain("Sibling partial acceptance");
    expect(provider.realExtractionRequests[0]).toContain("Ambiguous location partial acceptance");
    expect(provider.realExtractionRequests[0]).not.toContain("Existing conflict partial acceptance");
    expect(provider.realExtractionRequests[1]).toEqual(["Ambiguous location partial acceptance"]);
    expect(provider.realExtractionRequests[2]).toEqual(["Existing conflict partial acceptance"]);

    const retained = await running.page.evaluate(async ({ candidatureId }) => {
      const records = await window.aaaat.candidatures.list();
      return records.find((record) => record.id === candidatureId)?.values ?? [];
    }, { candidatureId: seeded.candidatureId });
    expect(retained).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: seeded.languagesId, value: ["English"] }),
        expect.objectContaining({ fieldId: seeded.siblingId, value: "Preserved sibling" }),
        expect.objectContaining({ fieldId: seeded.ambiguousId, value: "Madrid" }),
        expect.objectContaining({ fieldId: seeded.conflictId, value: "Keep me" }),
      ]),
    );
  } finally {
    if (running) await stopPackagedApp(running);
    await closeServer(provider.server);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
