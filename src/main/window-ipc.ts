import type { BrowserWindow } from "electron";

import { registerAiConnectionManagementIpc } from "./ai-connection-ipc";
import { registerArtifactIpc } from "./artifact-ipc";
import { registerCandidatureActivityIpc } from "./candidature-activity-ipc";
import { registerCandidatureOpportunityResearchAccessIpc } from "./candidature-opportunity-research-access-ipc";
import { registerCandidatureSearchIpc } from "./candidature-search-ipc";
import { registerCareerContextAiDisclosureIpc } from "./career-context-ai-disclosure-ipc";
import { registerCombinedDocumentIpc } from "./combined-document-ipc";
import { registerCvContentAccessIpc } from "./cv-content-access-ipc";
import { registerCvDescriptorIpc } from "./cv-descriptor-ipc";
import { registerDocumentOutputIpc } from "./document-output-ipc";
import { registerFocusIpc } from "./focus-ipc";
import { registerProfileAiContextIpc } from "./profile-ai-context-ipc";
import { registerSetupEnvironmentIpc } from "./setup-environment-ipc";
import { registerTodoIpc } from "./todo-ipc";

export function registerWindowIpc(mainWindow: BrowserWindow): void {
  registerAiConnectionManagementIpc(mainWindow);
  registerArtifactIpc(mainWindow);
  registerCandidatureActivityIpc(mainWindow);
  registerCandidatureOpportunityResearchAccessIpc(mainWindow);
  registerCandidatureSearchIpc(mainWindow);
  registerCareerContextAiDisclosureIpc(mainWindow);
  registerCombinedDocumentIpc(mainWindow);
  registerCvContentAccessIpc(mainWindow);
  registerCvDescriptorIpc(mainWindow);
  registerDocumentOutputIpc(mainWindow);
  registerFocusIpc(mainWindow);
  registerProfileAiContextIpc(mainWindow);
  registerSetupEnvironmentIpc(mainWindow);
  registerTodoIpc(mainWindow);
}
