import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  candidatureComparisonChannels,
  candidatureComparisonPreviewSchema,
  candidatureComparisonRequestSchema,
  candidatureComparisonResultSchema,
} from "../shared/candidature-comparison-contracts";
import {
  compareCandidatures,
  previewCandidatureComparison,
} from "./candidature-comparison-service";
import { readLastWorkspacePath } from "./workspace";

function assertTrustedSender(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): void {
  if (event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error("Untrusted IPC sender");
  }
}

function requireWorkspaceRoot(): string {
  const rootPath = readLastWorkspacePath(
    path.join(app.getPath("userData"), "workspace-settings.json"),
  );
  if (!rootPath) throw new Error("Choose an AAAAT workspace first.");
  return rootPath;
}

function registerCandidatureComparisonIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(candidatureComparisonChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(candidatureComparisonChannels.preview, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureComparisonPreviewSchema.parse(
      previewCandidatureComparison(
        requireWorkspaceRoot(),
        candidatureComparisonRequestSchema.parse(input),
      ),
    );
  });

  ipcMain.handle(candidatureComparisonChannels.run, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureComparisonResultSchema.parse(
      await compareCandidatures(
        requireWorkspaceRoot(),
        candidatureComparisonRequestSchema.parse(input),
      ),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerCandidatureComparisonIpc(mainWindow),
);
