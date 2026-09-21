import type { BrowserWindow } from "electron";

import { registerAiConnectionManagementIpc } from "./ai-connection-ipc";
import { registerAiPromptIpc } from "./ai-prompt-ipc";
import { registerApplicationHandoffIpc } from "./application-handoff-ipc";
import { registerCandidatureActivityIpc } from "./candidature-activity-ipc";
import { registerCandidatureOpportunityResearchAccessIpc } from "./candidature-opportunity-research-access-ipc";
import { registerCandidatureSearchIpc } from "./candidature-search-ipc";
import { registerCareerContextAiDisclosureIpc } from "./career-context-ai-disclosure-ipc";
import { registerCoreDesktopIpc } from "./core-desktop-ipc";
import { registerDocumentDomainIpc } from "./document-domain-ipc";
import { registerProfileAiContextIpc } from "./profile-ai-context-ipc";
import { registerProfileVariantIpc } from "./profile-variant-ipc";
import { registerSetupAssistantIpc } from "./setup-assistant-ipc";
import { registerSetupEnvironmentIpc } from "./setup-environment-ipc";

export function registerDesktopIpc(mainWindow: BrowserWindow): void {
  registerCoreDesktopIpc(mainWindow);
  registerAiConnectionManagementIpc(mainWindow);
  registerAiPromptIpc(mainWindow);
  registerApplicationHandoffIpc(mainWindow);
  registerCandidatureActivityIpc(mainWindow);
  registerCandidatureOpportunityResearchAccessIpc(mainWindow);
  registerCandidatureSearchIpc(mainWindow);
  registerCareerContextAiDisclosureIpc(mainWindow);
  registerDocumentDomainIpc(mainWindow);
  registerProfileAiContextIpc(mainWindow);
  registerProfileVariantIpc(mainWindow);
  registerSetupEnvironmentIpc(mainWindow);
  registerSetupAssistantIpc(mainWindow);
}
