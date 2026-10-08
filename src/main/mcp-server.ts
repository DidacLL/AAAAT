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
  externalApplicationCoverLetterCreateInputSchema,
  externalApplicationCoverLetterCreateResultSchema,
  externalApplicationCvCreateInputSchema,
  externalApplicationCvCreateResultSchema,
  externalApplicationDocumentTargetSchema,
  externalCoverLetterWriteInputSchema,
  externalCvFieldContextInputSchema,
  externalCvFieldContextSchema,
  externalCvFieldWriteInputSchema,
  externalDocumentAppliedResultSchema,
  externalDocumentRenderInputSchema,
  externalDocumentRenderResultSchema,
  externalDocumentRenderingStatusSchema,
  externalReusableCvChoicesSchema,
  externalReusableCvContentSchema,
  externalReusableCvReadInputSchema,
} from "../shared/external-document-contracts";
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
import { createExternalDocumentSession } from "./external-document-service";
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
export const applicationDocumentTargetReadToolName = "application_document_target_read";
export const reusableCvsListToolName = "reusable_cvs_list";
export const reusableCvReadToolName = "reusable_cv_read";
export const applicationCvCreateToolName = "application_cv_create";
export const cvFieldContextReadToolName = "cv_field_context_read";
export const cvFieldWriteToolName = "cv_field_write";
export const applicationCoverLetterCreateToolName = "application_cover_letter_create";
export const coverLetterWriteToolName = "cover_letter_write";
export const documentRenderingStatusToolName = "document_rendering_status";
export const documentRenderToolName = "document_render";
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
  const documentSession = createExternalDocumentSession(rootPath);

  server.registerTool(
    candidatureCreateToolName,
    {
      description: "Create one new application from one retained Source in the configured AAAAT workspace.",
      inputSchema: externalCandidatureCreateInputSchema,
    },
    async (input) => {
      const parsed = externalCandidatureCreateInputSchema.parse(input);
      const created = createCandidature(rootPath, { source: parsed.source, values: [] });
      const applicationRef = documentSession.bindApplication(created.id);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            ok: true,
            capability: "candidature.create",
            created: true,
            applicationRef,
          }),
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
    applicationDocumentTargetReadToolName,
    {
      description: "Bind the one existing application the user explicitly selected for external document work in AAAAT to a session-local reference. Application-information or interview access does not authorize this. Returns null when no application is selected for document work.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const result = externalApplicationDocumentTargetSchema.parse(
        documentSession.applicationTarget(),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    reusableCvsListToolName,
    {
      description: "After document work is authorized by a newly created application or the user's explicit existing-application document selection, list reusable AAAAT CV choices by user-facing name only. This never returns reusable CV contents, PDF metadata, document IDs, paths, PDFs, or other documents.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const result = externalReusableCvChoicesSchema.parse(
        documentSession.listReusableCvs(),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    reusableCvReadToolName,
    {
      description: "Read only the one reusable CV chosen from reusable_cvs_list. AAAAT fails closed for content without an AI-disclosure choice: private blocks expose only AAAAT-supplied USERPRIVATE placeholders, not semantic item metadata or values. Layout and Blueprint data are excluded.",
      inputSchema: externalReusableCvReadInputSchema,
    },
    async (input) => {
      const parsed = externalReusableCvReadInputSchema.parse(input);
      const result = externalReusableCvContentSchema.parse(
        documentSession.readReusableCv(parsed.cvRef),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    applicationCvCreateToolName,
    {
      description: "Create one editable application Working CV from the chosen reusable CV and the session-selected application. Returns only a session-local CV reference and its existing writable field references; it does not render or choose presentation.",
      inputSchema: externalApplicationCvCreateInputSchema,
    },
    async (input) => {
      const parsed = externalApplicationCvCreateInputSchema.parse(input);
      const result = externalApplicationCvCreateResultSchema.parse(
        documentSession.createApplicationCv(
          parsed.applicationRef,
          parsed.reusableCvRef,
        ),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    cvFieldContextReadToolName,
    {
      description: "Read AAAAT's bounded writing context for one existing writable field of one session-bound Working CV. Private values are represented only by AAAAT-supplied USERPRIVATE placeholders.",
      inputSchema: externalCvFieldContextInputSchema,
    },
    async (input) => {
      const parsed = externalCvFieldContextInputSchema.parse(input);
      const result = externalCvFieldContextSchema.parse(
        documentSession.cvFieldContext(parsed.cvRef, parsed.fieldRef),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    cvFieldWriteToolName,
    {
      description: "Apply external-AI content to exactly one existing Working CV title, subtitle, or description field after its bounded context was read. AAAAT preserves sections, order, layout roles, Blueprint ownership, and all other fields.",
      inputSchema: externalCvFieldWriteInputSchema,
    },
    async (input) => {
      const parsed = externalCvFieldWriteInputSchema.parse(input);
      const result = externalDocumentAppliedResultSchema.parse(
        documentSession.writeCvField(
          parsed.cvRef,
          parsed.fieldRef,
          parsed.content,
        ),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    applicationCoverLetterCreateToolName,
    {
      description: "Create one empty editable cover letter for the session-selected application. Creation does not draft prose and is separate from writing or rendering.",
      inputSchema: externalApplicationCoverLetterCreateInputSchema,
    },
    async (input) => {
      const parsed = externalApplicationCoverLetterCreateInputSchema.parse(input);
      const result = externalApplicationCoverLetterCreateResultSchema.parse(
        documentSession.createApplicationCoverLetter(parsed.applicationRef),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    coverLetterWriteToolName,
    {
      description: "Apply one bounded external-AI cover-letter draft to the editable letter created in this session. AAAAT restores only exact private placeholders it supplied for this document work and rejects unresolved placeholder text. The result remains ordinary editable AAAAT letter content and this action does not render it.",
      inputSchema: externalCoverLetterWriteInputSchema,
    },
    async (input) => {
      const parsed = externalCoverLetterWriteInputSchema.parse(input);
      const result = externalDocumentAppliedResultSchema.parse(
        documentSession.writeCoverLetter(parsed.letterRef, parsed.draft),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    documentRenderingStatusToolName,
    {
      description: "Report only whether AAAAT's local document rendering is currently available.",
      inputSchema: emptyInputSchema,
    },
    async (input) => {
      emptyInputSchema.parse(input);
      const result = externalDocumentRenderingStatusSchema.parse(
        await documentSession.renderingStatus(),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    documentRenderToolName,
    {
      description: "Render one session-bound Working CV or cover letter locally using AAAAT-owned presentation. Returns only whether rendering succeeded; no paths, TeX, commands, PDF content, Blueprint controls, or process access are exposed.",
      inputSchema: externalDocumentRenderInputSchema,
    },
    async (input) => {
      const parsed = externalDocumentRenderInputSchema.parse(input);
      const result = externalDocumentRenderResultSchema.parse(
        await documentSession.renderDocument(parsed.documentRef),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
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
