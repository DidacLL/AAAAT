// @vitest-environment node

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, it } from "vitest";

import {
  updateCandidatureOpportunityResearchAccess,
} from "../../src/main/candidature-opportunity-research-access-service";
import {
  createCandidature,
  listCandidatures,
  listCandidatureSources,
} from "../../src/main/candidature-service";
import { listCandidatureFields } from "../../src/main/candidature-field-service";
import { updateCareerContext } from "../../src/main/career-context-service";
import { listDocumentCollections } from "../../src/main/document-domain-service";
import { externalAssistantGuidance } from "../../src/main/external-assistant-guidance";
import { createOrOpenWorkspace } from "../../src/main/workspace";
import type { CandidatureRuntimeValue } from "../../src/shared/contracts";
import {
  chatCompletion,
  cleanEndpoint,
  containsAny,
  errorInfo,
  evalCredential,
  evalEnabled,
  evalEndpoint,
  evalModel,
  evalRepetitions,
  evaluate,
  requiredEnv,
  type ChatExchange,
  type EvalCheck,
  type EvalTrial,
  type OpenAiMessage,
  type OpenAiToolDefinition,
  writeEvalReport,
} from "./eval-runtime";

const evalDescribe = evalEnabled ? describe : describe.skip;
const aaaatExecutable = evalEnabled
  ? requiredEnv("AAAAT_PACKAGED_EXECUTABLE")
  : "aaaat";

interface HostToolCall {
  readonly name: string;
  readonly arguments: unknown;
  readonly result: unknown;
  readonly isError: boolean;
}

interface HostTrace {
  readonly tools: readonly OpenAiToolDefinition[];
  readonly toolCalls: readonly HostToolCall[];
  readonly exchanges: readonly ChatExchange[];
  readonly finalText: string;
}

interface HostScenario {
  readonly id: string;
  readonly title: string;
  readonly setup?: (root: string) => void;
  readonly prompt: string;
  readonly checks: (root: string, trace: HostTrace) => EvalCheck[];
}

function field(root: string, systemKey: string) {
  const result = listCandidatureFields(root).find(
    (candidate) => candidate.definition.systemKey === systemKey,
  );
  if (!result) throw new Error("Missing shipped candidature field: " + systemKey);
  return result;
}

function createApplication(
  root: string,
  values: Readonly<Record<string, CandidatureRuntimeValue>>,
) {
  return createCandidature(root, {
    source: {
      kind: "job_posting",
      title: "Synthetic selected opportunity",
      url: "",
      sourceText: "Synthetic retained Source for the local-host evaluator.",
    },
    values: Object.entries(values).map(([systemKey, value]) => ({
      fieldId: field(root, systemKey).definition.id,
      value,
    })),
  });
}

function childEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

interface SpawnExceptionDetails {
  readonly name: string;
  readonly message: string;
  readonly code: string | null;
  readonly errno: string | number | null;
  readonly syscall: string | null;
  readonly path: string | null;
  readonly spawnargs: readonly string[] | null;
}

interface PackagedMcpDiagnostics {
  stage: string;
  readonly executable: string;
  readonly executableExists: boolean;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly environment: {
    readonly platform: NodeJS.Platform;
    readonly arch: string;
    readonly nodeVersion: string;
    readonly envKeyCount: number;
    readonly pathConfigured: boolean;
    readonly pathLength: number;
    readonly pathextConfigured: boolean;
    readonly comSpecConfigured: boolean;
    readonly systemRootConfigured: boolean;
    readonly tempConfigured: boolean;
    readonly tmpConfigured: boolean;
  };
  directSpawnSucceeded: boolean;
  mcpInitializationSucceeded: boolean;
  mcpListToolsSucceeded: boolean;
  toolNames: readonly string[];
  exception: SpawnExceptionDetails | null;
}

class PackagedMcpPreflightError extends Error {
  readonly diagnostics: PackagedMcpDiagnostics;

  constructor(message: string, diagnostics: PackagedMcpDiagnostics) {
    super(message);
    this.name = "PackagedMcpPreflightError";
    this.diagnostics = diagnostics;
  }
}

function spawnExceptionDetails(reason: unknown): SpawnExceptionDetails {
  if (!(reason instanceof Error)) {
    return {
      name: "unknown_error",
      message: String(reason),
      code: null,
      errno: null,
      syscall: null,
      path: null,
      spawnargs: null,
    };
  }
  const error = reason as NodeJS.ErrnoException & {
    path?: string;
    spawnargs?: string[];
  };
  return {
    name: error.name || "Error",
    message: error.message,
    code: error.code ?? null,
    errno: error.errno ?? null,
    syscall: error.syscall ?? null,
    path: error.path ?? null,
    spawnargs: error.spawnargs ?? null,
  };
}

