import type { BrowserWindowConstructorOptions } from "electron";

export function createWindowOptions(
  preloadPath: string,
  development: boolean,
): BrowserWindowConstructorOptions {
  return {
    width: 1180,
    height: 760,
    minWidth: 720,
    minHeight: 600,
    backgroundColor: "#faf6ef",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      devTools: development,
      preload: preloadPath,
    },
  };
}
