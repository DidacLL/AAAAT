import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { Writable } from "node:stream";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { z } from "zod";

import { openWorkspace } from "./workspace";
import { vscodeMcpSetupRecipe } from "./setup-knowledge";

const setupFlag = "--vscode-mcp-setup";
const workspaceFlag = "--workspace";
const projectFlag = "--project";
const activateFlag = "--activate";
const manifestRelativePath = path.join("integrations", "vscode-mcp.json");

const manifestSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("aaaat.host-integration"),
    host: z.literal("vscode"),
    state: z.literal("proposed"),
    transport: z.literal("stdio"),
    capabilityNames: z.array(z.string()).length(1),
    toolNames: z.array(z.string()).length(1),
    permissionScope: z.string().min(1),
    privacyDisclosure: z.string().min(1),
    recipeId: z.literal("vscode.mcp"),
  })
  .strict();

type HostManifest = z.infer<typeof manifestSchema>;
type SetupState = "configured" | "already-configured";

interface SetupInvocation {
  readonly workspacePath: string;
  readonly projectPath: string;
  readonly activate: boolean;
}

export interface VscodeMcpActivationInput {
  readonly workspacePath: string;
  readonly projectPath: string;
  readonly executablePath: string;
}

type VerifyConnection = (executablePath: string, workspacePath: string) => Promise<void>;

function expectedManifest(): HostManifest {
  return {
    version: 1,
    kind: "aaaat.host-integration",
    host: vscodeMcpSetupRecipe.host,
    state: "proposed",
    transport: vscodeMcpSetupRecipe.transport,
    capabilityNames: [...vscodeMcpSetupRecipe.capabilityNames],
    toolNames: [...vscodeMcpSetupRecipe.toolNames],
    permissionScope: vscodeMcpSetupRecipe.permissionScope,
    privacyDisclosure: vscodeMcpSetupRecipe.privacyDisclosure,
    recipeId: vscodeMcpSetupRecipe.id,
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function exactlyOne(values: readonly string[], value: string): boolean {
  return values.filter((candidate) => candidate === value).length === 1;
}

function valueAfter(argv: readonly string[], flag: string): string {
  if (!exactlyOne(argv, flag)) throw new Error("Invalid VS Code setup invocation.");
  const value = argv[argv.indexOf(flag) + 1];
  if (!value || value.startsWith("--")) throw new Error("Invalid VS Code setup invocation.");
  return value;
}

export function isVscodeMcpSetupInvocation(argv: readonly string[]): boolean {
  return argv.includes(setupFlag);
}

export function parseVscodeMcpSetupInvocation(argv: readonly string[]): SetupInvocation {
  if (!exactlyOne(argv, setupFlag) || argv.filter((value) => value === activateFlag).length > 1) {
    throw new Error("Invalid VS Code setup invocation.");
  }
  return {
    workspacePath: valueAfter(argv, workspaceFlag),
    projectPath: valueAfter(argv, projectFlag),
    activate: argv.includes(activateFlag),
  };
}

function canonicalDirectory(directoryPath: string): string {
  if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
    throw new Error("Required setup directory is unavailable.");
  }
  const canonical = realpathSync(directoryPath);
  accessSync(canonical, constants.R_OK | constants.W_OK);
  return canonical;
}

function canonicalExecutable(executablePath: string): string {
  if (!existsSync(executablePath) || !statSync(executablePath).isFile()) {
    throw new Error("AAAAT executable is unavailable.");
  }
  const canonical = realpathSync(executablePath);
  accessSync(canonical, constants.R_OK);
  return canonical;
}

function manifestPath(workspacePath: string): string {
  return path.join(workspacePath, manifestRelativePath);
}

function readManifest(workspacePath: string): HostManifest {
  const parsed = manifestSchema.parse(JSON.parse(readFileSync(manifestPath(workspacePath), "utf8")));
  if (!sameJson(parsed, expectedManifest())) {
    throw new Error("The VS Code integration manifest is incompatible.");
  }
  return parsed;
}

export function proposeVscodeMcpSetup(workspacePath: string, projectPath: string): HostManifest {
  const workspace = openWorkspace(workspacePath).rootPath;
  canonicalDirectory(projectPath);
  const expected = expectedManifest();
  const destination = manifestPath(workspace);
  mkdirSync(path.dirname(destination), { recursive: true });
  if (existsSync(destination)) {
    const existing = manifestSchema.parse(JSON.parse(readFileSync(destination, "utf8")));
    if (!sameJson(existing, expected)) {
      throw new Error("An incompatible VS Code integration manifest already exists.");
    }
    return existing;
  }
  writeFileSync(destination, JSON.stringify(expected, null, 2) + "\n", "utf8");
  return expected;
}

function inheritedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export async function verifyVscodeMcpConnection(
  executablePath: string,
  workspacePath: string,
): Promise<void> {
  const transport = new StdioClientTransport({
    command: executablePath,
    args: ["--mcp", "--workspace", workspacePath],
    env: inheritedEnvironment(),
  });
  const client = new Client({ name: "aaaat-vscode-setup", version: "1.0.0" });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    if (!sameJson(tools.tools.map((tool) => tool.name), vscodeMcpSetupRecipe.toolNames)) {
      throw new Error("The MCP capability surface does not match the proposed integration.");
    }
  } finally {
    await client.close().catch(() => undefined);
  }
}

