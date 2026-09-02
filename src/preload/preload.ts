import { contextBridge, ipcRenderer } from "electron";

import { createDesktopApi } from "./api";

contextBridge.exposeInMainWorld(
  "aaaat",
  createDesktopApi((channel, ...args) => ipcRenderer.invoke(channel, ...args)),
);
