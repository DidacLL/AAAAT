import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { clipboard, dialog, ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  candidatureOpportunityResearchAccessChannels,
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
  candidatureOpportunityResearchResultImportResultSchema,
  candidatureOpportunityResearchResultRetainResultSchema,
  candidatureOpportunityResearchResultTextSchema,
  candidatureOpportunityResearchTaskContextSchema,
  candidatureOpportunityResearchTaskCopyResultSchema,
  candidatureOpportunityResearchTaskExportResultSchema,
  candidatureOpportunityResearchTaskInstructionSchema,
} from "../shared/candidature-opportunity-research-access-contracts";
import {
  buildOpportunityResearchPortableTask,
  getCandidatureOpportunityResearchAccess,
  importOpportunityResearchPortableResult,
  maxOpportunityResearchPortableResultBytes,
  requireSelectedOpportunityResearchContext,
  updateCandidatureOpportunityResearchAccess,
} from "./candidature-opportunity-research-access-service";

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
  ipcMain.handle(candidatureOpportunityResearchAccessChannels.taskContext, (event) => {
    assertTrustedSender(event, mainWindow);
    return candidatureOpportunityResearchTaskContextSchema.parse(
      requireSelectedOpportunityResearchContext(requireWorkspaceRoot()),
    );
  });
  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.copyTask,
    (event, rawInstruction: unknown) => {
      assertTrustedSender(event, mainWindow);
      const instruction = candidatureOpportunityResearchTaskInstructionSchema.parse(rawInstruction);
      clipboard.writeText(buildOpportunityResearchPortableTask(requireWorkspaceRoot(), instruction));
      return candidatureOpportunityResearchTaskCopyResultSchema.parse("copied");
    },
  );
  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.exportTask,
    async (event, rawInstruction: unknown) => {
      assertTrustedSender(event, mainWindow);
      const instruction = candidatureOpportunityResearchTaskInstructionSchema.parse(rawInstruction);
      const task = buildOpportunityResearchPortableTask(requireWorkspaceRoot(), instruction);
      const selection = await dialog.showSaveDialog(mainWindow, {
        title: "Export AI task",
        buttonLabel: "Export task",
        defaultPath: "aaaat-ai-task.md",
        filters: [
          { name: "Markdown", extensions: ["md"] },
          { name: "Text", extensions: ["txt"] },
        ],
      });
      if (selection.canceled || !selection.filePath) {
        return candidatureOpportunityResearchTaskExportResultSchema.parse("cancelled");
      }
      writeFileSync(selection.filePath, task, "utf8");
      return candidatureOpportunityResearchTaskExportResultSchema.parse("exported");
    },
  );
  ipcMain.handle(
    candidatureOpportunityResearchAccessChannels.retainResult,
    (event, rawSourceText: unknown) => {
      assertTrustedSender(event, mainWindow);
      const sourceText = candidatureOpportunityResearchResultTextSchema.parse(rawSourceText);
      const retained = importOpportunityResearchPortableResult(requireWorkspaceRoot(), sourceText);
      if (!retained) {
        throw new Error("Choose Send to my AI on an application before retaining a result.");
      }
      return candidatureOpportunityResearchResultRetainResultSchema.parse("retained");
    },
  );
  ipcMain.handle(candidatureOpportunityResearchAccessChannels.importResult, async (event) => {
    assertTrustedSender(event, mainWindow);
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: "Import AI result",
      buttonLabel: "Import result",
      filters: [
        { name: "Markdown or text", extensions: ["md", "txt"] },
      ],
      properties: ["openFile"],
    });
    const filePath = selection.filePaths[0];
    if (selection.canceled || !filePath) {
      return candidatureOpportunityResearchResultImportResultSchema.parse("cancelled");
    }
    const stat = lstatSync(filePath);
    if (!stat.isFile() || stat.size > maxOpportunityResearchPortableResultBytes) {
      throw new Error("The selected external AI result is invalid or too large.");
    }
    const retained = importOpportunityResearchPortableResult(
      requireWorkspaceRoot(),
      readFileSync(filePath, "utf8"),
    );
    if (!retained) {
      throw new Error("Choose Send to my AI on an application before importing a result.");
    }
    return candidatureOpportunityResearchResultImportResultSchema.parse("imported");
  });
}