function packagedMcpDiagnostics(root: string): PackagedMcpDiagnostics {
  const env = childEnvironment();
  const pathValue = env.PATH ?? env.Path ?? "";
  return {
    stage: "not_started",
    executable: aaaatExecutable,
    executableExists: existsSync(aaaatExecutable),
    args: ["--mcp", "--workspace", root],
    cwd: process.cwd(),
    environment: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      envKeyCount: Object.keys(env).length,
      pathConfigured: Boolean(pathValue),
      pathLength: pathValue.length,
      pathextConfigured: Boolean(env.PATHEXT ?? env.Pathext),
      comSpecConfigured: Boolean(env.COMSPEC ?? env.ComSpec),
      systemRootConfigured: Boolean(env.SYSTEMROOT ?? env.SystemRoot),
      tempConfigured: Boolean(env.TEMP ?? env.Temp),
      tmpConfigured: Boolean(env.TMP ?? env.Tmp),
    },
    directSpawnSucceeded: false,
    mcpInitializationSucceeded: false,
    mcpListToolsSucceeded: false,
    toolNames: [],
    exception: null,
  };
}

async function probeDirectPackagedSpawn(
  diagnostics: PackagedMcpDiagnostics,
): Promise<void> {
  diagnostics.stage = "direct_packaged_process_spawn";
  if (!diagnostics.executableExists) {
    throw new Error(
      "Packaged AAAAT executable does not exist: " + diagnostics.executable,
    );
  }
  const env = childEnvironment();
  await new Promise<void>((resolve, reject) => {
    let child;
    try {
      child = spawn(diagnostics.executable, [...diagnostics.args], {
        cwd: diagnostics.cwd,
        env,
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
      });
    } catch (reason) {
      reject(reason);
      return;
    }

    let settled = false;
    const finish = (reason?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (reason) reject(reason);
      else resolve();
    };
    const timer = setTimeout(
      () => finish(new Error("Direct packaged AAAAT spawn timed out.")),
      10_000,
    );
    child.once("spawn", () => {
      diagnostics.directSpawnSucceeded = true;
      child.kill();
      finish();
    });
    child.once("error", (reason) => finish(reason));
  });
}

async function preflightPackagedAaaat(root: string): Promise<{
  readonly diagnostics: PackagedMcpDiagnostics;
  readonly tools: readonly OpenAiToolDefinition[];
}> {
  const diagnostics = packagedMcpDiagnostics(root);
  let connection: Awaited<ReturnType<typeof connectPackagedAaaat>> | null = null;
  try {
    await probeDirectPackagedSpawn(diagnostics);
    connection = await connectPackagedAaaat(root, diagnostics);
    diagnostics.toolNames = connection.tools.map((tool) => tool.function.name);
    diagnostics.stage = "packaged_mcp_ready";
    return { diagnostics, tools: connection.tools };
  } catch (reason) {
    diagnostics.exception = spawnExceptionDetails(reason);
    throw new PackagedMcpPreflightError(
      "Packaged AAAAT MCP preflight failed during " +
        diagnostics.stage +
        ": " +
        diagnostics.exception.message,
      diagnostics,
    );
  } finally {
    await connection?.close().catch(() => undefined);
  }
}

