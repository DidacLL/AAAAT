import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { clipboard, dialog, ipcMain, type BrowserWindow } from "electron";

import {
  candidatureApplicationInformationResultImportResultSchema,
  candidatureExternalAiCopyResultSchema,
  candidatureExternalAiExportResultSchema,
  candidatureExternalAiRequestTextSchema,
  candidatureExternalAiResultInputSchema,
  candidatureInterviewResultImportResultSchema,
  candidatureInterviewResultRetainResultSchema,
  candidatureOpportunityResearchAccessChannels,
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
  externalApplicationInformationPendingResultOptionalSchema,
  externalApplicationInformationPendingResultSchema,
  externalApplicationInformationTaskSchema,
  externalInterviewPreparationContextSchema,
} from "../shared/candidature-opportunity-research-access-contracts";
import {
  saveApplicationInformationRequest,
  saveInterviewPreparationRequest,
  importApplicationInformationPortableResult,
  prepareInterviewPreparationContext,
  maxExternalAiPortableResultBytes,
  prepareApplicationInformationTask,
  retainInterviewPreparationResult,
  takeApplicationInformationResult,
  getCandidatureOpportunityResearchAccess,
  updateCandidatureOpportunityResearchAccess,
} from "./candidature-opportunity-research-access-service";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

function requirePortableResultFile(filePath: string): string {
  const stat = lstatSync(filePath);
  if (!stat.isFile() || stat.size > maxExternalAiPortableResultBytes) {
    throw new Error("The selected external AI result is invalid or too large.");
  }
  return readFileSync(filePath, "utf8");
}

export function registerCandidatureOpportunityResearchAccessIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(candidatureOpportunityResearchAccessChannels)) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.current,
    (event, candidatureId: unknown) => {
      assertTrustedSender(event, mainWindow);
      return candidatureOpportunityResearchAccessSchema.parse(
        getCandidatureOpportunityResearchAccess(
          requireWorkspaceRoot(),
          candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId),
        ),
      );
    },
  );

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureOpportunityResearchAccessSchema.parse(
      updateCandidatureOpportunityResearchAccess(
        requireWorkspaceRoot(),
        candidatureOpportunityResearchAccessUpdateSchema.parse(input),
      ),
    );
  });

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.applicationInformationTask,
    (event, rawInput: unknown) => {
      assertTrustedSender(event, mainWindow);
      return externalApplicationInformationTaskSchema.parse(
        prepareApplicationInformationTask(
          requireWorkspaceRoot(),
          candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(rawInput),
        ),
      );
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.takeApplicationInformationResult,
    (event, candidatureId: unknown) => {
      assertTrustedSender(event, mainWindow);
      return externalApplicationInformationPendingResultOptionalSchema.parse(
        takeApplicationInformationResult(
          requireWorkspaceRoot(),
          candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId),
        ),
      );
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.copyApplicationInformationTask,
    (event, rawInput: unknown) => {
      assertTrustedSender(event, mainWindow);
      const input = candidatureExternalAiRequestTextSchema.parse(rawInput);
      clipboard.writeText(
        saveApplicationInformationRequest(requireWorkspaceRoot(), input.candidatureId, input.text),
      );
      return candidatureExternalAiCopyResultSchema.parse("copied");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.exportApplicationInformationTask,
    async (event, rawInput: unknown) => {
      assertTrustedSender(event, mainWindow);
      const input = candidatureExternalAiRequestTextSchema.parse(rawInput);
      const task = saveApplicationInformationRequest(
        requireWorkspaceRoot(), input.candidatureId, input.text,
      );
      const selection = await dialog.showSaveDialog(mainWindow, {
        title: "Export application information task",
        buttonLabel: "Export task",
        defaultPath: "aaaat-application-information-task.md",
        filters: [
          { name: "Markdown", extensions: ["md"] },
          { name: "Text", extensions: ["txt"] },
        ],
      });
      if (selection.canceled || !selection.filePath) {
        return candidatureExternalAiExportResultSchema.parse("cancelled");
      }
      writeFileSync(selection.filePath, task, "utf8");
      return candidatureExternalAiExportResultSchema.parse("exported");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.submitApplicationInformationResult,
    (event, rawInput: unknown) => {
      assertTrustedSender(event, mainWindow);
      const input = candidatureExternalAiResultInputSchema.parse(rawInput);
      return externalApplicationInformationPendingResultSchema.parse(
        importApplicationInformationPortableResult(
          requireWorkspaceRoot(),
          input.candidatureId, input.text,
        ),
      );
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.importApplicationInformationResult,
    async (event, rawCandidatureId: unknown) => {
      assertTrustedSender(event, mainWindow);
      const candidatureId = candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(rawCandidatureId);
      const rootPath = requireWorkspaceRoot();
      const selection = await dialog.showOpenDialog(mainWindow, {
        title: "Import application information suggestions",
        buttonLabel: "Import suggestions",
        filters: [
          { name: "JSON, Markdown, or text", extensions: ["json", "md", "txt"] },
        ],
        properties: ["openFile"],
      });
      if (requireWorkspaceRoot() !== rootPath) throw new Error("The workspace changed while selecting the file.");
      const filePath = selection.filePaths[0];
      if (selection.canceled || !filePath) {
        return candidatureApplicationInformationResultImportResultSchema.parse("cancelled");
      }
      return candidatureApplicationInformationResultImportResultSchema.parse(
        importApplicationInformationPortableResult(
          rootPath, candidatureId, requirePortableResultFile(filePath),
        ),
      );
    },
  );

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.interviewContext, (event, rawCandidatureId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return externalInterviewPreparationContextSchema.parse(
      prepareInterviewPreparationContext(requireWorkspaceRoot(), candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(rawCandidatureId)),
    );
  });

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.copyInterviewTask,
    (event, rawInput: unknown) => {
      assertTrustedSender(event, mainWindow);
      const input = candidatureExternalAiRequestTextSchema.parse(rawInput);
      clipboard.writeText(
        saveInterviewPreparationRequest(requireWorkspaceRoot(), input.candidatureId, input.text),
      );
      return candidatureExternalAiCopyResultSchema.parse("copied");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.exportInterviewTask,
    async (event, rawInput: unknown) => {
      assertTrustedSender(event, mainWindow);
      const input = candidatureExternalAiRequestTextSchema.parse(rawInput);
      const task = saveInterviewPreparationRequest(
        requireWorkspaceRoot(), input.candidatureId, input.text,
      );
      const selection = await dialog.showSaveDialog(mainWindow, {
        title: "Export interview preparation task",
        buttonLabel: "Export task",
        defaultPath: "aaaat-interview-preparation.md",
        filters: [
          { name: "Markdown", extensions: ["md"] },
          { name: "Text", extensions: ["txt"] },
        ],
      });
      if (selection.canceled || !selection.filePath) {
        return candidatureExternalAiExportResultSchema.parse("cancelled");
      }
      writeFileSync(selection.filePath, task, "utf8");
      return candidatureExternalAiExportResultSchema.parse("exported");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.retainInterviewResult,
    (event, rawInput: unknown) => {
      assertTrustedSender(event, mainWindow);
      const input = candidatureExternalAiResultInputSchema.parse(rawInput);
      const retained = retainInterviewPreparationResult(
        requireWorkspaceRoot(),
        input.text, input.candidatureId,
      );
      if (!retained) {
        throw new Error("Choose interview preparation with my AI on an application first.");
      }
      return candidatureInterviewResultRetainResultSchema.parse("retained");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.importInterviewResult,
    async (event, rawCandidatureId: unknown) => {
      assertTrustedSender(event, mainWindow);
      const candidatureId = candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(rawCandidatureId);
      const rootPath = requireWorkspaceRoot();
      const selection = await dialog.showOpenDialog(mainWindow, {
        title: "Import interview preparation",
        buttonLabel: "Import result",
        filters: [
          { name: "Markdown or text", extensions: ["md", "txt"] },
        ],
        properties: ["openFile"],
      });
      if (requireWorkspaceRoot() !== rootPath) throw new Error("The workspace changed while selecting the file.");
      const filePath = selection.filePaths[0];
      if (selection.canceled || !filePath) {
        return candidatureInterviewResultImportResultSchema.parse("cancelled");
      }
      retainInterviewPreparationResult(
        rootPath, requirePortableResultFile(filePath), candidatureId,
      );
      return candidatureInterviewResultImportResultSchema.parse("imported");
    },
  );
}
