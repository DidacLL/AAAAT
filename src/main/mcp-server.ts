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
  externalOpportunityResearchContextRequestSchema,
  externalOpportunityResearchContextSchema,
  type ExternalCareerContext,
} from "../shared/external-assistant-contracts";
import {
  externalConfiguratorConnectionInputSchema,
  externalConfiguratorConnectionResultSchema,
  externalConfiguratorDefaultResultSchema,
  externalConfiguratorOperationInputSchema,
  externalConfiguratorValidationResultSchema,
} from "../shared/external-action-contracts";
import {
  applicationDocumentsIntentSchema,
  applicationDocumentsResultSchema,
} from "../shared/application-material-contracts";
import {
  listAiConnections,
  saveNamedAiConnection,
  setAiOperationDefault,
  validateAiConnectionOperation,
} from "./ai-connection-service";
import { createApplicationDocuments } from "./application-material-service";
import {
  addSourceToSelectedOpportunityResearchCandidature,
  selectedOpportunityResearchContext,
} from "./candidature-opportunity-research-access-service";
import { createCandidature } from "./candidature-service";
import { getCareerContextAiDisclosure } from "./career-context-ai-disclosure-service";
import { getCareerContext } from "./career-context-service";
import {
  requireConfiguratorActionsAllowed,
  requireInstallerActionsAllowed,
  runRenderingSelfTest,
} from "./setup-assistant-service";
import { getSetupEnvironmentSnapshot } from "./setup-environment-service";
import { openWorkspace } from "./workspace";

const mcpFlag = "--mcp";
const workspaceFlag = "--workspace";
const emptyInputSchema = z.object({}).strict();

export const candidatureCreateToolName = "candidature_create";
export const applicationDocumentsCreateToolName = "application_documents_create";
export const opportunityResearchContextReadToolName = "opportunity_research_context_read";
export const candidatureSourceAddToolName = "candidature_source_add";
export const careerContextReadToolName = "career_context_read";
export const installerStatusReadToolName = "installer_status_read";
export const installerRenderingSelfTestToolName = "installer_rendering_self_test";
export const configuratorStatusReadToolName = "configurator_status_read";
export const configuratorAiConnectionSaveToolName = "configurator_ai_connection_save";
export const configuratorAiOperationValidateToolName = "configurator_ai_operation_validate";
export const configuratorAiOperationDefaultToolName = "configurator_ai_operation_default";

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
    ...(disclosure.objectives && context.objectives.trim() ? { objectives: context.objectives } : {}),
    ...(disclosure.constraints && context.constraints.trim() ? { constraints: context.constraints } : {}),
    ...(disclosure.targetRoles && context.targetRoles.trim() ? { targetRoles: context.targetRoles } : {}),
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

