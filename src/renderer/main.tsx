import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { DesktopApi } from "../shared/contracts";
import { App } from "./App";
import "./styles.css";

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
