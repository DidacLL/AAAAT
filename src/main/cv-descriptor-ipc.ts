import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  cvDescriptorChannels,
  cvDescriptorSchema,
  cvDescriptorUpdateSchema,
} from "../shared/cv-descriptor-contracts";
import { getCvDescriptor, updateCvDescriptor } from "./cv-descriptor-service";
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

export function registerCvDescriptorIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(cvDescriptorChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(cvDescriptorChannels.current, (event, documentId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return cvDescriptorSchema.parse(
      getCvDescriptor(requireWorkspaceRoot(), cvDescriptorSchema.shape.documentId.parse(documentId)),
    );
  });
  ipcMain.handle(cvDescriptorChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return cvDescriptorSchema.parse(
      updateCvDescriptor(requireWorkspaceRoot(), cvDescriptorUpdateSchema.parse(input)),
    );
  });
}
