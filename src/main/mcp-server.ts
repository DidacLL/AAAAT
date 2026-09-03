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

function createServerForWorkspace(rootPath: string): McpServer {
  const server = new McpServer({ name: "aaaat", version: "2.0.0-alpha.0" });

  server.registerTool(
    candidatureCreateToolName,
    {
      description: "Create one new candidature in the configured AAAAT workspace.",
      inputSchema: candidatureInputSchema,
    },
    async (input) => {
      createCandidature(rootPath, input);
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

export function createAaaatMcpServer(workspacePath: string): McpServer {
  return createServerForWorkspace(openWorkspace(workspacePath).rootPath);
}

export function runMcpProcess(argv: readonly string[]): void {
  const workspace = openWorkspace(mcpWorkspaceFromInvocation(argv));
  serveStdio(() => createServerForWorkspace(workspace.rootPath));
  console.error("AAAAT MCP server ready on stdio");
}
