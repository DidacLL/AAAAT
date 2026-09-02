import { describe, expect, it } from "vitest";

import { createWindowOptions } from "../src/main/window-options";

describe("secure BrowserWindow options", () => {
  it("keeps the renderer sandboxed and unprivileged", () => {
    const options = createWindowOptions("C:/safe/preload.js", false);

    expect(options.webPreferences).toMatchObject({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      devTools: false,
      preload: "C:/safe/preload.js",
    });
  });
});
