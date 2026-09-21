import { ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  candidatureActivityCandidatureIdSchema,
  candidatureActivityChannels,
  candidatureActivityListSchema,
} from "../shared/candidature-activity-contracts";
import { listCandidatureActivity } from "./candidature-activity-service";

export function registerCandidatureActivityIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(candidatureActivityChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(candidatureActivityChannels.list, (event, candidatureId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureActivityListSchema.parse(
      listCandidatureActivity(
        requireWorkspaceRoot(),
        candidatureActivityCandidatureIdSchema.parse(candidatureId),
      ),
    );
  });
}
