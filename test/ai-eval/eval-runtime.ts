import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type EvalStatus = "pass" | "weak" | "fail" | "error";

export interface EvalCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly critical?: boolean;
  readonly detail?: string;
}

export interface EvalTrial {
  readonly scenarioId: string;
  readonly title: string;
  readonly journey: string;
  readonly scenarioClass: string;
  readonly repetition: number;
  readonly status: EvalStatus;
  readonly score: number;
  readonly elapsedMs: number;
  readonly checks: readonly EvalCheck[];
  readonly output: unknown;
  readonly errorCategory: string;
  readonly errorMessage: string;
  readonly evidence?: unknown;
}

export interface OpenAiToolCall {
  readonly id: string;
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

export interface OpenAiMessage {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string | null;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly OpenAiToolCall[];
}

export interface OpenAiToolDefinition {
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

export interface ChatExchange {
  readonly request: unknown;
  readonly rawResponse: string;
  readonly elapsedMs: number;
  readonly httpStatus: number | null;
  readonly error: string;
}

export interface ChatCompletion {
  readonly message: OpenAiMessage;
  readonly exchange: ChatExchange;
}

export const evalEnabled = process.env.AAAAT_AI_EVAL === "1";
export const evalEndpoint = evalEnabled
  ? requiredEnv("AAAAT_AI_EVAL_ENDPOINT")
  : "http://127.0.0.1:1/v1";
export const evalModel = evalEnabled
  ? requiredEnv("AAAAT_AI_EVAL_MODEL")
  : "disabled";
export const evalCredential = process.env.AAAAT_AI_EVAL_CREDENTIAL?.trim() ?? "";
export const evalRepetitions = boundedInt(
  process.env.AAAAT_AI_EVAL_REPETITIONS,
  5,
  1,
  20,
);
export const evalTimeoutMs = boundedInt(
  process.env.AAAAT_AI_EVAL_TIMEOUT_MS,
  120_000,
  10_000,
  900_000,
);
export const evalRunId =
  process.env.AAAAT_AI_EVAL_RUN_ID?.trim() ||
  new Date().toISOString().replace(/[:.]/gu, "-");

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(name + " is required. Run this evaluator through npm run eval:ai.");
  }
  return value;
}

function boundedInt(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = value ? Number(value) : fallback;
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error("Invalid evaluator integer: " + String(value ?? ""));
  }
  return parsed;
}

export function cleanEndpoint(value: string): string {
  const url = new URL(value);
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/u, "");
}

function chatUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/$/u, "") + "/chat/completions";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function chatCompletion(input: {
  readonly messages: readonly OpenAiMessage[];
  readonly tools?: readonly OpenAiToolDefinition[];
  readonly timeoutMs?: number;
}): Promise<ChatCompletion> {
  const request = {
    model: evalModel,
    messages: input.messages,
    ...(input.tools && input.tools.length > 0 ? { tools: input.tools } : {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("Local AI evaluation timeout.")),
    input.timeoutMs ?? evalTimeoutMs,
  );
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(chatUrl(evalEndpoint), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(evalCredential
          ? { authorization: "Bearer " + evalCredential }
          : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch (reason) {
    clearTimeout(timer);
    throw new EvalTransportError(
      "connection_unreachable",
      reason instanceof Error ? reason.message : String(reason),
      {
        request,
        rawResponse: "",
        elapsedMs: Date.now() - started,
        httpStatus: null,
        error: reason instanceof Error ? reason.name + ": " + reason.message : String(reason),
      },
    );
  }

  let raw: string;
  try {
    raw = await response.text();
  } finally {
    clearTimeout(timer);
  }
  const exchange: ChatExchange = {
    request,
    rawResponse: raw,
    elapsedMs: Date.now() - started,
    httpStatus: response.status,
    error: "",
  };
  if (!response.ok) {
    throw new EvalTransportError(
      "provider_http_failure",
      "External AI endpoint returned HTTP " + response.status + ".",
      exchange,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    throw new EvalTransportError(
      "provider_envelope_invalid",
      "External AI endpoint returned invalid JSON.",
      exchange,
    );
  }
  const candidate = payload as {
    choices?: Array<{
      message?: {
        role?: unknown;
        content?: unknown;
        tool_calls?: unknown;
      };
    }>;
  };
  const message = candidate.choices?.[0]?.message;
  if (!message) {
    throw new EvalTransportError(
      "provider_envelope_invalid",
      "External AI response did not contain choices[0].message.",
      exchange,
    );
  }
  const toolCalls = parseToolCalls(message.tool_calls);
  return {
    message: {
      role: "assistant",
      content: typeof message.content === "string" ? message.content : null,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    },
    exchange,
  };
}

function parseToolCalls(value: unknown): OpenAiToolCall[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): OpenAiToolCall[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as {
      id?: unknown;
      type?: unknown;
      function?: { name?: unknown; arguments?: unknown };
    };
    if (
      typeof item.id !== "string" ||
      item.type !== "function" ||
      typeof item.function?.name !== "string" ||
      typeof item.function.arguments !== "string"
    ) {
      return [];
    }
    return [{
      id: item.id,
      type: "function",
      function: {
        name: item.function.name,
        arguments: item.function.arguments,
      },
    }];
  });
}

export class EvalTransportError extends Error {
  readonly category: string;
  readonly exchange: ChatExchange;

  constructor(category: string, message: string, exchange: ChatExchange) {
    super(message);
    this.name = "EvalTransportError";
    this.category = category;
    this.exchange = exchange;
  }
}

export function evaluate(checks: readonly EvalCheck[]): {
  readonly status: Exclude<EvalStatus, "error">;
  readonly score: number;
  readonly checks: readonly EvalCheck[];
} {
  const passed = checks.filter((check) => check.passed).length;
  const score = checks.length === 0 ? 1 : passed / checks.length;
  const criticalFailure = checks.some(check => check.critical === true && !check.passed);
  return {
    status: criticalFailure ? "fail" : score === 1 ? "pass" : score >= 0.5 ? "weak" : "fail",
    score,
    checks,
  };
}

export function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase();
}

export function containsAny(value: unknown, terms: readonly string[]): boolean {
  const current = normalize(Array.isArray(value) ? value.join(" ") : value);
  return terms.some((term) => current.includes(normalize(term)));
}

export function errorInfo(reason: unknown): {
  readonly category: string;
  readonly message: string;
  readonly evidence?: unknown;
} {
  if (reason instanceof EvalTransportError) {
    return {
      category: reason.category,
      message: reason.message,
      evidence: { exchange: reason.exchange },
    };
  }
  if (reason instanceof Error) {
    return { category: reason.name || "error", message: reason.message };
  }
  return { category: "unknown_error", message: String(reason) };
}

function percent(value: number): string {
  return String(Math.round(value * 100)) + "%";
}

export function writeEvalReport(input: {
  readonly mode: string;
  readonly description: string;
  readonly scenarios: readonly { id: string; title: string; journey: string; scenarioClass: string }[];
  readonly trials: readonly EvalTrial[];
  readonly promptArtifacts?: Readonly<Record<string, string>>;
  readonly extra?: unknown;
}): string {
  const directory = path.resolve("ai-eval-results", evalRunId);
  mkdirSync(directory, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    description: input.description,
    connection: {
      endpoint: cleanEndpoint(evalEndpoint),
      model: evalModel,
      credentialConfigured: Boolean(evalCredential),
    },
    configuration: {
      repetitions: evalRepetitions,
      timeoutMs: evalTimeoutMs,
      scenarioCount: input.scenarios.length,
      trialCount: input.trials.length,
    },
    promptArtifacts: input.promptArtifacts ?? {},
    scenarios: input.scenarios,
    extra: input.extra ?? null,
    trials: input.trials,
  };
  const reportKey = process.env.AAAAT_AI_EVAL_REPORT_KEY || input.mode;
  if (!/^[a-zA-Z0-9_-]+$/u.test(reportKey)) throw new Error("Invalid report key.");
  writeFileSync(
    path.join(directory, reportKey + ".json"),
    safeJson(report) + "\n",
    "utf8",
  );

  const lines = [
    "# AAAAT AI evaluation — " + input.mode,
    "",
    input.description,
    "",
    "- Model: " + evalModel,
    "- Endpoint: " + cleanEndpoint(evalEndpoint),
    "- Repetitions per scenario: " + String(evalRepetitions),
    "- Trials: " + String(input.trials.length),
    "",
    "| Journey | Scenario | Class | Pass | Weak | Fail | Error | Average |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const scenario of input.scenarios) {
    const current = input.trials.filter((trial) => trial.scenarioId === scenario.id);
    const count = (status: EvalStatus) =>
      current.filter((trial) => trial.status === status).length;
    const average =
      current.length === 0
        ? 0
        : current.reduce((sum, trial) => sum + trial.score, 0) / current.length;
    lines.push(
      "| " + scenario.journey + " | " + scenario.title + " | " + scenario.scenarioClass +
        " | " + count("pass") +
        " | " + count("weak") +
        " | " + count("fail") +
        " | " + count("error") +
        " | " + percent(average) + " |",
    );
  }

  const signals = new Map<string, number>();
  for (const trial of input.trials) {
    if (trial.errorCategory) {
      const key = "error: " + trial.errorCategory;
      signals.set(key, (signals.get(key) ?? 0) + 1);
    }
    for (const check of trial.checks) {
      if (!check.passed) {
        signals.set(check.name, (signals.get(check.name) ?? 0) + 1);
      }
    }
  }
  lines.push("", "## Repeated signals", "");
  if (signals.size === 0) {
    lines.push("No repeated failure signal.");
  } else {
    for (const [signal, count] of [...signals.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push("- " + count + "x " + signal);
    }
  }

  if (input.promptArtifacts && Object.keys(input.promptArtifacts).length > 0) {
    lines.push("", "## Prompt / guidance burden", "");
    for (const [name, value] of Object.entries(input.promptArtifacts)) {
      const words = value.trim() ? value.trim().split(/\s+/u).length : 0;
      lines.push("- " + name + ": " + words + " words / " + value.length + " characters");
    }
  }
  lines.push(
    "",
    "Full model exchanges, tool calls, retained outputs and per-check details are in " +
      reportKey +
      ".json.",
    "",
  );
  writeFileSync(
    path.join(directory, reportKey + ".md"),
    lines.join("\n"),
    "utf8",
  );
  return directory;
}


// Scrub secrets from nested exchanges, tool results and model echoes.
function safeJson(value: unknown): string {
  const credential = evalCredential.replace(/^Bearer\s+/iu, "");
  const scrub = (text: string): string => {
    let clean = text.replace(/authorization\s*[:=]\s*bearer\s+[^\s"'\\]+/giu, "Authorization: [REDACTED]");
    clean = clean.replace(/AAAAT_AI_EXCHANGE:[A-Za-z0-9_-]+/gu, "AAAAT_AI_EXCHANGE:[REDACTED]");
    if (credential) clean = clean.split(credential).join("[REDACTED]");
    return clean;
  };
  return JSON.stringify(value, (key: string, item: unknown) => {
    if (/^(authorization|api[-_]?key|credential|token)$/iu.test(key)) return "[REDACTED]";
    return typeof item === "string" ? scrub(item) : item;
  }, 2);
}
