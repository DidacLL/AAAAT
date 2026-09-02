import path from "node:path";

import {
  app,
  BrowserWindow,
  ipcMain,
  type IpcMainInvokeEvent,
  session,
} from "electron";

import {
  channels,
  systemInfoSchema,
  workspaceStatusSchema,
} from "../shared/contracts";
import { createWindowOptions } from "./window-options";
import { initializeWorkspace } from "./workspace";

app.enableSandbox();

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

function registerIpc(mainWindow: BrowserWindow): void {
  ipcMain.removeHandler(channels.systemInfo);
  ipcMain.removeHandler(channels.workspaceInitialize);

  ipcMain.handle(channels.systemInfo, (event) => {
    assertTrustedSender(event, mainWindow);
    return systemInfoSchema.parse({
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
    });
  });

  ipcMain.handle(channels.workspaceInitialize, (event) => {
    assertTrustedSender(event, mainWindow);
    const databasePath = path.join(app.getPath("userData"), "workspace.sqlite");
    return workspaceStatusSchema.parse(initializeWorkspace(databasePath));
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
