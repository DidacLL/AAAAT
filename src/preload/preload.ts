import { contextBridge, ipcRenderer } from "electron";

import { createArtifactDesktopApi } from "./artifact-api";
import { createDesktopApi } from "./api";
import { createFocusDesktopApi } from "./focus-api";
import { createTodoDesktopApi } from "./todo-api";

const invoke = (channel: string, ...args: readonly unknown[]) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld(
  "aaaat",
  Object.freeze({
    ...createDesktopApi(invoke),
    ...createArtifactDesktopApi(invoke),
    ...createTodoDesktopApi(invoke),
    ...createFocusDesktopApi(invoke),
  }),
);