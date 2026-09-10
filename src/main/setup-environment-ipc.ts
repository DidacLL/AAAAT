import path from "node:path";

import { app, dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  setupEnvironmentChannels,
  setupEnvironmentSnapshotSchema,
  vscodeConnectionResultSchema,
} from "../shared/setup-environment-contracts";
import { getSetupEnvironmentSnapshot } from "./setup-environment-service";
import { activateVscodeMcpSetup, proposeVscodeMcpSetup } from "./vscode-mcp-setup";
import { readLastWorkspacePath } from "./workspace";

function assertTrustedSender(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): void {
  if (event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error("Untrusted IPC sender");
  }
}

function requireWorkspaceRoot(): string {
  const rootPath = readLastWorkspacePath(
    path.join(app.getPath("userData"), "workspace-settings.json"),
  );
  if (!rootPath) throw new Error("Choose an AAAAT workspace first.");
  return rootPath;
}

async function connectVscodeProject(mainWindow: BrowserWindow) {
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: "Choose VS Code project",
    buttonLabel: "Connect project",
    properties: ["openDirectory"],
  });
  const projectPath = selection.filePaths[0];
  if (selection.canceled || !projectPath) {
    return { status: "cancelled" as const, message: "No project was changed." };
  }

  try {
    const workspacePath = requireWorkspaceRoot();
    proposeVscodeMcpSetup(workspacePath, projectPath);
    const state = await activateVscodeMcpSetup({
      workspacePath,
      projectPath,
      executablePath: process.execPath,
    });
    return state === "already-configured"
      ? { status: state, message: "This VS Code project is already connected to the current AAAAT workspace." }
      : { status: state, message: "Connected. VS Code still controls whether to trust and enable the AAAAT tool." };
  } catch {
    return {
      status: "failed" as const,
      message: "AAAAT could not connect this project. Check its existing VS Code MCP configuration and try again.",
    };
  }
}

function registerSetupEnvironmentIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(setupEnvironmentChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(setupEnvironmentChannels.current, async (event) => {
    assertTrustedSender(event, mainWindow);
    return setupEnvironmentSnapshotSchema.parse(
      await getSetupEnvironmentSnapshot(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(setupEnvironmentChannels.connectVscode, async (event) => {
    assertTrustedSender(event, mainWindow);
    return vscodeConnectionResultSchema.parse(await connectVscodeProject(mainWindow));
  });
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerSetupEnvironmentIpc(mainWindow),
);
