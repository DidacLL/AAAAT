import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  applicationArtifactCaptureSchema,
  applicationArtifactListSchema,
  applicationArtifactRecordSchema,
  artifactChannels,
} from "../shared/artifact-contracts";
import { captureApplicationArtifact, listApplicationArtifacts } from "./artifact-service";
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

function registerArtifactIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(artifactChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(artifactChannels.list, (event, candidatureId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return applicationArtifactListSchema.parse(
      listApplicationArtifacts(
        requireWorkspaceRoot(),
        applicationArtifactCaptureSchema.shape.candidatureId.parse(candidatureId),
      ),
    );
  });
  ipcMain.handle(artifactChannels.capture, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return applicationArtifactRecordSchema.parse(
      await captureApplicationArtifact(
        requireWorkspaceRoot(),
        applicationArtifactCaptureSchema.parse(input),
      ),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) => registerArtifactIpc(mainWindow));