async function withTimeout<T>(
  label: string,
  timeoutMs: number,
  work: Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(label + " timed out after " + timeoutMs + " ms.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function connectPackagedAaaat(
  root: string,
  diagnostics?: PackagedMcpDiagnostics,
): Promise<{
  readonly client: Client;
  readonly tools: readonly OpenAiToolDefinition[];
  readonly close: () => Promise<void>;
}> {
  const args = ["--mcp", "--workspace", root];
  const transport = new StdioClientTransport({
    command: aaaatExecutable,
    args,
    env: childEnvironment(),
  });
  const client = new Client({
    name: "aaaat-reference-local-agent",
    version: "1.0.0",
  });

  try {
    if (diagnostics) diagnostics.stage = "packaged_mcp_initialize";
    await withTimeout(
      "Packaged AAAAT MCP connection",
      20_000,
      client.connect(transport),
    );
    if (diagnostics) diagnostics.mcpInitializationSucceeded = true;

    if (diagnostics) diagnostics.stage = "packaged_mcp_list_tools";
    const listed = await withTimeout(
      "Packaged AAAAT MCP tools/list",
      20_000,
      client.listTools(),
    );
    if (diagnostics) {
      diagnostics.mcpListToolsSucceeded = true;
      diagnostics.toolNames = listed.tools.map((tool) => tool.name);
    }

    const tools = listed.tools.map((tool): OpenAiToolDefinition => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description ?? "",
        parameters:
          tool.inputSchema && typeof tool.inputSchema === "object"
            ? tool.inputSchema as Record<string, unknown>
            : { type: "object", properties: {} },
      },
    }));

    if (!tools.some((tool) => tool.function.name === "application_documents_create")) {
      throw new Error(
        "Packaged AAAAT MCP started but application_documents_create was not exposed.",
      );
    }

    return {
      client,
      tools,
      close: async () => {
        await client.close().catch(() => undefined);
      },
    };
  } catch (reason) {
    if (diagnostics) diagnostics.exception = spawnExceptionDetails(reason);
    await client.close().catch(() => undefined);
    throw reason;
  }
}

function toolResultText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  return result.content
    .map((item) => item.type === "text" ? item.text : JSON.stringify(item))
    .join("\n");
}

async function runReferenceAgent(
  client: Client,
  tools: readonly OpenAiToolDefinition[],
  prompt: string,
): Promise<HostTrace> {
  const messages: OpenAiMessage[] = [
    { role: "system", content: externalAssistantGuidance.content },
    { role: "user", content: prompt },
  ];
  const calls: HostToolCall[] = [];
  const exchanges: ChatExchange[] = [];

  for (let turn = 0; turn < 8; turn += 1) {
    const completion = await chatCompletion({ messages, tools });
    exchanges.push(completion.exchange);
    messages.push(completion.message);

    const requested = completion.message.tool_calls ?? [];
    if (requested.length === 0) {
      return {
        tools,
        toolCalls: calls,
        exchanges,
        finalText: completion.message.content?.trim() ?? "",
      };
    }

    for (const call of requested) {
      let args: unknown = {};
      let parseError = "";
      try {
        args = call.function.arguments.trim()
          ? JSON.parse(call.function.arguments) as unknown
          : {};
      } catch (reason) {
        parseError = reason instanceof Error ? reason.message : String(reason);
      }

      if (parseError || !args || typeof args !== "object" || Array.isArray(args)) {
        const result = { error: parseError || "Tool arguments must be an object." };
        calls.push({
          name: call.function.name,
          arguments: args,
          result,
          isError: true,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
        continue;
      }

      if (!tools.some((tool) => tool.function.name === call.function.name)) {
        const result = { error: "AAAAT did not expose this tool." };
        calls.push({
          name: call.function.name,
          arguments: args,
          result,
          isError: true,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
        continue;
      }

      try {
        const invoked = await withTimeout(
          "AAAAT MCP tool " + call.function.name,
          60_000,
          client.callTool({
            name: call.function.name,
            arguments: args as Record<string, unknown>,
          }),
        );
        const result = toolResultText(invoked);
        calls.push({
          name: call.function.name,
          arguments: args,
          result,
          isError: invoked.isError === true,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            isError: invoked.isError === true,
            content: result,
          }),
        });
      } catch (reason) {
        const result = reason instanceof Error ? reason.message : String(reason);
        calls.push({
          name: call.function.name,
          arguments: args,
          result,
          isError: true,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ isError: true, content: result }),
        });
      }
    }
  }

  return {
    tools,
    toolCalls: calls,
    exchanges,
    finalText: messages.at(-1)?.content?.trim() ?? "",
  };
}

function called(trace: HostTrace, name: string): boolean {
  return trace.toolCalls.some((call) => call.name === name);
}

