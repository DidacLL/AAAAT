import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  setupAssistantAccessSchema,
  setupAssistantAccessUpdateSchema,
  setupAssistantChannels,
  setupRenderingSelfTestResultSchema,
} from "../shared/setup-assistant-contracts";
import {
  getSetupAssistantAccess,
  runRenderingSelfTest,
  updateSetupAssistantAccess,
} from "./setup-assistant-service";
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

function registerSetupAssistantIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(setupAssistantChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(setupAssistantChannels.accessCurrent, (event) => {
    assertTrustedSender(event, mainWindow);
    return setupAssistantAccessSchema.parse(getSetupAssistantAccess(requireWorkspaceRoot()));
  });

  ipcMain.handle(setupAssistantChannels.accessUpdate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return setupAssistantAccessSchema.parse(
      updateSetupAssistantAccess(
        requireWorkspaceRoot(),
        setupAssistantAccessUpdateSchema.parse(input),
      ),
    );
  });

  ipcMain.handle(setupAssistantChannels.renderingSelfTest, async (event) => {
    assertTrustedSender(event, mainWindow);
    return setupRenderingSelfTestResultSchema.parse(
      await runRenderingSelfTest(requireWorkspaceRoot()),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) => registerSetupAssistantIpc(mainWindow));
