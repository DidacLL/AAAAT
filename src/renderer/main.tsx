import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { AiConnectionDesktopApi } from "../shared/ai-connection-contracts";
import type { ArtifactDesktopApi } from "../shared/artifact-contracts";
import type { CandidatureSearchDesktopApi } from "../shared/candidature-search-contracts";
import type { CareerContext, DesktopApi, ProfileSnapshot } from "../shared/contracts";
import type { CvContentAccessDesktopApi } from "../shared/cv-content-access-contracts";
import type { CvDescriptorDesktopApi } from "../shared/cv-descriptor-contracts";
import type { FocusDesktopApi, FocusMaterialPreferences } from "../shared/focus-contracts";
import type { SetupEnvironmentDesktopApi } from "../shared/setup-environment-contracts";
import type { TodoDesktopApi } from "../shared/todo-contracts";
import type { WorkspaceRecoveryDesktopApi } from "../shared/workspace-recovery-contracts";
import { App } from "./App";
import "./styles.css";
import "./candidatures.css";
import "./professional-information.css";

const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
const emptyCareerContext: CareerContext = {
  careerDirection: "",
  objectives: "",
  constraints: "",
  targetRoles: "",
  targetMarketsLocations: "",
  workPreferences: "",
  applicationWritingPreferences: "",
};
const previewUnavailable = async (): Promise<never> => {
  throw new Error("Create preview data in the desktop app for this operation.");
};

function createPreviewApi(): DesktopApi &
  AiConnectionDesktopApi &
  ArtifactDesktopApi &
  CandidatureSearchDesktopApi &
  CvContentAccessDesktopApi &
  CvDescriptorDesktopApi &
  TodoDesktopApi &
  FocusDesktopApi &
  SetupEnvironmentDesktopApi &
  WorkspaceRecoveryDesktopApi {
  return Object.freeze({
    system: Object.freeze({
      info: async () => ({
        appVersion: "browser-preview",
        electronVersion: "browser-preview",
        nodeVersion: "browser-preview",
      }),
    }),
    workspace: Object.freeze({
      current: async () => null,
      choose: async () => ({ rootPath: "/Users/example/AAAAT Workspace" }),
    }),
    profile: Object.freeze({
      current: async () => emptyProfile,
      addItem: async () => emptyProfile,
      updateItem: async () => emptyProfile,
      removeItem: async () => emptyProfile,
      createVariant: async () => emptyProfile,
      updateVariant: async () => emptyProfile,
      removeVariant: async () => emptyProfile,
      configureVariantItem: async () => emptyProfile,
      reorderVariant: async () => emptyProfile,
      resolveVariant: previewUnavailable,
    }),
    careerContext: Object.freeze({
      current: async () => emptyCareerContext,
      update: async (update: CareerContext) => update,
    }),
    documents: Object.freeze({
      list: async () => [],
      create: previewUnavailable,
      update: previewUnavailable,
      remove: async () => [],
      configureItem: previewUnavailable,
      reorder: previewUnavailable,
      resolve: previewUnavailable,
      render: previewUnavailable,
      regenerate: previewUnavailable,
      exportProject: async () => null,
    }),
    cvContentAccess: Object.freeze({
      current: previewUnavailable,
      update: previewUnavailable,
      updateRender: previewUnavailable,
    }),
    cvDescriptors: Object.freeze({
      current: previewUnavailable,
      update: previewUnavailable,
    }),
    candidatures: Object.freeze({
      list: async () => [],
      create: previewUnavailable,
      update: previewUnavailable,
      filter: async () => [],
      listFields: async () => [],
      createField: previewUnavailable,
      updateField: previewUnavailable,
      deleteField: async () => [],
      updateFieldPreferences: previewUnavailable,
      setFieldValue: previewUnavailable,
      clearFieldValue: previewUnavailable,
      listSources: async () => [],
      addSource: previewUnavailable,
      updateSource: previewUnavailable,
      removeSource: previewUnavailable,
      setDocuments: previewUnavailable,
      listConcepts: async () => [],
      createConcept: previewUnavailable,
      updateConcept: previewUnavailable,
      setConcepts: previewUnavailable,
    }),
    candidatureSearch: Object.freeze({ search: async () => [] }),
    aiConnections: Object.freeze({
      list: async () => [],
      save: previewUnavailable,
      setDefault: previewUnavailable,
      remove: async () => [],
      validateOperation: previewUnavailable,
      setOperationDefault: previewUnavailable,
      exportPortable: previewUnavailable,
      importPortable: previewUnavailable,
    }),
    artifacts: Object.freeze({
      list: async () => [],
      capture: previewUnavailable,
    }),
    todos: Object.freeze({
      list: async () => [],
      create: previewUnavailable,
      update: previewUnavailable,
      toggle: previewUnavailable,
      remove: async () => [],
    }),
    focus: Object.freeze({
      current: async () => ({ sources: true, concepts: true, todos: true, documents: true }),
      update: async (preferences: FocusMaterialPreferences) => preferences,
    }),
    setupEnvironment: Object.freeze({
      current: previewUnavailable,
    }),
    workspaceRecovery: Object.freeze({
      backup: previewUnavailable,
      restore: previewUnavailable,
    }),
  });
}

if (import.meta.env.DEV && !("aaaat" in window)) {
  Object.defineProperty(window, "aaaat", {
    configurable: false,
    value: createPreviewApi(),
    writable: false,
  });
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("AAAAT renderer root is missing");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
