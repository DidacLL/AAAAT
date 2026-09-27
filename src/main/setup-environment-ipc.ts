import { writeFileSync } from "node:fs";
import { app, clipboard, dialog, ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  externalAssistantConnectionSchema,
  externalAssistantGuidanceCopyResultSchema,
  externalAssistantGuidanceExportResultSchema,
  externalAssistantGuidanceSchema,
  setupEnvironmentChannels,
  setupEnvironmentSnapshotSchema,
} from "../shared/setup-environment-contracts";
import { externalAssistantGuidance } from "./external-assistant-guidance";
import { getSetupEnvironmentSnapshot } from "./setup-environment-service";

export function registerSetupEnvironmentIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(setupEnvironmentChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(setupEnvironmentChannels.current, async (event) => {
    assertTrustedSender(event, mainWindow);
    return setupEnvironmentSnapshotSchema.parse(
      await getSetupEnvironmentSnapshot(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(setupEnvironmentChannels.externalConnection, (event) => {
    assertTrustedSender(event, mainWindow);
    return externalAssistantConnectionSchema.parse({
      packaged: app.isPackaged,
      executablePath: process.execPath,
      workspacePath: requireWorkspaceRoot(),
    });
  });

  ipcMain.handle(setupEnvironmentChannels.externalGuidance, (event) => {
    assertTrustedSender(event, mainWindow);
    return externalAssistantGuidanceSchema.parse(externalAssistantGuidance);
  });

  ipcMain.handle(setupEnvironmentChannels.externalGuidanceCopy, (event) => {
    assertTrustedSender(event, mainWindow);
    clipboard.writeText(externalAssistantGuidance.content);
    return externalAssistantGuidanceCopyResultSchema.parse("copied");
  });

  ipcMain.handle(setupEnvironmentChannels.externalGuidanceExport, async (event) => {
    assertTrustedSender(event, mainWindow);
    const selection = await dialog.showSaveDialog(mainWindow, {
      title: "Save reusable AAAAT AI instructions",
      buttonLabel: "Save instructions",
      defaultPath: "AAAAT.md",
      filters: [
        { name: "Markdown", extensions: ["md"] },
        { name: "Text", extensions: ["txt"] },
      ],
    });
    if (selection.canceled || !selection.filePath) {
      return externalAssistantGuidanceExportResultSchema.parse("cancelled");
    }
    writeFileSync(selection.filePath, externalAssistantGuidance.content, "utf8");
    return externalAssistantGuidanceExportResultSchema.parse("exported");
  });
}
