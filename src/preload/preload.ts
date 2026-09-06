import { contextBridge, ipcRenderer } from "electron";

import { createAiConnectionDesktopApi } from "./ai-connection-api";
import { createArtifactDesktopApi } from "./artifact-api";
import { createCandidatureSearchDesktopApi } from "./candidature-search-api";
import { createDesktopApi } from "./api";
import { createCombinedDocumentDesktopApi } from "./combined-document-api";
import { createFocusDesktopApi } from "./focus-api";
import { createSetupEnvironmentDesktopApi } from "./setup-environment-api";
import { createTodoDesktopApi } from "./todo-api";

const invoke = (channel: string, ...args: readonly unknown[]) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld(
  "aaaat",
  Object.freeze({
    ...createDesktopApi(invoke),
    ...createAiConnectionDesktopApi(invoke),
    ...createArtifactDesktopApi(invoke),
    ...createCandidatureSearchDesktopApi(invoke),
    ...createCombinedDocumentDesktopApi(invoke),
    ...createTodoDesktopApi(invoke),
    ...createFocusDesktopApi(invoke),
    ...createSetupEnvironmentDesktopApi(invoke),
  }),
);
