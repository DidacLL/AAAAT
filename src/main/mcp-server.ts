import { createReadStream, createWriteStream } from "node:fs";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

import { externalCandidatureCreateInputSchema } from "../shared/ai-contracts";
import {
  externalCandidatureSourceAddInputSchema,
  externalCandidatureSourceAddResultSchema,
  externalCareerContextRequestSchema,
  externalCareerContextSchema,
  externalCvContentRequestSchema,
  externalCvContentSchema,
  externalCvDescriptionsRequestSchema,
  externalCvDescriptionsSchema,
  externalCvRenderRequestSchema,
  externalCvRenderResultSchema,
  externalOpportunityResearchContextRequestSchema,
  externalOpportunityResearchContextSchema,
  type ExternalCareerContext,
  type ExternalCvContent,
  type ExternalCvDescriptions,
} from "../shared/external-assistant-contracts";
import {
  addSourceToSelectedOpportunityResearchCandidature,
  selectedOpportunityResearchContext,
} from "./candidature-opportunity-research-access-service";
import { createCandidature } from "./candidature-service";
import { getCareerContextAiDisclosure } from "./career-context-ai-disclosure-service";
import { getCareerContext } from "./career-context-service";
import {
  renderExternallyAuthorizedCv,
  selectedCvContentItems,
} from "./cv-content-access-service";
import { listAiVisibleCvDescriptors } from "./cv-descriptor-service";
import { getSetupEnvironmentSnapshot } from "./setup-environment-service";
import { openWorkspace } from "./workspace";

const mcpFlag = "--mcp";
const workspaceFlag = "--workspace";
const emptyInputSchema = z.object({}).strict();

export const candidatureCreateToolName = "candidature_create";
export const opportunityResearchContextReadToolName = "opportunity_research_context_read";
export const candidatureSourceAddToolName = "candidature_source_add";
export const careerContextReadToolName = "career_context_read";
export const cvDescriptionsReadToolName = "cv_descriptions_read";
export const cvContentReadToolName = "cv_content_read";
export const cvRenderToolName = "cv_render";
export const installerStatusReadToolName = "installer_status_read";
export const configuratorStatusReadToolName = "configurator_status_read";

function exactlyOne(values: readonly string[], value: string): boolean {
  return values.filter((candidate) => candidate === value).length === 1;
}

