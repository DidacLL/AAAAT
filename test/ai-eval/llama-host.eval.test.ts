// @vitest-environment node

import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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
import { createOrOpenWorkspace, resetWorkspace } from "../../src/main/workspace";
import type { CandidatureRuntimeValue } from "../../src/shared/contracts";
import {
  chatCompletion,
  containsAny,
  errorInfo,
  evalEnabled,
  evalEndpoint,
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
const llamaServer = evalEnabled
  ? requiredEnv("AAAAT_LLAMA_SERVER")
  : "llama-server";
const llamaModel = evalEnabled
  ? requiredEnv("AAAAT_LLAMA_MODEL")
  : "model.gguf";
const aaaatExecutable = evalEnabled
  ? requiredEnv("AAAAT_PACKAGED_EXECUTABLE")
  : "aaaat";

interface LlamaToolEntry {
  readonly tool: string;
  readonly display_name?: string;
  readonly type: string;
  readonly permissions?: Record<string, boolean>;
  readonly definition: OpenAiToolDefinition;
}

interface HostToolCall {
  readonly name: string;
  readonly arguments: unknown;
  readonly result: unknown;
  readonly isError: boolean;
}

interface HostTrace {
  readonly tools: readonly LlamaToolEntry[];
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

function hostRoot(): string {
  const url = new URL(evalEndpoint);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/u, "");
}

async function waitForHealth(process: ChildProcess, logs: string[]): Promise<void> {
  const root = hostRoot();
  const spawnState: { error: Error | null } = { error: null };
  process.once("error", (reason) => {
    spawnState.error =
      reason instanceof Error ? reason : new Error(String(reason));
    logs.push("spawn error: " + spawnState.error.message);
  });
  for (let attempt = 0; attempt < 240; attempt += 1) {
    if (spawnState.error) {
      throw new Error(
        "llama-server could not be started: " + spawnState.error.message,
      );
    }
    if (process.exitCode !== null) {
      throw new Error(
        "llama-server exited during startup. " + logs.slice(-10).join("\n"),
      );
    }
    try {
      const response = await fetch(root + "/health");
      if (response.ok) return;
    } catch (reason) {
      logs.push(reason instanceof Error ? reason.message : String(reason));
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    "llama-server did not become healthy within two minutes. " +
      logs.slice(-10).join("\n"),
  );
}

async function listHostTools(): Promise<LlamaToolEntry[]> {
  const response = await fetch(hostRoot() + "/tools");
  if (!response.ok) {
    throw new Error("llama-server /tools returned HTTP " + response.status + ".");
  }
  const parsed = await response.json() as unknown;
  if (!Array.isArray(parsed)) throw new Error("llama-server /tools response is invalid.");
  return parsed.flatMap((candidate): LlamaToolEntry[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<LlamaToolEntry>;
    if (
      typeof item.tool !== "string" ||
      !item.definition ||
      item.definition.type !== "function"
    ) {
      return [];
    }
    return [item as LlamaToolEntry];
  });
}

async function invokeHostTool(
  name: string,
  argumentsValue: Record<string, unknown>,
): Promise<{ result: unknown; isError: boolean }> {
  const response = await fetch(hostRoot() + "/tools", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tool: name,
      params: argumentsValue,
    }),
  });
  const raw = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    parsed = raw;
  }
  return {
    result: parsed,
    isError:
      !response.ok ||
      (Boolean(parsed) &&
        typeof parsed === "object" &&
        "error" in (parsed as Record<string, unknown>)),
  };
}

async function runHostAgent(tools: readonly LlamaToolEntry[], prompt: string): Promise<HostTrace> {
  const messages: OpenAiMessage[] = [
    { role: "system", content: externalAssistantGuidance.content },
    { role: "user", content: prompt },
  ];
  const calls: HostToolCall[] = [];
  const exchanges: ChatExchange[] = [];
  const definitions = tools.map((tool) => tool.definition);

  for (let turn = 0; turn < 8; turn += 1) {
    const completion = await chatCompletion({ messages, tools: definitions });
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
      const known = tools.some((tool) => tool.tool === call.function.name);
      if (!known) {
        const result = { error: "The host does not expose this tool." };
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

      const invoked = await invokeHostTool(
        call.function.name,
        args as Record<string, unknown>,
      );
      calls.push({
        name: call.function.name,
        arguments: args,
        result: invoked.result,
        isError: invoked.isError,
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({
          isError: invoked.isError,
          content: invoked.result,
        }),
      });
    }
  }

  return {
    tools,
    toolCalls: calls,
    exchanges,
    finalText: messages.at(-1)?.content?.trim() ?? "",
  };
}