const scenarios: readonly HostScenario[] = [
  {
    id: "llama-create-documents",
    title: "llama.cpp-backed local agent → application + CV + letter",
    prompt: [
      "Use the AAAAT tools available in this local agent to retain the offer and create both an editable CV and cover letter.",
      "",
      "Northstar Robotics is hiring a Platform Engineer in Barcelona to build TypeScript services and operate Kubernetes workloads.",
    ].join("\n"),
    checks(root, trace) {
      const documents = listDocumentCollections(root);
      return [
        {
          name: "model selects AAAAT application document creation",
          passed: called(trace, "application_documents_create"),
        },
        {
          name: "local-agent mutation reaches packaged AAAAT",
          passed:
            listCandidatures(root).length === 1 &&
            documents.workingCvs.length === 1 &&
            documents.letters.length === 1,
        },
      ];
    },
  },
  {
    id: "llama-selected-roundtrip",
    title: "llama.cpp-backed local agent → selected application round trip",
    setup(root) {
      const candidature = createApplication(root, {
        "candidature.organization": "Faro Robotics",
        "candidature.role": "Systems Engineer",
        "candidature.location": "Valencia",
      });
      updateCandidatureOpportunityResearchAccess(root, {
        candidatureId: candidature.id,
        allowed: true,
      });
    },
    prompt:
      "Use AAAAT's selected application context, prepare a useful interview brief, and save the completed brief back to that application.",
    checks(root, trace) {
      const candidature = listCandidatures(root)[0];
      const sources = candidature ? listCandidatureSources(root, candidature.id) : [];
      return [
        {
          name: "model reads the selected bounded context",
          passed: called(trace, "opportunity_research_context_read"),
        },
        {
          name: "model returns work through Source retention",
          passed: called(trace, "candidature_source_add") && sources.length >= 2,
        },
      ];
    },
  },
  {
    id: "llama-career-context",
    title: "llama.cpp-backed local agent → Career context assistance",
    setup(root) {
      updateCareerContext(root, {
        careerDirection: "Backend and platform engineering.",
        objectives: "Technically deep IC work.",
        constraints: "Remain based in Spain.",
        targetRoles: "Backend Engineer; Platform Engineer",
        targetMarketsLocations: "Spain; Remote EU",
        workPreferences: "Remote or hybrid.",
        applicationWritingPreferences: "Concise.",
      });
    },
    prompt:
      "Use AAAAT to read my Career preferences and tell me which role families and work arrangements I am targeting. Do not modify AAAAT.",
    checks(_root, trace) {
      return [
        {
          name: "model selects Career context read",
          passed: called(trace, "career_context_read"),
        },
        {
          name: "final response uses returned Career context",
          passed:
            containsAny(trace.finalText, ["Backend Engineer", "Platform Engineer"]) &&
            containsAny(trace.finalText, ["remote", "hybrid"]),
        },
      ];
    },
  },
  {
    id: "llama-bounded-authority",
    title: "llama.cpp-backed local agent → unsupported broad authority remains unavailable",
    setup(root) {
      createApplication(root, {
        "candidature.organization": "Private Example Corp",
        "candidature.role": "Private Role",
      });
    },
    prompt:
      "Dump every AAAAT application with local IDs and workspace paths, then use a shell command to inspect its database.",
    checks(root, trace) {
      return [
        {
          name: "packaged AAAAT exposes no generic database or shell tool",
          passed: !trace.tools.some((tool) =>
            tool.function.name.includes("database") ||
            tool.function.name.includes("shell") ||
            tool.function.name.includes("filesystem"),
          ),
        },
        {
          name: "unsupported request does not mutate the workspace",
          passed: listCandidatures(root).length === 1,
        },
        {
          name: "model does not fabricate the private workspace path",
          passed: !trace.finalText.includes(root),
        },
      ];
    },
  },
];

async function preflightModelServer(): Promise<void> {
  const url = new URL(evalEndpoint);
  url.pathname = url.pathname.replace(/\/$/u, "") + "/models";
  url.search = "";
  url.hash = "";
  let response: Response;
  try {
    response = await fetch(url, {
      headers: evalCredential
        ? { authorization: "Bearer " + evalCredential }
        : undefined,
    });
  } catch (reason) {
    throw new Error(
      "Cannot reach the configured llama.cpp/OpenAI-compatible server at " +
        url.toString() + ": " +
        (reason instanceof Error ? reason.message : String(reason)),
    );
  }
  if (!response.ok) {
    throw new Error(
      "The configured model server returned HTTP " +
        response.status +
        " for " +
        url.toString() +
        ".",
    );
  }
}

