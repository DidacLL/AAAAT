import { spawn } from "node:child_process";
import { existsSync, readdirSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import process, { stdin, stderr, stdout } from "node:process";
import { URL } from "node:url";
import { journeyScenarios } from "../test/ai-eval/catalog.mjs";

const modeFiles = Object.freeze({
  direct: "test/ai-eval/direct-ai.eval.test.ts",
  chat: "test/ai-eval/external-chat.eval.test.ts",
  mcp: "test/ai-eval/mcp-agent.eval.test.ts",
  host: "test/ai-eval/llama-host.eval.test.ts",
});

const modeSets = Object.freeze({
  direct: ["direct"],
  chat: ["chat"],
  mcp: ["mcp"],
  host: ["host"],
  core: ["direct", "chat", "mcp"],
  external: ["chat", "mcp", "host"],
  all: ["direct", "chat", "mcp", "host"],
});

function required(value, label) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(label + " is required.");
  return trimmed;
}

function integer(value, fallback, minimum, maximum, label) {
  const parsed = value.trim() ? Number(value) : fallback;
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      label + " must be an integer between " + minimum + " and " + maximum + ".",
    );
  }
  return parsed;
}

async function question(prompt, fallback = "") {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const value = (await rl.question(prompt)).trim();
    return value || fallback;
  } finally {
    rl.close();
  }
}

async function askSecret(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return question(prompt);
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const previousRaw = stdin.isRaw;
    const previousEncoding = stdin.readableEncoding;
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(Boolean(previousRaw));
      if (previousEncoding) stdin.setEncoding(previousEncoding);
      else stdin.setEncoding(null);
      stdin.pause();
    };
    const finish = () => {
      stdout.write("\n");
      cleanup();
      resolve(value.trim());
    };
    const onData = (chunk) => {
      const text = String(chunk);
      for (const character of text) {
        if (character === "\u0003") {
          stdout.write("\n");
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          value += character;
          stdout.write("*");
        }
      }
    };

    stdout.write(prompt);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

async function chooseMode() {
  const supplied = argument("--mode");
  if (supplied) {
    if (!(supplied in modeSets)) throw new Error("Unknown evaluation mode: " + supplied);
    return supplied;
  }
  stdout.write("Modes: 1 All, 2 Core, 3 External, 4 Direct, 5 Chat, 6 MCP, 7 Packaged llama-host\n");
  const selection = await question("Selection [1]: ", "1");
  const mode = { "1": "all", "2": "core", "3": "external", "4": "direct", "5": "chat", "6": "mcp", "7": "host" }[selection];
  if (!mode) throw new Error("Invalid mode.");
  return mode;
}

