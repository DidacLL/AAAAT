import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

function required(value, label) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

function integer(value, fallback, minimum, maximum, label) {
  const parsed = value.trim() ? Number(value) : fallback;
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

async function askSecret(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      return (await rl.question(prompt)).trim();
    } finally {
      rl.close();
    }
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

async function main() {
  stdout.write("\nAAAAT local AI journey evaluation\n");
  stdout.write("Uses synthetic career/application data and the real configured AI endpoint.\n");
  stdout.write("Model misses are recorded; they do not stop the remaining journeys.\n\n");

  const first = createInterface({ input: stdin, output: stdout });
  let endpoint;
  let model;
  try {
    endpoint = required(
      await first.question("OpenAI-compatible base URL (for example http://127.0.0.1:11434/v1): "),
      "Endpoint",
    );
    new URL(endpoint);
    model = required(await first.question("Model name: "), "Model");
  } finally {
    first.close();
  }

  const credential = await askSecret("API key / Bearer credential (optional): ");

  const second = createInterface({ input: stdin, output: stdout });
  let repetitions;
  let timeoutSeconds;
  try {
    repetitions = integer(
      await second.question("Repetitions per scenario [5]: "),
      3,
      2,
      20,
      "Repetitions",
    );
    timeoutSeconds = integer(
      await second.question("Maximum seconds per model request [120]: "),
      120,
      10,
      900,
      "Request timeout",
    );
  } finally {
    second.close();
  }

  const scenarioCount = 15;
  stdout.write(
    `\nRunning ${scenarioCount} scenarios × ${repetitions} repetitions = ${scenarioCount * repetitions} journey trials.\n`,
  );
  stdout.write("Results will be written under ai-eval-results/.\n\n");

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(
    npx,
    [
      "vitest",
      "run",
      "tools/ai-eval/ai-journeys.eval.test.ts",
      "--reporter=verbose",
      "--testTimeout=3600000",
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        AAAAT_AI_EVAL: "1",
        AAAAT_AI_EVAL_ENDPOINT: endpoint,
        AAAAT_AI_EVAL_MODEL: model,
        AAAAT_AI_EVAL_CREDENTIAL: credential,
        AAAAT_AI_EVAL_REPETITIONS: String(repetitions),
        AAAAT_AI_EVAL_TIMEOUT_MS: String(timeoutSeconds * 1000),
      },
    },
  );

  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (status) => resolve(status ?? 1));
  });
  process.exitCode = code;
}

main().catch((reason) => {
  console.error(reason instanceof Error ? reason.message : String(reason));
  process.exitCode = 1;
});