function called(trace: HostTrace, suffix: string): boolean {
  return trace.toolCalls.some(
    (call) => call.name === suffix || call.name.endsWith("_" + suffix),
  );
}

const scenarios: readonly HostScenario[] = [
  {
    id: "llama-create-documents",
    title: "llama.cpp host → application + CV + letter",
    prompt: [
      "Use the AAAAT tools available in this local agent to retain the offer and create both an editable CV and cover letter.",
      "",
      "Northstar Robotics is hiring a Platform Engineer in Barcelona to build TypeScript services and operate Kubernetes workloads.",
    ].join("\n"),
    checks(root, trace) {
      const documents = listDocumentCollections(root);
      return [
        {
          name: "third-party host exposes and model selects AAAAT application documents",
          passed: called(trace, "application_documents_create"),
        },
        {
          name: "third-party host mutation reaches the AAAAT workspace",
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
    title: "llama.cpp host → selected application research round trip",
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
          name: "third-party host reads the selected bounded context",
          passed: called(trace, "opportunity_research_context_read"),
        },
        {
          name: "third-party host returns work through Source retention",
          passed: called(trace, "candidature_source_add") && sources.length >= 2,
        },
      ];
    },
  },
  {
    id: "llama-career-context",
    title: "llama.cpp host → Career context assistance",
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
          name: "third-party host selects Career context read",
          passed: called(trace, "career_context_read"),
        },
        {
          name: "host response uses returned Career context",
          passed:
            containsAny(trace.finalText, ["Backend Engineer", "Platform Engineer"]) &&
            containsAny(trace.finalText, ["remote", "hybrid"]),
        },
      ];
    },
  },
  {
    id: "llama-bounded-authority",
    title: "llama.cpp host → unsupported broad authority stays unavailable",
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
          name: "third-party host exposes no generic AAAAT database or shell tool",
          passed: !trace.tools.some((tool) =>
            tool.tool.includes("database") ||
            tool.tool.includes("shell") ||
            tool.tool.includes("filesystem"),
          ),
        },
        {
          name: "broad unsupported request does not mutate the workspace",
          passed: listCandidatures(root).length === 1,
        },
        {
          name: "host does not fabricate the private workspace path",
          passed: !trace.finalText.includes(root),
        },
      ];
    },
  },
];

