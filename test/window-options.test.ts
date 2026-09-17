import { describe, expect, it } from "vitest";

import { createWindowOptions } from "../src/main/window-options";

describe("secure BrowserWindow options", () => {
  it("keeps the renderer sandboxed and unprivileged without imposing a product minimum", () => {
    const options = createWindowOptions("C:/safe/preload.js", false);

    expect(options).not.toHaveProperty("minWidth");
    expect(options).not.toHaveProperty("minHeight");
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