function catalogFor(mode) {
  return journeyScenarios[mode === "host" ? "mcp" : mode];
}
async function chooseJourneys(modes) {
  const journeys = [...new Set(modes.flatMap(mode => catalogFor(mode).map(item => item.journey)))];
  stdout.write("\nAvailable journeys (scenario counts come from the catalog):\n");
  journeys.forEach((journey, index) => {
    const count = catalogFor(modes.find(mode => catalogFor(mode).some(item => item.journey === journey))).filter(item => item.journey === journey).length;
    stdout.write("  " + (index + 1) + ". " + journey + " (" + count + " scenarios)\n");
  });
  const answer = argument("--journeys") || await question("Journey numbers or names, comma-separated [all]: ", "all");
  if (answer === "all") return journeys;
  const selected = answer.split(",").map(s => s.trim()).map(s => Number.isInteger(Number(s)) && Number(s) > 0 ? journeys[Number(s) - 1] : s);
  if (selected.some(s => !journeys.includes(s))) throw new Error("Unknown selected journey.");
  return [...new Set(selected)];
}
async function modelConnections() {
  if (process.env.AAAAT_AI_EVAL_CONNECTIONS_JSON) {
    const result = JSON.parse(process.env.AAAAT_AI_EVAL_CONNECTIONS_JSON);
    if (!Array.isArray(result) || result.length === 0) throw new Error("Connections JSON must contain a non-empty array.");
    return result.map((item, index) => {
      const endpoint = new URL(required(String(item.endpoint ?? ""), "Endpoint"));
      if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash)
        throw new Error("Use plain OpenAI-compatible endpoints without URL credentials or query strings.");
      return { name: String(item.name || "Model " + (index + 1)), endpoint: endpoint.toString().replace(/\/$/u, ""), model: required(String(item.model || ""), "Model"), credential: String(item.credential || "") };
    });
  }
  const models = [];
  do {
    stdout.write("\nModel connection " + (models.length + 1) + "\n");
    const name = await question("Local label [Model " + (models.length + 1) + "]: ", "Model " + (models.length + 1));
    const connection = await normalConnection();
    models.push({ name, ...connection });
  } while ((await question("Add another model connection? [y/N]: ", "n")).toLowerCase() === "y");
  return models;
}
function redact(text, credentials) {
  let cleaned = String(text).replace(/authorization\s*[:=]\s*bearer\s+[^\s"'\\]+/giu, "Authorization: [REDACTED]");
  for (const credential of credentials) if (credential) cleaned = cleaned.split(credential).join("[REDACTED]");
  return cleaned;
}
function countStatuses(trials) {
  const counts = { pass: 0, weak: 0, fail: 0, error: 0 };
  for (const trial of trials) if (Object.hasOwn(counts, trial.status)) counts[trial.status]++;
  return counts;
}
function writeSummary(reportDir, models, modes, journeys, repetitions, records) {
  const matrix = [], harnessFailures = [], all = [], perModel = new Map(), across = new Map();
  for (const record of records) {
    const file = path.join(reportDir, record.key + ".json");
    let trials = [];
    if (existsSync(file)) {
      try { trials = JSON.parse(readFileSync(file, "utf8")).trials ?? []; }
      catch { harnessFailures.push({ model: record.model, mode: record.mode, failure: "Invalid evidence JSON" }); }
    }
    if (record.exitCode !== 0 || !existsSync(file))
      harnessFailures.push({ model: record.model, mode: record.mode, failure: record.failure || "Harness exit " + record.exitCode, evidenceFile: existsSync(file) ? file : null });
    for (const scenario of catalogFor(record.mode).filter(s => journeys.includes(s.journey))) {
      const current = trials.filter(t => t.scenarioId === scenario.id);
      if (current.length !== repetitions)
        harnessFailures.push({model:record.model,mode:record.mode,
          failure:"Missing trial evidence: " + scenario.id + " (" + current.length + "/" + repetitions + ")" });
      matrix.push({
        model: record.model, mode: record.mode, journey: scenario.journey, scenario: scenario.id,
        scenarioClass: scenario.scenarioClass, repetitions: current.length, expectedRepetitions: repetitions,
        ...countStatuses(current), elapsedMs: current.reduce((sum,t) => sum + t.elapsedMs, 0),
        evidenceFile: existsSync(file) ? file : null,
      });
    }
    for (const trial of trials) {
      all.push({ ...trial, model: record.model, mode: record.mode });
      for (const check of trial.checks ?? []) if (!check.passed) {
        const key = record.model + " / " + check.name;
        perModel.set(key, (perModel.get(key) || 0) + 1);
        across.set(check.name, (across.get(check.name) || 0) + 1);
      }
    }
  }
  const named = models.map((m,i) => {
    const name=m.name+" ["+m.model+" #"+(i+1)+"]";
    return {name,endpoint:m.endpoint,model:m.model,
      ...countStatuses(all.filter(t=>t.model===name))};
  });
  const ranked = map => [...map].sort((a,b) => b[1] - a[1]).map(([name,count]) => ({ name,count }));
  const summary = {
    generatedAt: new Date().toISOString(), models: named, modes, journeys, repetitions, matrix,
    failedChecksByModel: ranked(perModel), failedChecksAcrossModels: ranked(across),
    harnessFailures, evidenceDirectory: reportDir,
  };
  writeFileSync(path.join(reportDir, "run.json"), JSON.stringify(summary, null, 2) + "\n");
  const lines = ["# AAAAT real-model comparison", "",
    "A model miss is evidence, not a test-harness failure.", "",
    "| Model | Endpoint | Pass | Weak | Fail | Error |", "| --- | --- | ---: | ---: | ---: | ---: |"];
  for (const m of named) lines.push("| " + m.name + " (" + m.model + ") | " + m.endpoint + " | " + m.pass + " | " + m.weak + " | " + m.fail + " | " + m.error + " |");
  lines.push("", "## Scenario matrix", "",
    "| Model | Mode | Journey | Scenario | Class | Repeats | Pass | Weak | Fail | Error | Seconds |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const r of matrix) lines.push("| " + r.model + " | " + r.mode + " | " + r.journey + " | " + r.scenario + " | " + r.scenarioClass + " | " + r.repetitions + "/" + r.expectedRepetitions + " | " + r.pass + " | " + r.weak + " | " + r.fail + " | " + r.error + " | " + (r.elapsedMs / 1000).toFixed(1) + " |");
  lines.push("", "## Recurrent checks across models", "", ...summary.failedChecksAcrossModels.map(s => "- " + s.count + "x " + s.name));
  lines.push("", "## Recurrent checks by model", "", ...summary.failedChecksByModel.map(s => "- " + s.count + "x " + s.name));
  lines.push("", "## Harness/configuration failures", "",
    ...(harnessFailures.length ? harnessFailures.map(f => "- " + f.model + " / " + f.mode + ": " + f.failure) : ["None."]));
  lines.push("", "## Detailed evidence", "", "See the individual model-NN-mode.json/.md files in " + reportDir, "");
  writeFileSync(path.join(reportDir, "summary.md"), lines.join("\n"));
  return summary;
}

async function run(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    ...options,
  });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (status) => resolve(status ?? 1));
  });
}

