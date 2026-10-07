import { createReadStream, createWriteStream } from "node:fs";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

import { externalCandidatureCreateInputSchema } from "../shared/ai-contracts";
import {
  externalApplicationInformationProposalInputSchema,
  externalApplicationInformationTaskSchema,
  externalInterviewPreparationContextSchema,
  externalInterviewPreparationResultSchema,
} from "../shared/external-assistant-contracts";
import {
  externalConfiguratorConnectionInputSchema,
  externalConfiguratorConnectionResultSchema,
  externalConfiguratorDefaultResultSchema,
  externalConfiguratorOperationInputSchema,
  externalConfiguratorValidationResultSchema,
} from "../shared/external-action-contracts";
import {
  listAiConnections,
  saveNamedAiConnection,
  setAiOperationDefault,
  validateAiConnectionOperation,
} from "./ai-connection-service";
import {
  selectedInterviewPreparationContext,
  retainInterviewPreparationResult,
  selectedApplicationInformationTask,
  submitApplicationInformationProposals,
} from "./candidature-opportunity-research-access-service";
import { createCandidature } from "./candidature-service";
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
export const applicationInformationTaskReadToolName = "application_information_task_read";
export const applicationInformationProposalsSubmitToolName = "application_information_proposals_submit";
export const interviewPreparationContextReadToolName = "interview_preparation_context_read";
export const interviewPreparationResultSaveToolName = "interview_preparation_result_save";
export const installerStatusReadToolName = "installer_status_read";
export const installerRenderingSelfTestToolName = "installer_rendering_self_test";
export const configuratorStatusReadToolName = "configurator_status_read";
export const configuratorAiConnectionSaveToolName = "configurator_ai_connection_save";
export const configuratorAiOperationValidateToolName = "configurator_ai_operation_validate";
export const configuratorAiOperationDefaultToolName = "configurator_ai_operation_default";

function exactlyOne(values: readonly string[], value: string): boolean {
  return values.filter((candidate) => candidate === value).length === 1;
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
        content: [{
          type: "text" as const,
          text: JSON.stringify({ ok: true, capability: "candidature.create", created: true }),
        }],
      };
    },
  );

  server.registerTool(
    applicationInformationTaskReadToolName,
    {
      description: "Read the bounded application-information task the user prepared for the currently selected AAAAT application. Returns null when no such task is prepared.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const task = selectedApplicationInformationTask(rootPath);
      const parsed = task === null ? null : externalApplicationInformationTaskSchema.parse(task);
      return { content: [{ type: "text" as const, text: JSON.stringify(parsed) }] };
    },
  );

  server.registerTool(
    applicationInformationProposalsSubmitToolName,
    {
      description: "Return bounded field proposals for the prepared application-information task. AAAAT validates them locally and presents usable values for user review; this tool does not save application fields.",
      inputSchema: externalApplicationInformationProposalInputSchema,
    },
    async (input) => {
      const parsed = externalApplicationInformationProposalInputSchema.parse(input);
      const pending = submitApplicationInformationProposals(rootPath, parsed);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            accepted: true,
            usableProposals: pending.result.proposals.length,
            proposalsNeedingReview: pending.result.issues.length,
          }),
        }],
      };
    },
  );

  server.registerTool(
    interviewPreparationContextReadToolName,
    {
      description: "Read bounded context for preparing an interview for the application the user selected in AAAAT.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const context = externalInterviewPreparationContextSchema.parse(
        selectedInterviewPreparationContext(rootPath),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(context) }] };
    },
  );

  server.registerTool(
    interviewPreparationResultSaveToolName,
    {
      description: "Save completed interview preparation as a Source on the application selected in AAAAT. This does not propose or mutate application fields.",
      inputSchema: externalInterviewPreparationResultSchema,
    },
    async (input) => {
      const parsed = externalInterviewPreparationResultSchema.parse(input);
      retainInterviewPreparationResult(rootPath, parsed.text);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ retained: true }),
        }],
      };
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