function projectCareerContext(rootPath: string): ExternalCareerContext {
  const context = getCareerContext(rootPath);
  const disclosure = getCareerContextAiDisclosure(rootPath);
  return externalCareerContextSchema.parse({
    ...(disclosure.careerDirection && context.careerDirection.trim()
      ? { careerDirection: context.careerDirection }
      : {}),
    ...(disclosure.objectives && context.objectives.trim()
      ? { objectives: context.objectives }
      : {}),
    ...(disclosure.constraints && context.constraints.trim()
      ? { constraints: context.constraints }
      : {}),
    ...(disclosure.targetRoles && context.targetRoles.trim()
      ? { targetRoles: context.targetRoles }
      : {}),
    ...(disclosure.targetMarketsLocations && context.targetMarketsLocations.trim()
      ? { targetMarketsLocations: context.targetMarketsLocations }
      : {}),
    ...(disclosure.workPreferences && context.workPreferences.trim()
      ? { workPreferences: context.workPreferences }
      : {}),
    ...(disclosure.applicationWritingPreferences && context.applicationWritingPreferences.trim()
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

function projectCvContent(rootPath: string): ExternalCvContent {
  const items = selectedCvContentItems(rootPath);
  if (items === null) return null;
  return externalCvContentSchema.parse({
    items: items.map((item) => ({
      kind: item.kind,
      title: item.title,
      ...(item.subtitle !== undefined ? { subtitle: item.subtitle } : {}),
      ...(item.description !== undefined ? { description: item.description } : {}),
      ...(item.startDate !== undefined ? { startDate: item.startDate } : {}),
      ...(item.endDate !== undefined ? { endDate: item.endDate } : {}),
      ...(item.url !== undefined ? { url: item.url } : {}),
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
    opportunityResearchContextReadToolName,
    {
      description:
        "Read only the AI-permitted retained information of the single candidature the user locally selected for the external opportunity-research task. Returns null when none is selected. Accepts no candidature, field, query, path, or corpus selector and does not expose Sources, other candidatures, professional information, Career preferences, documents, Concepts, ToDos, activity, IDs, or paths.",
      inputSchema: externalOpportunityResearchContextRequestSchema,
    },
    async (input) => {
      externalOpportunityResearchContextRequestSchema.parse(input);
      const context = externalOpportunityResearchContextSchema.parse(
        selectedOpportunityResearchContext(rootPath),
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(context) }],
      };
    },
  );

  server.registerTool(
    candidatureSourceAddToolName,
    {
      description:
        "Retain one Source on the single candidature the user locally selected for the external opportunity-research task. Accepts only Source material, no candidature selector or local ID, and returns only a bounded acknowledgement or null when no candidature is selected.",
      inputSchema: externalCandidatureSourceAddInputSchema,
    },
    async (input) => {
      const parsed = externalCandidatureSourceAddInputSchema.parse(input);
      const retained = addSourceToSelectedOpportunityResearchCandidature(rootPath, parsed);
      const result = externalCandidatureSourceAddResultSchema.parse(
        retained ? { retained: true } : null,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );

  server.registerTool(
    careerContextReadToolName,
    {
      description:
        "Read only the non-empty user-written AAAAT Career preferences locally permitted for external career assistance. Does not expose hidden Career preferences, candidatures, professional information, documents, local IDs, or workspace paths.",
      inputSchema: externalCareerContextRequestSchema,
    },
    async (input) => {
      externalCareerContextRequestSchema.parse(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(projectCareerContext(rootPath)) }],
      };
    },
  );

  server.registerTool(
    cvDescriptionsReadToolName,
    {
      description:
        "Read only user-authored AI-visible CV tags and notes under response-local labels so an external assistant can help with existing CV material. Does not expose CV titles, document content, local IDs, file paths, professional information, or candidature history.",
      inputSchema: externalCvDescriptionsRequestSchema,
    },
    async (input) => {
      externalCvDescriptionsRequestSchema.parse(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(projectCvDescriptions(rootPath)) }],
      };
    },
  );

  server.registerTool(
    cvContentReadToolName,
    {
      description:
        "Read only the effective resolved professional-information content of the single CV the user has explicitly allowed for external content access. Returns null when no CV is allowed. Does not accept document selectors or expose titles, local IDs, paths, raw TeX/PDF, descriptors, or candidature history.",
      inputSchema: externalCvContentRequestSchema,
    },
    async (input) => {
      externalCvContentRequestSchema.parse(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(projectCvContent(rootPath)) }],
      };
    },
  );

  server.registerTool(
    cvRenderToolName,
    {
      description:
        "Request AAAAT's normal local PDF render for the one content-selected CV only when the user has separately authorized external rendering. Returns null when no CV is authorized. Accepts no document selector, path, engine, command, or output control.",
      inputSchema: externalCvRenderRequestSchema,
    },
    async (input) => {
      externalCvRenderRequestSchema.parse(input);
      const rendered = await renderExternallyAuthorizedCv(rootPath);
      const result = externalCvRenderResultSchema.parse(rendered ? { rendered: true } : null);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );

  server.registerTool(
    installerStatusReadToolName,
    {
      description:
        "Read AAAAT's privacy-minimal installation/prerequisite status: current-workspace readiness, local document-rendering readiness and only the names of missing known TeX tools. This capability cannot install software, execute commands, browse the filesystem or read career/application data.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const snapshot = await getSetupEnvironmentSnapshot(rootPath);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              workspaceReady: snapshot.workspaceReady,
              documentRenderingReady: snapshot.tex.documentRenderingReady,
              missingTools: snapshot.tex.commands
                .filter((command) => !command.available)
                .map((command) => command.command),
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    configuratorStatusReadToolName,
    {
      description:
        "Read AAAAT's privacy-minimal optional AI configuration coverage: whether configuration is readable, connection count and per-operation validated-route availability. It exposes no connection names, endpoints, credentials, prompts, career/application data or mutation authority.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const snapshot = await getSetupEnvironmentSnapshot(rootPath);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              configurationReadable: snapshot.ai.configurationReadable,
              connectionCount: snapshot.ai.connectionCount,
              operations: snapshot.ai.operations.map((status) => ({
                operation: status.operation,
                available: status.available,
              })),
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
  const input = createReadStream("", { fd: 0, autoClose: false });
  const output = createWriteStream("", { fd: 1, autoClose: false });
  const transport = new StdioServerTransport(input, output);
  serveStdio(() => createServerForWorkspace(workspace.rootPath), { transport });
  console.error("AAAAT MCP server ready on stdio");
}