async function runNpm(args) {
  const npmCli = process.env.npm_execpath?.trim();
  if (npmCli && existsSync(npmCli)) {
    return run(process.execPath, [npmCli, ...args]);
  }
  if (process.platform === "win32") {
    throw new Error(
      "Cannot locate npm's JavaScript CLI entrypoint. Run the evaluator through npm run eval:ai.",
    );
  }
  return run("npm", args);
}

function packagedExecutable() {
  const root = path.resolve("out", "AAAAT-" + process.platform + "-" + process.arch);
  if (!existsSync(root)) return null;
  if (process.platform === "darwin") {
    const bundle = readdirSync(root).find((entry) => entry.endsWith(".app"));
    if (!bundle) return null;
    const directory = path.join(root, bundle, "Contents", "MacOS");
    if (!existsSync(directory)) return null;
    const executable = readdirSync(directory)[0];
    return executable ? path.join(directory, executable) : null;
  }
  const candidate = path.join(
    root,
    process.platform === "win32" ? "aaaat.exe" : "aaaat",
  );
  return existsSync(candidate) ? candidate : null;
}

async function ensurePackagedExecutable() {
  const supplied = process.env.AAAAT_PACKAGED_EXECUTABLE?.trim();
  if (supplied) return supplied;
  let executable = packagedExecutable();
  if (executable) return executable;

  const answer = (await question(
    "A packaged AAAAT executable is required for the real local-host fixture. Build it now? [Y/n]: ",
    "y",
  )).toLocaleLowerCase();
  if (answer !== "y" && answer !== "yes") {
    throw new Error("Real local-host evaluation needs a packaged AAAAT executable.");
  }
  const code = await runNpm(["run", "package"]);
  if (code !== 0) throw new Error("AAAAT packaging failed.");
  executable = packagedExecutable();
  if (!executable) throw new Error("AAAAT packaged executable was not found after packaging.");
  return executable;
}

async function normalConnection() {
  const defaultEndpoint = process.env.AAAAT_AI_EVAL_ENDPOINT?.trim() ?? "";
  const defaultModel = process.env.AAAAT_AI_EVAL_MODEL?.trim() ?? "";
  const endpoint = required(
    await question(
      "OpenAI-compatible base URL" +
        (defaultEndpoint ? " [" + defaultEndpoint + "]" : "") +
        ": ",
      defaultEndpoint,
    ),
    "Endpoint",
  );
  new URL(endpoint);
  const model = required(
    await question(
      "Model name" + (defaultModel ? " [" + defaultModel + "]" : "") + ": ",
      defaultModel,
    ),
    "Model",
  );
  const credential =
    process.env.AAAAT_AI_EVAL_CREDENTIAL?.trim() ??
    await askSecret("API key / Bearer credential (optional): ");
  return { endpoint, model, credential };
}

async function runVitest(file, environment) {
  const vitestEntrypoint = path.resolve("node_modules", "vitest", "vitest.mjs");
  if (!existsSync(vitestEntrypoint)) {
    throw new Error(
      "Local Vitest entrypoint was not found. Run npm ci before the evaluator.",
    );
  }
  return run(
    process.execPath,
    [
      vitestEntrypoint,
      "run",
      file,
      "--reporter=verbose",
      "--testTimeout=14400000",
    ],
    {
      env: {
        ...process.env,
        ...environment,
      },
    },
  );
}

