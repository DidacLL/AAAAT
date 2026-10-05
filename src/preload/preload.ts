import { contextBridge, ipcRenderer } from "electron";

import { createAiConnectionDesktopApi } from "./ai-connection-api";
import { createAiPromptDesktopApi } from "./ai-prompt-api";
import { createCandidatureActivityDesktopApi } from "./candidature-activity-api";
import { createCandidatureOpportunityResearchAccessDesktopApi } from "./candidature-opportunity-research-access-api";
import { createCandidatureSearchDesktopApi } from "./candidature-search-api";
import { createCareerContextAiDisclosureDesktopApi } from "./career-context-ai-disclosure-api";
import { createDesktopApi } from "./api";
import { createDocumentDomainDesktopApi } from "./document-domain-api";
import { createProfileAiContextDesktopApi } from "./profile-ai-context-api";
import { createProfileVariantDesktopApi } from "./profile-variant-api";
import { createSetupAssistantDesktopApi } from "./setup-assistant-api";
import { createSetupEnvironmentDesktopApi } from "./setup-environment-api";
import { createWorkspaceRecoveryDesktopApi } from "./workspace-recovery-api";

const invoke = (channel: string, ...args: readonly unknown[]) => ipcRenderer.invoke(channel, ...args);
const coreApi = createDesktopApi(invoke);

contextBridge.exposeInMainWorld(
  "aaaat",
  Object.freeze({
    ...coreApi,
    ...createAiConnectionDesktopApi(invoke),
    ...createAiPromptDesktopApi(invoke),
    ...createCandidatureActivityDesktopApi(invoke),
    ...createCandidatureOpportunityResearchAccessDesktopApi(invoke),
    ...createCandidatureSearchDesktopApi(invoke),
    ...createCareerContextAiDisclosureDesktopApi(invoke),
    ...createDocumentDomainDesktopApi(invoke),
    ...createProfileAiContextDesktopApi(invoke),
    ...createProfileVariantDesktopApi(invoke),
    ...createSetupAssistantDesktopApi(invoke),
    ...createSetupEnvironmentDesktopApi(invoke),
    ...createWorkspaceRecoveryDesktopApi(invoke),
  }),
);
