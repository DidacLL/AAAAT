// @vitest-environment node
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, it } from "vitest";
import { createOrOpenWorkspace } from "../../src/main/workspace";
import { evalEnabled, requiredEnv, writeEvalReport, type OpenAiToolDefinition } from "./eval-runtime";
import { runMcpSuite } from "./mcp-journey-runner";

const aaaatExecutable = evalEnabled ? requiredEnv("AAAAT_PACKAGED_EXECUTABLE") : "aaaat";

function childEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" &&
        !["AAAAT_AI_EVAL_CREDENTIAL","AAAAT_AI_EVAL_CONNECTIONS_JSON"].includes(entry[0]),
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

    if (!["candidature_create", "application_information_task_read", "application_cover_letter_create", "document_render"].every(name => tools.some(tool => tool.function.name === name))) {
      throw new Error(
        "Packaged AAAAT MCP initialized but required current production tools were missing.",
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


describe.runIf(evalEnabled)("AAAAT packaged MCP and real local-model journeys", () => {
  it("preserves process startup diagnostics and evaluates the same current product journey catalog", async () => {
    const root=mkdtempSync(path.join(tmpdir(),"aaaat-host-preflight-"));
    let diagnostics:PackagedMcpDiagnostics;
    try {
      createOrOpenWorkspace(root);
      const ready=await preflightPackagedAaaat(root);
      diagnostics=ready.diagnostics;
    } catch(reason) {
      const details=reason instanceof PackagedMcpPreflightError ? reason.diagnostics : null;
      writeEvalReport({
        mode:"host",description:"Packaged AAAAT process/MCP preflight failed before model evaluation.",
        scenarios:[],trials:[],extra:{packagedMcpDiagnostics:details,preflightError:reason instanceof Error?reason.message:String(reason)},
      });
      throw reason;
    } finally {
      rmSync(root,{recursive:true,force:true,maxRetries:5});
    }
    await runMcpSuite("host",async (workspace) => {
      const connected=await connectPackagedAaaat(workspace);
      return {client:connected.client,close:connected.close};
    }, {packagedMcpDiagnostics:diagnostics});
  },14_400_000);
});
