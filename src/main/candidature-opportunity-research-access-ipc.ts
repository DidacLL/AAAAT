import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { clipboard, dialog, ipcMain, type BrowserWindow } from "electron";

import {
  candidatureApplicationInformationResultImportResultSchema,
  candidatureExternalAiCopyResultSchema,
  candidatureExternalAiExportResultSchema,
  candidatureExternalAiInstructionSchema,
  candidatureExternalAiResultTextSchema,
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
  buildApplicationInformationPortableTask,
  buildInterviewPreparationPortableTask,
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
    (event, rawInstruction: unknown) => {
      assertTrustedSender(event, mainWindow);
      return externalApplicationInformationTaskSchema.parse(
        prepareApplicationInformationTask(
          requireWorkspaceRoot(),
          candidatureExternalAiInstructionSchema.parse(rawInstruction),
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
    (event, rawInstruction: unknown) => {
      assertTrustedSender(event, mainWindow);
      const instruction = candidatureExternalAiInstructionSchema.parse(rawInstruction);
      clipboard.writeText(
        buildApplicationInformationPortableTask(requireWorkspaceRoot(), instruction),
      );
      return candidatureExternalAiCopyResultSchema.parse("copied");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.exportApplicationInformationTask,
    async (event, rawInstruction: unknown) => {
      assertTrustedSender(event, mainWindow);
      const instruction = candidatureExternalAiInstructionSchema.parse(rawInstruction);
      const task = buildApplicationInformationPortableTask(
        requireWorkspaceRoot(),
        instruction,
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
    (event, rawResultText: unknown) => {
      assertTrustedSender(event, mainWindow);
      return externalApplicationInformationPendingResultSchema.parse(
        importApplicationInformationPortableResult(
          requireWorkspaceRoot(),
          candidatureExternalAiResultTextSchema.parse(rawResultText),
        ),
      );
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.importApplicationInformationResult,
    async (event) => {
      assertTrustedSender(event, mainWindow);
      const selection = await dialog.showOpenDialog(mainWindow, {
        title: "Import application information suggestions",
        buttonLabel: "Import suggestions",
        filters: [
          { name: "JSON, Markdown, or text", extensions: ["json", "md", "txt"] },
        ],
        properties: ["openFile"],
      });
      const filePath = selection.filePaths[0];
      if (selection.canceled || !filePath) {
        return candidatureApplicationInformationResultImportResultSchema.parse("cancelled");
      }
      return candidatureApplicationInformationResultImportResultSchema.parse(
        importApplicationInformationPortableResult(
          requireWorkspaceRoot(),
          requirePortableResultFile(filePath),
        ),
      );
    },
  );

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.interviewContext, (event) => {
    assertTrustedSender(event, mainWindow);
    return externalInterviewPreparationContextSchema.parse(
      prepareInterviewPreparationContext(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.copyInterviewTask,
    (event, rawInstruction: unknown) => {
      assertTrustedSender(event, mainWindow);
      const instruction = candidatureExternalAiInstructionSchema.parse(rawInstruction);
      clipboard.writeText(
        buildInterviewPreparationPortableTask(requireWorkspaceRoot(), instruction),
      );
      return candidatureExternalAiCopyResultSchema.parse("copied");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.exportInterviewTask,
    async (event, rawInstruction: unknown) => {
      assertTrustedSender(event, mainWindow);
      const instruction = candidatureExternalAiInstructionSchema.parse(rawInstruction);
      const task = buildInterviewPreparationPortableTask(
        requireWorkspaceRoot(),
        instruction,
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
    (event, rawResultText: unknown) => {
      assertTrustedSender(event, mainWindow);
      const retained = retainInterviewPreparationResult(
        requireWorkspaceRoot(),
        candidatureExternalAiResultTextSchema.parse(rawResultText),
      );
      if (!retained) {
        throw new Error("Choose interview preparation with my AI on an application first.");
      }
      return candidatureInterviewResultRetainResultSchema.parse("retained");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.importInterviewResult,
    async (event) => {
      assertTrustedSender(event, mainWindow);
      const selection = await dialog.showOpenDialog(mainWindow, {
        title: "Import interview preparation",
        buttonLabel: "Import result",
        filters: [
          { name: "Markdown or text", extensions: ["md", "txt"] },
        ],
        properties: ["openFile"],
      });
      const filePath = selection.filePaths[0];
      if (selection.canceled || !filePath) {
        return candidatureInterviewResultImportResultSchema.parse("cancelled");
      }
      retainInterviewPreparationResult(
        requireWorkspaceRoot(),
        requirePortableResultFile(filePath),
      );
      return candidatureInterviewResultImportResultSchema.parse("imported");
    },
  );
}
