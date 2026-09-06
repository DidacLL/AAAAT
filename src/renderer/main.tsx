import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { AiConnectionDesktopApi } from "../shared/ai-connection-contracts";
import type { ArtifactDesktopApi } from "../shared/artifact-contracts";
import type { CandidatureSearchDesktopApi } from "../shared/candidature-search-contracts";
import type { CareerContext, DesktopApi, ProfileSnapshot } from "../shared/contracts";
import type { FocusDesktopApi, FocusMaterialPreferences } from "../shared/focus-contracts";
import type { TodoDesktopApi } from "../shared/todo-contracts";
import { App } from "./App";
import "./styles.css";
import "./candidatures.css";

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
  TodoDesktopApi &
  FocusDesktopApi {
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
