import { createReadStream, createWriteStream } from "node:fs";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { externalCandidatureCreateInputSchema } from "../shared/ai-contracts";
import {
  externalCareerContextRequestSchema,
  externalCareerContextSchema,
  externalCvDescriptionsRequestSchema,
  externalCvDescriptionsSchema,
  type ExternalCareerContext,
  type ExternalCvDescriptions,
} from "../shared/external-assistant-contracts";
import { createCandidature } from "./candidature-service";
import { getCareerContext } from "./career-context-service";
import { listAiVisibleCvDescriptors } from "./cv-descriptor-service";
import { openWorkspace } from "./workspace";

const mcpFlag = "--mcp";
const workspaceFlag = "--workspace";
export const candidatureCreateToolName = "candidature_create";
export const careerContextReadToolName = "career_context_read";
export const cvDescriptionsReadToolName = "cv_descriptions_read";

function exactlyOne(values: readonly string[], value: string): boolean {
  return values.filter((candidate) => candidate === value).length === 1;
}

function projectCareerContext(rootPath: string): ExternalCareerContext {
  const context = getCareerContext(rootPath);
  return externalCareerContextSchema.parse({
    ...(context.careerDirection.trim() ? { careerDirection: context.careerDirection } : {}),
    ...(context.objectives.trim() ? { objectives: context.objectives } : {}),
    ...(context.constraints.trim() ? { constraints: context.constraints } : {}),
    ...(context.targetRoles.trim() ? { targetRoles: context.targetRoles } : {}),
    ...(context.targetMarketsLocations.trim()
      ? { targetMarketsLocations: context.targetMarketsLocations }
      : {}),
    ...(context.workPreferences.trim() ? { workPreferences: context.workPreferences } : {}),
    ...(context.applicationWritingPreferences.trim()
      ? { applicationWritingPreferences: context.applicationWritingPreferences }
      : {}),
  });
}

function projectCvDescriptions(rootPath: string): ExternalCvDescriptions {
  return externalCvDescriptionsSchema.parse({
    cvs: listAiVisibleCvDescriptors(rootPath).map((descriptor, index) => ({
      label: `CV ${index + 1}`,
      tags: descriptor.tags,
      ...(descriptor.notes ? { notes: descriptor.notes } : {}),
    })),
  });
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
      description:
        "Create one new candidature from one retained Source in the configured AAAAT workspace.",
      inputSchema: externalCandidatureCreateInputSchema,
    },
    async (input) => {
      const parsed = externalCandidatureCreateInputSchema.parse(input);
      createCandidature(rootPath, { source: parsed.source, values: [] });
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

  server.registerTool(
    careerContextReadToolName,
    {
      description:
        "Read only the non-empty user-written AAAAT Career Context fields permitted for external career assistance. Does not expose candidatures, profile items, documents, local IDs, or workspace paths.",
      inputSchema: externalCareerContextRequestSchema,
    },
    async (input) => {
      externalCareerContextRequestSchema.parse(input);
      const context = projectCareerContext(rootPath);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(context),
          },
        ],
      };
    },
  );

  server.registerTool(
    cvDescriptionsReadToolName,
    {
      description:
        "Read only user-authored AI-visible CV tags and notes under response-local labels so an external assistant can judge whether existing CV material may be suitable. Does not expose CV titles, document content, local IDs, file paths, profile data, or candidature history.",
      inputSchema: externalCvDescriptionsRequestSchema,
    },
    async (input) => {
      externalCvDescriptionsRequestSchema.parse(input);
      const descriptions = projectCvDescriptions(rootPath);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(descriptions),
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
  const input = createReadStream("", { fd: 0, autoClose: false });
  const output = createWriteStream("", { fd: 1, autoClose: false });
  const transport = new StdioServerTransport(input, output);
  serveStdio(() => createServerForWorkspace(workspace.rootPath), { transport });
  console.error("AAAAT MCP server ready on stdio");
}
