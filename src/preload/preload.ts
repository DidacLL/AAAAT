import { contextBridge, ipcRenderer } from "electron";

import { createAiConnectionDesktopApi } from "./ai-connection-api";
import { createArtifactDesktopApi } from "./artifact-api";
import { createCandidatureActivityDesktopApi } from "./candidature-activity-api";
import { createCandidatureOpportunityResearchAccessDesktopApi } from "./candidature-opportunity-research-access-api";
import { createCandidatureSearchDesktopApi } from "./candidature-search-api";
import { createCareerContextAiDisclosureDesktopApi } from "./career-context-ai-disclosure-api";
import { createDesktopApi } from "./api";
import { createCombinedDocumentDesktopApi } from "./combined-document-api";
import { createCvContentAccessDesktopApi } from "./cv-content-access-api";
import { createCvDescriptorDesktopApi } from "./cv-descriptor-api";
import { createDocumentOutputDesktopApi } from "./document-output-api";
import { createFocusDesktopApi } from "./focus-api";
import { createProfileAiContextDesktopApi } from "./profile-ai-context-api";
import { createSetupEnvironmentDesktopApi } from "./setup-environment-api";
import { createTodoDesktopApi } from "./todo-api";
import { createWorkspaceRecoveryDesktopApi } from "./workspace-recovery-api";

const invoke = (channel: string, ...args: readonly unknown[]) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld(
  "aaaat",
  Object.freeze({
    ...createDesktopApi(invoke),
    ...createAiConnectionDesktopApi(invoke),
    ...createArtifactDesktopApi(invoke),
    ...createCandidatureActivityDesktopApi(invoke),
    ...createCandidatureOpportunityResearchAccessDesktopApi(invoke),
    ...createCandidatureSearchDesktopApi(invoke),
    ...createCareerContextAiDisclosureDesktopApi(invoke),
    ...createCombinedDocumentDesktopApi(invoke),
    ...createCvContentAccessDesktopApi(invoke),
    ...createCvDescriptorDesktopApi(invoke),
    ...createDocumentOutputDesktopApi(invoke),
    ...createProfileAiContextDesktopApi(invoke),
    ...createTodoDesktopApi(invoke),
    ...createFocusDesktopApi(invoke),
    ...createSetupEnvironmentDesktopApi(invoke),
    ...createWorkspaceRecoveryDesktopApi(invoke),
  }),
);