function connectionIdByName(rootPath: string, name: string): string {
  const connection = listAiConnections(rootPath).find(
    (candidate) => candidate.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  if (!connection) throw new Error(`No AAAAT AI connection named ${name} exists.`);
  return connection.id;
}

export function isMcpInvocation(argv: readonly string[]): boolean {
  return argv.includes(mcpFlag);
}

export function mcpWorkspaceFromInvocation(argv: readonly string[]): string {
  if (!exactlyOne(argv, mcpFlag) || !exactlyOne(argv, workspaceFlag)) {
    throw new Error("Invalid MCP invocation.");
  }
  const workspacePath = argv[argv.indexOf(workspaceFlag) + 1];
  if (!workspacePath || workspacePath.startsWith("--")) throw new Error("Invalid MCP invocation.");
  return workspacePath;
}

function createServerForWorkspace(rootPath: string): McpServer {
  const server = new McpServer({ name: "aaaat", version: "2.0.0-alpha.0" });

  server.registerTool(
    candidatureCreateToolName,
    {
      description: "Create one new application from one retained Source in the configured AAAAT workspace.",
      inputSchema: externalCandidatureCreateInputSchema,
    },
    async (input) => {
      const parsed = externalCandidatureCreateInputSchema.parse(input);
      createCandidature(rootPath, { source: parsed.source, values: [] });
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ok: true, capability: "candidature.create", created: true }) }],
      };
    },
  );

  server.registerTool(
    applicationDocumentsCreateToolName,
    {
      description: "Create a retained AAAAT application from job-offer text and immediately create its requested Working CV, cover letter, or both. Optional configured AI may prepare them, while manual editing remains complete. Returns no local IDs or paths.",
      inputSchema: applicationDocumentsIntentSchema,
    },
    async (input) => {
      const result = applicationDocumentsResultSchema.parse(
        await createApplicationDocuments(rootPath, applicationDocumentsIntentSchema.parse(input)),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    opportunityResearchContextReadToolName,
    {
      description: "Read only the AI-permitted retained information of the single application the user locally selected for the external opportunity-research task. Returns null when none is selected.",
      inputSchema: externalOpportunityResearchContextRequestSchema,
    },
    async (input) => {
      externalOpportunityResearchContextRequestSchema.parse(input);
      const context = externalOpportunityResearchContextSchema.parse(selectedOpportunityResearchContext(rootPath));
      return { content: [{ type: "text" as const, text: JSON.stringify(context) }] };
    },
  );

  server.registerTool(
    candidatureSourceAddToolName,
    {
      description: "Retain one Source on the single application the user locally selected for external opportunity research. Accepts no application selector or local ID.",
      inputSchema: externalCandidatureSourceAddInputSchema,
    },
    async (input) => {
      const parsed = externalCandidatureSourceAddInputSchema.parse(input);
      const retained = addSourceToSelectedOpportunityResearchCandidature(rootPath, parsed);
      const result = externalCandidatureSourceAddResultSchema.parse(retained ? { retained: true } : null);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    careerContextReadToolName,
    {
      description: "Read only non-empty user-written Career preferences locally permitted for external career assistance.",
      inputSchema: externalCareerContextRequestSchema,
    },
    async (input) => {
      externalCareerContextRequestSchema.parse(input);
      return { content: [{ type: "text" as const, text: JSON.stringify(projectCareerContext(rootPath)) }] };
    },
  );

  server.registerTool(
    installerStatusReadToolName,
    {
      description: "Read AAAAT's privacy-minimal local workspace and PDF-rendering prerequisite status.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const snapshot = await getSetupEnvironmentSnapshot(rootPath);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          workspaceReady: snapshot.workspaceReady,
          documentRenderingReady: snapshot.tex.documentRenderingReady,
          missingTools: snapshot.tex.commands.filter((command) => !command.available).map((command) => command.command),
        }) }],
      };
    },
  );

  server.registerTool(
    installerRenderingSelfTestToolName,
    {
      description: "Check AAAAT's bounded local document-rendering readiness. The user must enable installer.ai actions in Settings first.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      requireInstallerActionsAllowed(rootPath);
      const result = await runRenderingSelfTest(rootPath);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    configuratorStatusReadToolName,
    {
      description: "Read privacy-minimal optional AI configuration coverage and per-operation validated-route availability.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const snapshot = await getSetupEnvironmentSnapshot(rootPath);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          configurationReadable: snapshot.ai.configurationReadable,
          connectionCount: snapshot.ai.connectionCount,
          operations: snapshot.ai.operations.map((status) => ({ operation: status.operation, available: status.available })),
        }) }],
      };
    },
  );

  server.registerTool(
    configuratorAiConnectionSaveToolName,
    {
      description: "Create or update one named AAAAT AI connection using only name, endpoint and model. The user must enable configurator.ai actions in Settings first.",
      inputSchema: externalConfiguratorConnectionInputSchema,
    },
    async (input) => {
      requireConfiguratorActionsAllowed(rootPath);
      const parsed = externalConfiguratorConnectionInputSchema.parse(input);
      const existing = listAiConnections(rootPath).find(
        (connection) => connection.name.toLocaleLowerCase() === parsed.name.toLocaleLowerCase(),
      );
      saveNamedAiConnection(rootPath, { ...parsed, ...(existing ? { id: existing.id } : {}) });
      const result = externalConfiguratorConnectionResultSchema.parse({ saved: true });
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    configuratorAiOperationValidateToolName,
    {
      description: "Validate one named configured connection for one typed AAAAT AI operation. The user must enable configurator.ai actions first.",
      inputSchema: externalConfiguratorOperationInputSchema,
    },
    async (input) => {
      requireConfiguratorActionsAllowed(rootPath);
      const parsed = externalConfiguratorOperationInputSchema.parse(input);
      const connectionId = connectionIdByName(rootPath, parsed.connectionName);
      await validateAiConnectionOperation(rootPath, { connectionId, operation: parsed.operation });
      const result = externalConfiguratorValidationResultSchema.parse({ validated: true, operation: parsed.operation });
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    configuratorAiOperationDefaultToolName,
    {
      description: "Choose one already validated named connection as the default for one typed AAAAT AI operation.",
      inputSchema: externalConfiguratorOperationInputSchema,
    },
    async (input) => {
      requireConfiguratorActionsAllowed(rootPath);
      const parsed = externalConfiguratorOperationInputSchema.parse(input);
      const connectionId = connectionIdByName(rootPath, parsed.connectionName);
      setAiOperationDefault(rootPath, { connectionId, operation: parsed.operation });
      const result = externalConfiguratorDefaultResultSchema.parse({ defaulted: true, operation: parsed.operation });
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
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
