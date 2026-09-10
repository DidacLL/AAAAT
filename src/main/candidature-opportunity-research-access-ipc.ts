import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  candidatureOpportunityResearchAccessChannels,
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
} from "../shared/candidature-opportunity-research-access-contracts";
import {
  getCandidatureOpportunityResearchAccess,
  updateCandidatureOpportunityResearchAccess,
} from "./candidature-opportunity-research-access-service";
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

function registerCandidatureOpportunityResearchAccessIpc(mainWindow: BrowserWindow): void {
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
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerCandidatureOpportunityResearchAccessIpc(mainWindow),
);
