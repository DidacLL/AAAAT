import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { clipboard, dialog, ipcMain, type BrowserWindow } from "electron";

import {
  candidatureApplicationInformationResultImportResultSchema,
  candidatureExternalAiCopyResultSchema,
  candidatureExternalAiExportResultSchema,
  candidatureExternalAiInstructionSchema,
  candidaturePreparedTaskSchema,
  candidaturePreparedTaskTargetSchema,
  candidatureExternalAiTaskTextSchema,
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
  buildInterviewPreparationPortableTask,
  assertGuiTaskCurrent,
  closePrivateTask,
  importApplicationInformationPortableResult,
  prepareInterviewPreparationContext,
  preparePrivateInterviewPreparationContext,
  disableConnectedTaskAccess,
  maxExternalAiPortableResultBytes,
  prepareApplicationInformationTask,
  preparePrivateApplicationInformationTask,
  useConnectedApplicationInformationTask,
  useConnectedInterviewPreparationTask,
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

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.privateApplicationInformationTask, (event, rawCandidatureId: unknown, rawInstruction: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidaturePreparedTaskSchema.parse(preparePrivateApplicationInformationTask(requireWorkspaceRoot(), candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(rawCandidatureId), candidatureExternalAiInstructionSchema.parse(rawInstruction)));
  });

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.useConnectedApplicationInformationTask, (event, rawTarget: unknown, rawText: unknown) => {
    assertTrustedSender(event, mainWindow);
    return externalApplicationInformationTaskSchema.parse(useConnectedApplicationInformationTask(requireWorkspaceRoot(), candidatureExternalAiTaskTextSchema.parse(rawText), candidaturePreparedTaskTargetSchema.parse(rawTarget)));
  });

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.takeApplicationInformationResult, (event, rawTarget: unknown) => {
    assertTrustedSender(event, mainWindow);
    const target = candidaturePreparedTaskTargetSchema.parse(rawTarget);
    return externalApplicationInformationPendingResultOptionalSchema.parse(takeApplicationInformationResult(requireWorkspaceRoot(), target.candidatureId, target));
  });

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.copyApplicationInformationTask,
    (event, rawText: unknown) => {
      assertTrustedSender(event, mainWindow);
      const taskText = candidatureExternalAiTaskTextSchema.parse(rawText);
      clipboard.writeText(taskText);
      return candidatureExternalAiCopyResultSchema.parse("copied");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.exportApplicationInformationTask,
    async (event, rawText: unknown) => {
      assertTrustedSender(event, mainWindow);
      const task = candidatureExternalAiTaskTextSchema.parse(rawText);
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
    (event, rawTarget: unknown, rawResultText: unknown) => {
      assertTrustedSender(event, mainWindow);
      return externalApplicationInformationPendingResultSchema.parse(
        importApplicationInformationPortableResult(
          requireWorkspaceRoot(),
          candidatureExternalAiResultTextSchema.parse(rawResultText),
          candidaturePreparedTaskTargetSchema.parse(rawTarget),
        ),
      );
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.importApplicationInformationResult,
    async (event, rawTarget: unknown) => {
      assertTrustedSender(event, mainWindow);
      const target = candidaturePreparedTaskTargetSchema.parse(rawTarget);
      const rootPath = requireWorkspaceRoot();
      assertGuiTaskCurrent(rootPath, target, "application");
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
      if (requireWorkspaceRoot() !== rootPath) throw new Error("The workspace changed while choosing this file.");
      return candidatureApplicationInformationResultImportResultSchema.parse(
        importApplicationInformationPortableResult(
          rootPath,
          requirePortableResultFile(filePath),
          target,
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

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.privateInterviewContext, (event, rawCandidatureId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidaturePreparedTaskSchema.parse(preparePrivateInterviewPreparationContext(requireWorkspaceRoot(), candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(rawCandidatureId)));
  });

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.closePrivateTask, (event, rawTarget: unknown) => {
    assertTrustedSender(event, mainWindow);
    closePrivateTask(requireWorkspaceRoot(), candidaturePreparedTaskTargetSchema.parse(rawTarget));
  });

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.disableConnectedTaskAccess, (event, rawCandidatureId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureOpportunityResearchAccessSchema.parse(disableConnectedTaskAccess(requireWorkspaceRoot(), candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(rawCandidatureId)));
  });

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.useConnectedInterviewTask, (event, rawTarget: unknown, rawText: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureExternalAiTaskTextSchema.parse(useConnectedInterviewPreparationTask(requireWorkspaceRoot(), candidatureExternalAiTaskTextSchema.parse(rawText), candidaturePreparedTaskTargetSchema.parse(rawTarget)));
  });

  ipcMain.handle(candidatureOpportunityResearchAccessChannels.interviewTaskText, (event) => {
    assertTrustedSender(event, mainWindow);
    return candidatureExternalAiTaskTextSchema.parse(buildInterviewPreparationPortableTask(requireWorkspaceRoot()));
  });

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.copyInterviewTask,
    (event, rawText: unknown) => {
      assertTrustedSender(event, mainWindow);
      const taskText = candidatureExternalAiTaskTextSchema.parse(rawText);
      clipboard.writeText(taskText);
      return candidatureExternalAiCopyResultSchema.parse("copied");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.exportInterviewTask,
    async (event, rawText: unknown) => {
      assertTrustedSender(event, mainWindow);
      const task = candidatureExternalAiTaskTextSchema.parse(rawText);
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
    (event, rawTarget: unknown, rawResultText: unknown) => {
      assertTrustedSender(event, mainWindow);
      const retained = retainInterviewPreparationResult(
        requireWorkspaceRoot(),
        candidatureExternalAiResultTextSchema.parse(rawResultText),
        candidaturePreparedTaskTargetSchema.parse(rawTarget),
      );
      if (!retained) {
        throw new Error("Choose interview preparation with my AI on an application first.");
      }
      return candidatureInterviewResultRetainResultSchema.parse("retained");
    },
  );

  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.importInterviewResult,
    async (event, rawTarget: unknown) => {
      assertTrustedSender(event, mainWindow);
      const target = candidaturePreparedTaskTargetSchema.parse(rawTarget);
      const rootPath = requireWorkspaceRoot();
      assertGuiTaskCurrent(rootPath, target, "interview");
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
      if (requireWorkspaceRoot() !== rootPath) throw new Error("The workspace changed while choosing this file.");
      retainInterviewPreparationResult(
        rootPath,
        requirePortableResultFile(filePath),
        target,
      );
      return candidatureInterviewResultImportResultSchema.parse("imported");
    },
  );
}
