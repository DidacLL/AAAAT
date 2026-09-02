import { contextBridge, ipcRenderer } from "electron";

import { createDesktopApi } from "./api";

contextBridge.exposeInMainWorld(
  "aaaat",
  createDesktopApi((channel) => ipcRenderer.invoke(channel)),
);
