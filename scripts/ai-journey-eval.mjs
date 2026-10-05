import { spawn } from "node:child_process";
import { existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import process, { stdin, stderr, stdout } from "node:process";
import { URL } from "node:url";

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
    if (!(supplied in modeSets)) {
      throw new Error("Unknown evaluation mode: " + supplied);
    }
    return supplied;
  }

  stdout.write("Choose what to evaluate:\n");
  stdout.write("  1. Core — direct AAAAT AI + external chat + model-driven MCP\n");
  stdout.write("  2. External — Send to my AI + MCP + llama.cpp-backed local agent\n");
  stdout.write("  3. Direct AAAAT → AI only\n");
  stdout.write("  4. External chat / Send to my AI only\n");
  stdout.write("  5. Model-driven MCP only\n");
  stdout.write("  6. llama.cpp-backed local-agent host only\n");
  stdout.write("  7. All — every mode above\n");
  const selected = await question("Selection [1]: ", "1");
  const mapping = {
    "1": "core",
    "2": "external",
    "3": "direct",
    "4": "chat",
    "5": "mcp",
    "6": "host",
    "7": "all",
  };
  const mode = mapping[selected];
  if (!mode) throw new Error("Choose a number from 1 to 7.");
  return mode;
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
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const code = await run(npm, ["run", "package"]);
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

async function hostConnection() {
  stdout.write(
    "\nHost mode uses a llama.cpp/OpenAI-compatible server that is already running.\n" +
      "The evaluator sends model requests to that server and connects directly to packaged AAAAT over stdio MCP.\n" +
      "No second llama-server is started and no experimental llama.cpp MCP feature is required.\n\n",
  );
  const connection = await normalConnection();
  const executable = await ensurePackagedExecutable();
  return {
    ...connection,
    executable,
  };
}

async function runVitest(file, environment) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return run(
    npx,
    [
      "vitest",
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
  stdout.write("\nAAAAT local AI journey evaluation\n");
  stdout.write(
    "This evaluates direct inference, external chat, model-driven MCP and a packaged-AAAAT local-agent boundary backed by a running llama.cpp/OpenAI-compatible model server.\n",
  );
  stdout.write(
    "Stochastic model misses are recorded and never stop the remaining scheduled trials.\n\n",
  );

  const mode = await chooseMode();
  const selected = modeSets[mode];
  const needsNormal = selected.some((item) => item !== "host");
  const needsHost = selected.includes("host");
  const normal = needsNormal ? await normalConnection() : null;

  const repetitions = integer(
    await question(
      "Repetitions per scenario [" +
        (process.env.AAAAT_AI_EVAL_REPETITIONS?.trim() || "5") +
        "]: ",
      process.env.AAAAT_AI_EVAL_REPETITIONS?.trim() || "5",
    ),
    5,
    2,
    20,
    "Repetitions",
  );
  const timeoutSeconds = integer(
    await question(
      "Maximum seconds per model request [" +
        (process.env.AAAAT_AI_EVAL_TIMEOUT_SECONDS?.trim() || "120") +
        "]: ",
      process.env.AAAAT_AI_EVAL_TIMEOUT_SECONDS?.trim() || "120",
    ),
    120,
    10,
    900,
    "Request timeout",
  );
  const host = needsHost ? await hostConnection() : null;
  const runId = new Date().toISOString().replace(/[:.]/gu, "-");
  const reportDir = path.resolve("ai-eval-results", runId);
  mkdirSync(reportDir, { recursive: true });

  const scenarioCounts = { direct: 15, chat: 8, mcp: 8, host: 4 };
  const totalScenarios = selected.reduce(
    (sum, item) => sum + scenarioCounts[item],
    0,
  );
  stdout.write(
    "\nRunning " + totalScenarios + " scenario definitions × " + repetitions +
      " repetitions = " + totalScenarios * repetitions + " scheduled trials.\n",
  );
  stdout.write("Modes: " + selected.join(", ") + "\n");
  stdout.write("Report directory: " + reportDir + "\n\n");

  const results = [];
  for (const item of selected) {
    stdout.write("\n=== " + item.toUpperCase() + " ===\n");
    const connection = item === "host" ? host : normal;
    if (!connection) throw new Error("Missing connection configuration for " + item + ".");
    const environment = {
      AAAAT_AI_EVAL: "1",
      AAAAT_AI_EVAL_ENDPOINT: connection.endpoint,
      AAAAT_AI_EVAL_MODEL: connection.model,
      AAAAT_AI_EVAL_CREDENTIAL: connection.credential,
      AAAAT_AI_EVAL_REPETITIONS: String(repetitions),
      AAAAT_AI_EVAL_TIMEOUT_MS: String(timeoutSeconds * 1000),
      AAAAT_AI_EVAL_RUN_ID: runId,
      ...(item === "host"
        ? {
            AAAAT_PACKAGED_EXECUTABLE: host.executable,
          }
        : {}),
    };
    let code;
    try {
      code = await runVitest(modeFiles[item], environment);
    } catch (reason) {
      stderr.write((reason instanceof Error ? reason.message : String(reason)) + "\n");
      code = 1;
    }
    const diagnosticFile =
      item === "host" && existsSync(path.join(reportDir, "llama-host.json"))
        ? path.join(reportDir, "llama-host.json")
        : null;
    results.push({
      mode: item,
      harnessExitCode: code,
      ...(diagnosticFile ? { diagnosticFile } : {}),
    });
    if (code !== 0) {
      stdout.write(
        "\n" + item +
          " had a harness/configuration failure. Remaining selected modes will still run.\n" +
          (diagnosticFile ? "Diagnostic: " + diagnosticFile + "\n" : ""),
      );
    }
  }

  writeFileSync(
    path.join(reportDir, "run.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        requestedMode: mode,
        selectedModes: selected,
        repetitions,
        timeoutSeconds,
        results,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  stdout.write("\nEvaluation run complete.\n");
  for (const result of results) {
    stdout.write(
      "- " + result.mode + ": " +
        (result.harnessExitCode === 0 ? "completed" : "harness/configuration failure") +
        "\n",
    );
  }
  stdout.write("Reports: " + reportDir + "\n");
  stdout.write(
    "Pass/weak/fail model outcomes remain evidence in the reports; they do not set the process exit code.\n",
  );
  process.exitCode = results.some((result) => result.harnessExitCode !== 0) ? 1 : 0;
}

main().catch((reason) => {
  stderr.write((reason instanceof Error ? reason.message : String(reason)) + "\n");
  process.exitCode = 1;
});
