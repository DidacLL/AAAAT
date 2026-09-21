import { ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  candidatureOpportunityResearchAccessChannels,
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
} from "../shared/candidature-opportunity-research-access-contracts";
import {
  getCandidatureOpportunityResearchAccess,
  updateCandidatureOpportunityResearchAccess,
} from "./candidature-opportunity-research-access-service";

export function registerCandidatureOpportunityResearchAccessIpc(mainWindow: BrowserWindow): void {
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
