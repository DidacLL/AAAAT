import { dialog, ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  applicationHandoffChannels,
  applicationHandoffImportResultSchema,
} from "../shared/application-handoff-contracts";
import { importApplicationHandoffFile } from "./application-handoff-service";

export function registerApplicationHandoffIpc(mainWindow: BrowserWindow): void {
  ipcMain.removeHandler(applicationHandoffChannels.importFile);

  ipcMain.handle(applicationHandoffChannels.importFile, async (event) => {
    assertTrustedSender(event, mainWindow);
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: "Import AAAAT application handoff",
      buttonLabel: "Import handoff",
      filters: [{ name: "AAAAT application handoff", extensions: ["json"] }],
      properties: ["openFile"],
    });
    const filePath = selection.filePaths[0];
    if (selection.canceled || !filePath) {
      return applicationHandoffImportResultSchema.parse({ status: "cancelled" });
    }
    const result = await importApplicationHandoffFile(requireWorkspaceRoot(), filePath);
    return applicationHandoffImportResultSchema.parse({ status: "imported", result });
  });
}
