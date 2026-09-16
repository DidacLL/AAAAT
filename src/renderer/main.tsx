import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";
import "./candidatures.css";
import "./professional-information.css";

if (!("aaaat" in window)) {
  throw new Error("AAAAT desktop preload is required for the renderer.");
}

const root = document.getElementById("root");
if (!root) throw new Error("AAAAT renderer root is missing");
createRoot(root).render(<StrictMode><App /></StrictMode>);
