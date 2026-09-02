import path from "node:path";

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  session,
} from "electron";

import {
  candidatureConceptSelectionSchema,
  candidatureDocumentSelectionSchema,
  candidatureInputSchema,
  candidatureListSchema,
  candidatureRecordSchema,
  candidatureUpdateSchema,
  channels,
  conceptInputSchema,
  conceptListSchema,
  conceptRecordSchema,
  conceptUpdateSchema,
  documentExportResultSchema,
  documentInputSchema,
  documentItemRuleInputSchema,
  documentListSchema,
  documentRecordSchema,
  documentReorderSchema,
  documentUpdateSchema,
  optionalWorkspaceInfoSchema,
  profileItemInputSchema,
  profileItemSchema,
  profileItemUpdateSchema,
  profileSnapshotSchema,
  profileVariantInputSchema,
  profileVariantItemRuleInputSchema,
  profileVariantReorderSchema,
  profileVariantSchema,
  profileVariantUpdateSchema,
  resolvedDocumentSchema,
  resolvedProfileSchema,
  systemInfoSchema,
  workspaceChoiceSchema,
  type WorkspaceInfo,
} from "../shared/contracts";
import {
  createCandidature,
  listCandidatures,
  setCandidatureConcepts,
  setCandidatureDocuments,
  updateCandidature,
} from "./candidature-service";
import { createConcept, listConcepts, updateConcept } from "./concept-service";
import {
  configureDocumentItem,
  createDocument,
  exportDocumentProject,
  listDocuments,
  regenerateDocument,
  removeDocument,
  renderDocument,
  reorderDocument,
  resolveDocument,
  updateDocument,
} from "./document-service";
import {
  addProfileItem,
  configureProfileVariantItem,
  createProfileVariant,
  getProfile,
  removeProfileItem,
  removeProfileVariant,
  reorderProfileVariant,
  resolveProfileVariant,
  updateProfileItem,
  updateProfileVariant,
} from "./profile-service";
import { createWindowOptions } from "./window-options";
import {
  createOrOpenWorkspace,
  openWorkspace,
  readLastWorkspacePath,
  rememberWorkspacePath,
} from "./workspace";

app.enableSandbox();

let currentWorkspace: WorkspaceInfo | null = null;

function assertTrustedSender(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): void {
  if (
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame
  ) {
    throw new Error("Untrusted IPC sender");
  }
}

function workspaceSettingsPath(): string {
  return path.join(app.getPath("userData"), "workspace-settings.json");
}

function currentOrRememberedWorkspace(): WorkspaceInfo | null {
  if (currentWorkspace) {
    return currentWorkspace;
  }
  const rememberedPath = readLastWorkspacePath(workspaceSettingsPath());
  if (!rememberedPath) {
    return null;
  }
  currentWorkspace = openWorkspace(rememberedPath);
  return currentWorkspace;
}

function requireWorkspaceRoot(): string {
  const workspace = currentOrRememberedWorkspace();
  if (!workspace) {
    throw new Error("Choose an AAAAT workspace first.");
  }
  return workspace.rootPath;
}

async function chooseWorkspace(
  mainWindow: BrowserWindow,
  choice: unknown,
): Promise<WorkspaceInfo | null> {
  const validatedChoice = workspaceChoiceSchema.parse(choice);
  const creating = validatedChoice === "create";
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: creating
      ? "Create or select an AAAAT workspace"
      : "Open an AAAAT workspace",
    buttonLabel: creating ? "Use this folder" : "Open workspace",
    properties: creating
      ? ["openDirectory", "createDirectory", "promptToCreate"]
      : ["openDirectory"],
  });
  if (selection.canceled) {
    return null;
  }
  const selectedPath = selection.filePaths[0];
  if (!selectedPath) {
    return null;
  }
  const workspace = creating
    ? createOrOpenWorkspace(selectedPath)
    : openWorkspace(selectedPath);
  rememberWorkspacePath(workspaceSettingsPath(), workspace.rootPath);
  currentWorkspace = workspace;
  return workspace;
}

async function exportDocument(mainWindow: BrowserWindow, documentId: string) {
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: "Export portable document project",
    buttonLabel: "Export here",
    properties: ["openDirectory", "createDirectory"],
  });
  if (selection.canceled || !selection.filePaths[0]) {
    return null;
  }
  return {
    exportedPath: exportDocumentProject(
      requireWorkspaceRoot(),
      documentId,
      selection.filePaths[0],
    ),
  };
}

function registerIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(channels)) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(channels.systemInfo, (event) => {
    assertTrustedSender(event, mainWindow);
    return systemInfoSchema.parse({
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
    });
  });

  ipcMain.handle(channels.workspaceCurrent, (event) => {
    assertTrustedSender(event, mainWindow);
    return optionalWorkspaceInfoSchema.parse(currentOrRememberedWorkspace());
  });

  ipcMain.handle(channels.workspaceChoose, async (event, choice: unknown) => {
    assertTrustedSender(event, mainWindow);
    return optionalWorkspaceInfoSchema.parse(await chooseWorkspace(mainWindow, choice));
  });

  ipcMain.handle(channels.profileCurrent, (event) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(getProfile(requireWorkspaceRoot()));
  });
  ipcMain.handle(channels.profileAddItem, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(
      addProfileItem(requireWorkspaceRoot(), profileItemInputSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.profileUpdateItem, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(
      updateProfileItem(requireWorkspaceRoot(), profileItemUpdateSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.profileRemoveItem, (event, itemId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(
      removeProfileItem(requireWorkspaceRoot(), profileItemSchema.shape.id.parse(itemId)),
    );
  });
  ipcMain.handle(channels.profileCreateVariant, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(
      createProfileVariant(requireWorkspaceRoot(), profileVariantInputSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.profileUpdateVariant, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(
      updateProfileVariant(requireWorkspaceRoot(), profileVariantUpdateSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.profileRemoveVariant, (event, variantId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(
      removeProfileVariant(requireWorkspaceRoot(), profileVariantSchema.shape.id.parse(variantId)),
    );
  });
  ipcMain.handle(channels.profileConfigureVariantItem, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(
      configureProfileVariantItem(
        requireWorkspaceRoot(),
        profileVariantItemRuleInputSchema.parse(input),
      ),
    );
  });
  ipcMain.handle(channels.profileReorderVariant, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileSnapshotSchema.parse(
      reorderProfileVariant(requireWorkspaceRoot(), profileVariantReorderSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.profileResolveVariant, (event, variantId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return resolvedProfileSchema.parse(
      resolveProfileVariant(requireWorkspaceRoot(), profileVariantSchema.shape.id.parse(variantId)),
    );
  });

  ipcMain.handle(channels.documentList, (event) => {
    assertTrustedSender(event, mainWindow);
    return documentListSchema.parse(listDocuments(requireWorkspaceRoot()));
  });
  ipcMain.handle(channels.documentCreate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentRecordSchema.parse(
      createDocument(requireWorkspaceRoot(), documentInputSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.documentUpdate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentRecordSchema.parse(
      updateDocument(requireWorkspaceRoot(), documentUpdateSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.documentRemove, (event, documentId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentListSchema.parse(
      removeDocument(requireWorkspaceRoot(), documentRecordSchema.shape.id.parse(documentId)),
    );
  });
  ipcMain.handle(channels.documentConfigureItem, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentRecordSchema.parse(
      configureDocumentItem(requireWorkspaceRoot(), documentItemRuleInputSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.documentReorder, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentRecordSchema.parse(
      reorderDocument(requireWorkspaceRoot(), documentReorderSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.documentResolve, (event, documentId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return resolvedDocumentSchema.parse(
      resolveDocument(requireWorkspaceRoot(), documentRecordSchema.shape.id.parse(documentId)),
    );
  });
  ipcMain.handle(channels.documentRender, async (event, documentId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentRecordSchema.parse(
      await renderDocument(requireWorkspaceRoot(), documentRecordSchema.shape.id.parse(documentId)),
    );
  });
  ipcMain.handle(channels.documentRegenerate, (event, documentId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentRecordSchema.parse(
      regenerateDocument(requireWorkspaceRoot(), documentRecordSchema.shape.id.parse(documentId)),
    );
  });
  ipcMain.handle(channels.documentExport, async (event, documentId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentExportResultSchema.parse(
      await exportDocument(mainWindow, documentRecordSchema.shape.id.parse(documentId)),
    );
  });

  ipcMain.handle(channels.candidatureList, (event) => {
    assertTrustedSender(event, mainWindow);
    return candidatureListSchema.parse(listCandidatures(requireWorkspaceRoot()));
  });
  ipcMain.handle(channels.candidatureCreate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureRecordSchema.parse(
      createCandidature(requireWorkspaceRoot(), candidatureInputSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.candidatureUpdate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureRecordSchema.parse(
      updateCandidature(requireWorkspaceRoot(), candidatureUpdateSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.candidatureSetDocuments, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureRecordSchema.parse(
      setCandidatureDocuments(
        requireWorkspaceRoot(),
        candidatureDocumentSelectionSchema.parse(input),
      ),
    );
  });
  ipcMain.handle(channels.candidatureListConcepts, (event) => {
    assertTrustedSender(event, mainWindow);
    return conceptListSchema.parse(listConcepts(requireWorkspaceRoot()));
  });
  ipcMain.handle(channels.candidatureCreateConcept, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return conceptRecordSchema.parse(
      createConcept(requireWorkspaceRoot(), conceptInputSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.candidatureUpdateConcept, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return conceptRecordSchema.parse(
      updateConcept(requireWorkspaceRoot(), conceptUpdateSchema.parse(input)),
    );
  });
  ipcMain.handle(channels.candidatureSetConcepts, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureRecordSchema.parse(
      setCandidatureConcepts(
        requireWorkspaceRoot(),
        candidatureConceptSelectionSchema.parse(input),
      ),
    );
  });
}

function lockDownSession(): void {
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  session.defaultSession.setDevicePermissionHandler(() => false);
}

function protectWindow(mainWindow: BrowserWindow): void {
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl !== mainWindow.webContents.getURL()) {
      event.preventDefault();
    }
  });
}

function createWindow(): BrowserWindow {
  const development = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  const mainWindow = new BrowserWindow(
    createWindowOptions(path.join(__dirname, "preload.js"), development),
  );
  registerIpc(mainWindow);
  protectWindow(mainWindow);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, "../renderer/" + MAIN_WINDOW_VITE_NAME + "/index.html"),
    );
  }
  return mainWindow;
}

void app.whenReady().then(() => {
  lockDownSession();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
