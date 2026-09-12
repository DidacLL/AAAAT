import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  todoChannels,
  todoInputSchema,
  todoListSchema,
  todoRecordSchema,
  todoToggleSchema,
  todoUpdateSchema,
} from "../shared/todo-contracts";
import { createTodo, listTodos, removeTodo, toggleTodo, updateTodo } from "./todo-service";
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

export function registerTodoIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(todoChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(todoChannels.list, (event) => {
    assertTrustedSender(event, mainWindow);
    return todoListSchema.parse(listTodos(requireWorkspaceRoot()));
  });
  ipcMain.handle(todoChannels.create, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return todoRecordSchema.parse(createTodo(requireWorkspaceRoot(), todoInputSchema.parse(input)));
  });
  ipcMain.handle(todoChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return todoRecordSchema.parse(updateTodo(requireWorkspaceRoot(), todoUpdateSchema.parse(input)));
  });
  ipcMain.handle(todoChannels.toggle, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return todoRecordSchema.parse(toggleTodo(requireWorkspaceRoot(), todoToggleSchema.parse(input)));
  });
  ipcMain.handle(todoChannels.remove, (event, todoId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return todoListSchema.parse(
      removeTodo(requireWorkspaceRoot(), todoRecordSchema.shape.id.parse(todoId)),
    );
  });
}