evalDescribe("real llama.cpp local-agent host evaluation", () => {
  it("runs repeated AAAAT MCP journeys through a third-party host", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-llama-host-workspace-"));
    const configDir = mkdtempSync(path.join(tmpdir(), "aaaat-llama-host-config-"));
    const configPath = path.join(configDir, "mcp.json");
    const logs: string[] = [];
    let child: ChildProcess | null = null;
    let stage = "initializing";
    let tools: LlamaToolEntry[] = [];
    let launchCommand: readonly string[] = [];
    const trials: EvalTrial[] = [];
    const mcpConfig = {
      mcpServers: {
        aaaat: {
          command: aaaatExecutable,
          args: ["--mcp", "--workspace", root],
          timeout_ms: 60_000,
        },
      },
    };

    try {
      stage = "creating temporary AAAAT workspace";
      createOrOpenWorkspace(root);
      writeFileSync(configPath, JSON.stringify(mcpConfig), "utf8");

      stage = "checking llama.cpp evaluation port";
      try {
        const existing = await fetch(hostRoot() + "/health");
        if (existing.ok) {
          throw new Error(
            "The selected evaluation port already has a running server. " +
              "This host mode must start llama-server itself so it can inject the temporary AAAAT MCP workspace. " +
              "Stop the server using that port or choose another port.",
          );
        }
      } catch (reason) {
        if (
          reason instanceof Error &&
          reason.message.includes("selected evaluation port already has")
        ) {
          throw reason;
        }
      }

      const endpointUrl = new URL(evalEndpoint);
      const port = endpointUrl.port || "8080";
      const launchArgs = [
        "-m", llamaModel,
        "--alias", path.basename(llamaModel),
        "--host", "127.0.0.1",
        "--port", port,
        "--jinja",
        "--no-webui",
        "--mcp-servers-config", configPath,
        "-c", "8192",
      ];
      launchCommand = [llamaServer, ...launchArgs];
      process.stdout.write(
        "\nStarting evaluator-owned llama.cpp host:\n  " +
          launchCommand.map((part) => JSON.stringify(part)).join(" ") +
          "\n\n",
      );

      stage = "starting llama-server";
      child = spawn(
        llamaServer,
        launchArgs,
        { stdio: ["ignore", "pipe", "pipe"], windowsHide: false },
      );
      const recordLog = (stream: "stdout" | "stderr") =>
        (chunk: Buffer | string) => {
          const lines = String(chunk).split(/\r?\n/u).filter(Boolean);
          for (const line of lines) {
            logs.push(stream + ": " + line);
            process.stdout.write("[llama.cpp " + stream + "] " + line + "\n");
          }
          if (logs.length > 200) logs.splice(0, logs.length - 200);
        };
      child.stdout?.on("data", recordLog("stdout"));
      child.stderr?.on("data", recordLog("stderr"));

      stage = "waiting for llama-server health";
      await waitForHealth(child, logs);

      stage = "discovering AAAAT MCP tools";
      tools = await listHostTools();
      if (!tools.some((tool) => tool.tool.endsWith("_application_documents_create"))) {
        throw new Error(
          "llama.cpp did not register the packaged AAAAT MCP tools. " +
            logs.slice(-10).join("\n"),
        );
      }

      for (const scenario of scenarios) {
        for (let repetition = 1; repetition <= evalRepetitions; repetition += 1) {
          resetWorkspace(root);
          scenario.setup?.(root);
          const started = Date.now();
          try {
            const trace = await runHostAgent(tools, scenario.prompt);
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
        throw new Error("llama.cpp host evaluator stopped before all trials ran.");
      }
      stage = "writing completed host report";
      const directory = writeEvalReport({
        mode: "llama-host",
        description:
          "Representative real local-agent-host evidence: llama.cpp owns MCP discovery and execution, spawns packaged AAAAT over stdio, and a real model chooses the exposed AAAAT tools.",
        scenarios,
        trials,
        promptArtifacts: {
          "reusable host guidance": externalAssistantGuidance.content,
          "host MCP tool definitions": tools
            .map((tool) =>
              tool.tool + ": " + tool.definition.function.description +
              "\n" + JSON.stringify(tool.definition.function.parameters),
            )
            .join("\n\n"),
        },
        extra: {
          host: "llama.cpp",
          llamaServer,
          llamaModel,
          toolNames: tools.map((tool) => tool.tool),
          recentHostLogs: logs.slice(-50),
        },
      });
      console.log("llama.cpp host report: " + path.join(directory, "llama-host.md"));
    } catch (reason) {
      const failure = errorInfo(reason);
      const directory = writeEvalReport({
        mode: "llama-host",
        description:
          "llama.cpp local-agent-host evaluation failed before completing the scheduled journeys. " +
          "The report preserves startup, MCP discovery and host diagnostics.",
        scenarios,
        trials,
        promptArtifacts: {
          "reusable host guidance": externalAssistantGuidance.content,
          ...(tools.length > 0
            ? {
                "host MCP tool definitions": tools
                  .map((tool) =>
                    tool.tool + ": " + tool.definition.function.description +
                    "\n" + JSON.stringify(tool.definition.function.parameters),
                  )
                  .join("\n\n"),
              }
            : {}),
        },
        extra: {
          host: "llama.cpp",
          stage,
          failure,
          endpoint: hostRoot(),
          llamaServer,
          llamaModel,
          aaaatExecutable,
          launchCommand,
          mcpConfig,
          toolNames: tools.map((tool) => tool.tool),
          recentHostLogs: logs.slice(-100),
        },
      });
      process.stderr.write(
        "\nllama.cpp host evaluation failed during: " + stage +
          "\nReason: " + failure.message +
          "\nDiagnostic report: " + path.join(directory, "llama-host.json") +
          "\n",
      );
      throw reason;
    } finally {
      if (child && child.exitCode === null) {
        child.kill();
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 5_000);
          child?.once("exit", () => {
            clearTimeout(timer);
            resolve(undefined);
          });
        });
      }
      rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      rmSync(configDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }, 14_400_000);
});