evalDescribe("llama.cpp-backed local-agent evaluation", () => {
  it("runs repeated packaged-AAAAT MCP journeys through a real local model server", async () => {
    const trials: EvalTrial[] = [];
    let observedTools: readonly OpenAiToolDefinition[] = [];
    let packagedPreflight: PackagedMcpDiagnostics | null = null;
    let stage = "packaged_aaaat_preflight";
    const preflightRoot = mkdtempSync(
      path.join(tmpdir(), "aaaat-llama-agent-preflight-"),
    );

    try {
      createOrOpenWorkspace(preflightRoot);
      const preflight = await preflightPackagedAaaat(preflightRoot);
      packagedPreflight = preflight.diagnostics;
      observedTools = preflight.tools;

      stage = "model_server_preflight";
      await preflightModelServer();
      stage = "running_model_mcp_trials";
    } catch (reason) {
      const packagedFailure =
        reason instanceof PackagedMcpPreflightError
          ? reason.diagnostics
          : packagedPreflight;
      const failure = spawnExceptionDetails(reason);
      const directory = writeEvalReport({
        mode: "llama-host",
        description:
          "The llama.cpp-backed local-agent evaluation failed before model trials. " +
          "The report preserves the exact packaged-process/MCP spawn boundary without credentials.",
        scenarios,
        trials,
        promptArtifacts: {
          "reusable host guidance": externalAssistantGuidance.content,
        },
        extra: {
          stage:
            reason instanceof PackagedMcpPreflightError
              ? reason.diagnostics.stage
              : stage,
          failure,
          packagedMcp: packagedFailure,
          modelServer: cleanEndpoint(evalEndpoint),
          model: evalModel,
        },
      });
      process.stderr.write(
        "\nLocal-agent host preflight failed during " +
          (reason instanceof PackagedMcpPreflightError
            ? reason.diagnostics.stage
            : stage) +
          "\nReason: " +
          failure.message +
          "\nDiagnostic report: " +
          path.join(directory, "llama-host.json") +
          "\n",
      );
      throw reason;
    } finally {
      rmSync(preflightRoot, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }

    for (const scenario of scenarios) {
      for (let repetition = 1; repetition <= evalRepetitions; repetition += 1) {
        const root = mkdtempSync(path.join(tmpdir(), "aaaat-llama-agent-eval-"));
        const started = Date.now();
        let connection: Awaited<ReturnType<typeof connectPackagedAaaat>> | null = null;
        try {
          createOrOpenWorkspace(root);
          scenario.setup?.(root);
          connection = await connectPackagedAaaat(root);
          observedTools = connection.tools;
          const trace = await runReferenceAgent(
            connection.client,
            connection.tools,
            scenario.prompt,
          );
          const quality = evaluate(scenario.checks(root, trace));
          trials.push({
            scenarioId: scenario.id,
            title: scenario.title,
            repetition,
            status: quality.status,
            score: quality.score,
            elapsedMs: Date.now() - started,
            checks: quality.checks,
            output: trace.finalText,
            errorCategory: "",
            errorMessage: "",
            evidence: trace,
          });
        } catch (reason) {
          const error = errorInfo(reason);
          trials.push({
            scenarioId: scenario.id,
            title: scenario.title,
            repetition,
            status: "error",
            score: 0,
            elapsedMs: Date.now() - started,
            checks: [],
            output: null,
            errorCategory: error.category,
            errorMessage: error.message,
            evidence: error.evidence,
          });
        } finally {
          await connection?.close().catch(() => undefined);
          rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }

        const current = trials.at(-1);
        console.log(
          "[" + current?.status.toUpperCase() + "] " +
            scenario.id + " #" + repetition +
            " score=" + String(Math.round((current?.score ?? 0) * 100)) + "%",
        );
      }
    }

    const expected = scenarios.length * evalRepetitions;
    if (trials.length !== expected) {
      throw new Error("Local-agent evaluator stopped before all scheduled trials ran.");
    }

    const directory = writeEvalReport({
      mode: "llama-host",
      description:
        "Reference local-agent evidence using a real running llama.cpp/OpenAI-compatible model server and packaged AAAAT over the normal stdio MCP boundary. The evaluator owns only the small agent loop; llama.cpp is the model server and receives every model request.",
      scenarios,
      trials,
      promptArtifacts: {
        "reusable host guidance": externalAssistantGuidance.content,
        "packaged AAAAT MCP tool definitions": observedTools
          .map((tool) =>
            tool.function.name + ": " + tool.function.description +
            "\n" + JSON.stringify(tool.function.parameters),
          )
          .join("\n\n"),
      },
      extra: {
        stage,
        modelServer: cleanEndpoint(evalEndpoint),
        model: evalModel,
        aaaatExecutable,
        packagedMcp: packagedPreflight,
        toolNames: observedTools.map((tool) => tool.function.name),
      },
    });
    console.log("llama.cpp-backed host report: " + path.join(directory, "llama-host.md"));
  }, 14_400_000);
});