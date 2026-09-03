import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { candidatureInputSchema } from "../shared/contracts";
import { createCandidature } from "./candidature-service";
import { openWorkspace } from "./workspace";

const mcpFlag = "--mcp";
const workspaceFlag = "--workspace";
export const candidatureCreateToolName = "candidature_create";

function exactlyOne(values: readonly string[], value: string): boolean {
  return values.filter((candidate) => candidate === value).length === 1;
}

export function isMcpInvocation(argv: readonly string[]): boolean {
  return argv.includes(mcpFlag);
}

export function mcpWorkspaceFromInvocation(argv: readonly string[]): string {
  if (!exactlyOne(argv, mcpFlag) || !exactlyOne(argv, workspaceFlag)) {
    throw new Error("Invalid MCP invocation.");
  }

  const workspacePath = argv[argv.indexOf(workspaceFlag) + 1];
  if (!workspacePath || workspacePath.startsWith("--")) {
    throw new Error("Invalid MCP invocation.");
  }
  return workspacePath;
}

export function createAaaatMcpServer(workspacePath: string): McpServer {
  const workspace = openWorkspace(workspacePath);
  const server = new McpServer({ name: "aaaat", version: "2.0.0-alpha.0" });

  server.registerTool(
    candidatureCreateToolName,
    {
      description: "Create one new candidature in the configured AAAAT workspace.",
      inputSchema: candidatureInputSchema,
    },
    async (input) => {
      createCandidature(workspace.rootPath, input);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              ok: true,
              capability: "candidature.create",
              created: true,
            }),
          },
        ],
      };
    },
  );

  return server;
}

export async function runMcpProcess(argv: readonly string[]): Promise<void> {
  const workspacePath = mcpWorkspaceFromInvocation(argv);
  openWorkspace(workspacePath);
  await serveStdio(() => createAaaatMcpServer(workspacePath));
}
