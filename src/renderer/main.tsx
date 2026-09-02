import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { DesktopApi, ProfileSnapshot } from "../shared/contracts";
import { App } from "./App";
import "./styles.css";

const emptyProfile: ProfileSnapshot = { items: [], variants: [] };

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
      choose: async () => ({
        rootPath: "/Users/example/AAAAT Workspace",
      }),
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
      resolveVariant: async () => {
        throw new Error("Create a preview variant before resolving it.");
      },
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
