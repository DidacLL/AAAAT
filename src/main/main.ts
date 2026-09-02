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
  channels,
  optionalWorkspaceInfoSchema,
  systemInfoSchema,
  workspaceChoiceSchema,
  workspaceInfoSchema,
  type WorkspaceInfo,
} from "../shared/contracts";
import { createWindowOptions } from "./window-options";
import {
  createOrOpenWorkspace,
  openWorkspace,
  readLastWorkspacePath,
  rememberWorkspacePath,
} from "./workspace";

app.enableSandbox();

let currentWorkspace: WorkspaceInfo | null = null;

function assertTrustedSender(
  event: IpcMainInvokeEvent,
  mainWindow: BrowserWindow,
): void {
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

function registerIpc(mainWindow: BrowserWindow): void {
  ipcMain.removeHandler(channels.systemInfo);
  ipcMain.removeHandler(channels.workspaceCurrent);
  ipcMain.removeHandler(channels.workspaceChoose);

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
    return optionalWorkspaceInfoSchema.parse(
      await chooseWorkspace(mainWindow, choice),
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
  mainWindow.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
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

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(
        __dirname,
        "../renderer/" + MAIN_WINDOW_VITE_NAME + "/index.html",
      ),
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
