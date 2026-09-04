import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { CareerContext, DesktopApi, ProfileSnapshot } from "../shared/contracts";
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

function createPreviewApi(): DesktopApi {
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
