import { ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  candidatureSearchChannels,
  candidatureSearchInputSchema,
  candidatureSearchResultSchema,
} from "../shared/candidature-search-contracts";
import { searchCandidatures } from "./candidature-search-service";

export function registerCandidatureSearchIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(candidatureSearchChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(candidatureSearchChannels.search, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureSearchResultSchema.parse(
      searchCandidatures(
        requireWorkspaceRoot(),
        candidatureSearchInputSchema.parse(input),
      ),
    );
  });
}