function serverEntry(executablePath: string, workspacePath: string) {
  return {
    type: "stdio",
    command: executablePath,
    args: ["--mcp", "--workspace", workspacePath],
  } as const;
}

function readHostConfig(configPath: string): Record<string, unknown> {
  if (!existsSync(configPath)) return {};
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The existing VS Code MCP configuration is invalid.");
  }
  return parsed as Record<string, unknown>;
}

export async function activateVscodeMcpSetup(
  input: VscodeMcpActivationInput,
  verifyConnection: VerifyConnection = verifyVscodeMcpConnection,
): Promise<SetupState> {
  const workspace = openWorkspace(input.workspacePath).rootPath;
  const project = canonicalDirectory(input.projectPath);
  const executable = canonicalExecutable(input.executablePath);
  readManifest(workspace);

  await verifyConnection(executable, workspace);

  const configPath = path.join(project, ".vscode", "mcp.json");
  const config = readHostConfig(configPath);
  const serversValue = config.servers;
  if (serversValue !== undefined && (!serversValue || typeof serversValue !== "object" || Array.isArray(serversValue))) {
    throw new Error("The existing VS Code MCP servers configuration is invalid.");
  }
  const servers = (serversValue ?? {}) as Record<string, unknown>;
  const expectedServer = serverEntry(executable, workspace);
  if (servers.aaaat !== undefined) {
    if (!sameJson(servers.aaaat, expectedServer)) {
      throw new Error("A conflicting AAAAT VS Code MCP server is already configured.");
    }
    return "already-configured";
  }

  const updated = {
    ...config,
    servers: {
      ...servers,
      aaaat: expectedServer,
    },
  };
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(updated, null, 2) + "\n", "utf8");
  return "configured";
}

function writeResponse(stdout: Writable, response: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    stdout.write(JSON.stringify(response) + "\n", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function runVscodeMcpSetupProcess(
  argv: readonly string[],
  executablePath: string,
  stdout: Writable,
): Promise<number> {
  try {
    const invocation = parseVscodeMcpSetupInvocation(argv);
    if (!invocation.activate) {
      proposeVscodeMcpSetup(invocation.workspacePath, invocation.projectPath);
      await writeResponse(stdout, { ok: true, host: "vscode", state: "proposed" });
      return 0;
    }
    const state = await activateVscodeMcpSetup({
      workspacePath: invocation.workspacePath,
      projectPath: invocation.projectPath,
      executablePath,
    });
    await writeResponse(stdout, { ok: true, host: "vscode", state });
    return 0;
  } catch {
    await writeResponse(stdout, { ok: false, error: "setup-failed" });
    return 2;
  }
}
