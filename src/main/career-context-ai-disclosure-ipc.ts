import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  careerContextAiDisclosureChannels,
  careerContextAiDisclosureSchema,
  careerContextAiDisclosureUpdateSchema,
} from "../shared/career-context-ai-disclosure-contracts";
import {
  getCareerContextAiDisclosure,
  updateCareerContextAiDisclosure,
} from "./career-context-ai-disclosure-service";
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

function registerCareerContextAiDisclosureIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(careerContextAiDisclosureChannels)) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(careerContextAiDisclosureChannels.current, (event) => {
    assertTrustedSender(event, mainWindow);
    return careerContextAiDisclosureSchema.parse(
      getCareerContextAiDisclosure(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(careerContextAiDisclosureChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return careerContextAiDisclosureSchema.parse(
      updateCareerContextAiDisclosure(
        requireWorkspaceRoot(),
        careerContextAiDisclosureUpdateSchema.parse(input),
      ),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerCareerContextAiDisclosureIpc(mainWindow),
);
