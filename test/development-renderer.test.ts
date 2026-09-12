// @vitest-environment node

import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";

let server: ViteDevServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("development renderer server", () => {
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
