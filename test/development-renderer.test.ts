// @vitest-environment node

import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";

import { developmentServer } from "../vite.renderer.config.mts";

let server: ViteDevServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
  developmentServer.port = 0;
});

describe("development renderer server", () => {
  it("keeps the configured port mutable for Electron Forge's resolved-port handoff", () => {
    developmentServer.port = 31810;
    expect(developmentServer.port).toBe(31810);
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
