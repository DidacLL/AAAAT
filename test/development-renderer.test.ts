// @vitest-environment node

import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import {
  createServer,
  loadConfigFromFile,
  type ViteDevServer,
} from "vite";

let server: ViteDevServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("development renderer server", () => {
  it("keeps the configured port mutable for Electron Forge's resolved-port handoff", async () => {
    const loaded = await loadConfigFromFile(
      { command: "serve", mode: "development" },
      path.resolve("vite.renderer.config.mts"),
    );

    expect(loaded).not.toBeNull();
    const serverConfig = loaded?.config.server;
    if (!serverConfig) {
      throw new Error("Vite development server config was not loaded.");
    }

    expect(serverConfig.host).toBe("127.0.0.1");
    expect(serverConfig.port).toBe(0);

    serverConfig.port = 31810;
    expect(serverConfig.port).toBe(31810);
  });

  it("binds loopback on an OS-assigned available port", async () => {
    server = await createServer({
      configFile: path.resolve("vite.renderer.config.mts"),
      logLevel: "silent",
    });

    expect(server.config.server.host).toBe("127.0.0.1");
    expect(server.config.server.port).toBe(0);

    await server.listen();

    const address = server.httpServer?.address();
    expect(address).not.toBeNull();
    expect(typeof address).toBe("object");
    if (!address || typeof address === "string") {
      throw new Error("Vite development server did not expose a TCP address.");
    }

    expect(address.address).toBe("127.0.0.1");
    expect(address.port).toBeGreaterThan(0);
  });
});
