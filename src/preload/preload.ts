import { contextBridge, ipcRenderer } from "electron";

import { createDesktopApi } from "./api";
import { createTodoDesktopApi } from "./todo-api";

const invoke = (channel: string, ...args: readonly unknown[]) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld(
  "aaaat",
  Object.freeze({ ...createDesktopApi(invoke), ...createTodoDesktopApi(invoke) }),
);