async function main() {
  stdout.write("\nAAAAT multi-model local AI journey evaluation\n");
  const mode = await chooseMode();
  const selected = modeSets[mode];
  const journeys = await chooseJourneys(selected);
  const models = await modelConnections();
  const repetitions = integer(
    argument("--repetitions") || await question("Repetitions per scenario [" + (process.env.AAAAT_AI_EVAL_REPETITIONS || "3") + "]: ", process.env.AAAAT_AI_EVAL_REPETITIONS || "3"),
    3, 1, 20, "Repetitions"
  );
  const timeoutSeconds = integer(
    await question("Maximum seconds per model request [" + (process.env.AAAAT_AI_EVAL_TIMEOUT_SECONDS || "120") + "]: ", process.env.AAAAT_AI_EVAL_TIMEOUT_SECONDS || "120"),
    120, 10, 900, "Timeout"
  );
  const scenarios = selected.flatMap(item => catalogFor(item).filter(s => journeys.includes(s.journey)));
  if (!scenarios.length) throw new Error("Selection contains no scenarios.");
  let packaged = "", packagingFailure = "";
  if (selected.includes("host")) {
    try { packaged = await ensurePackagedExecutable(); }
    catch (reason) {
      packagingFailure = redact(reason instanceof Error ? reason.message : String(reason),
        models.map(m => m.credential));
      stderr.write("Packaged AAAAT setup failed: " + packagingFailure + "\n");
    }
  }
  const runId = new Date().toISOString().replace(/[:.]/gu, "-");
  const reportDir = path.resolve("ai-eval-results", runId);
  mkdirSync(reportDir, { recursive: true });
  stdout.write("\n" + models.length + " model connections x " + scenarios.length +
    " scenario definitions x " + repetitions + " repetitions = " +
    (models.length * scenarios.length * repetitions) + " trials.\n");
  const records = [], credentials = models.map(m => m.credential);
  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const connection = models[modelIndex];
    const modelLabel = connection.name + " [" + connection.model + " #" + (modelIndex + 1) + "]";
    for (const item of selected) {
      const ids = catalogFor(item).filter(s => journeys.includes(s.journey)).map(s => s.id);
      if (!ids.length) continue;
      const key = "model-" + String(modelIndex + 1).padStart(2, "0") + "-" + item;
      stdout.write("\n=== " + connection.name + " / " + item + " ===\n");
      let code = 1, failure = "";
      if (item === "host" && packagingFailure) {
        records.push({ model: modelLabel, mode: item, key, exitCode: 1, failure: packagingFailure });
        continue;
      }
      try {
        code = await runVitest(modeFiles[item], {
          AAAAT_AI_EVAL: "1",
          AAAAT_AI_EVAL_ENDPOINT: connection.endpoint,
          AAAAT_AI_EVAL_MODEL: connection.model,
          AAAAT_AI_EVAL_CREDENTIAL: connection.credential,
          AAAAT_AI_EVAL_REPETITIONS: String(repetitions),
          AAAAT_AI_EVAL_TIMEOUT_MS: String(timeoutSeconds * 1000),
          AAAAT_AI_EVAL_RUN_ID: runId,
          AAAAT_AI_EVAL_REPORT_KEY: key,
          AAAAT_AI_EVAL_SCENARIOS: JSON.stringify(ids),
          ...(item === "host" ? { AAAAT_PACKAGED_EXECUTABLE: packaged } : {}),
        });
      } catch (error) {
        failure = redact(error instanceof Error ? error.message : String(error), credentials);
        stderr.write(failure + "\n");
      }
      records.push({ model: modelLabel, mode: item, key, exitCode: code, failure });
    }
  }
  const summary = writeSummary(reportDir, models, selected, journeys, repetitions, records);
  stdout.write("\nComparison report: " + path.join(reportDir, "summary.md") +
    "\nJSON matrix: " + path.join(reportDir, "run.json") + "\n");
  process.exitCode = summary.harnessFailures.length ? 1 : 0;
}

main().catch((reason) => {
  stderr.write((reason instanceof Error ? reason.message : String(reason)) + "\n");
  process.exitCode = 1;
});