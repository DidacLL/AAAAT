import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "../src/preload/api";
import { channels } from "../src/shared/contracts";

describe("desktop preload API", () => {
  it("exposes only fixed system and workspace methods", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === channels.systemInfo) {
        return {
          appVersion: "2.0.0",
          electronVersion: "44.1.1",
          nodeVersion: "24.19.0",
        };
      }

      return {
        state: "ready",
        schemaVersion: 1,
        initializedAt: "2026-09-02T12:00:00.000Z",
      };
    });

    const api = createDesktopApi(invoke);

    expect(Object.keys(api)).toEqual(["system", "workspace"]);
    expect(Object.keys(api.system)).toEqual(["info"]);
    expect(Object.keys(api.workspace)).toEqual(["initialize"]);
    await expect(api.system.info()).resolves.toMatchObject({
      electronVersion: "44.1.1",
    });
    await expect(api.workspace.initialize()).resolves.toMatchObject({
      state: "ready",
      schemaVersion: 1,
    });
    expect(invoke).toHaveBeenNthCalledWith(1, channels.systemInfo);
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      channels.workspaceInitialize,
    );
  });

  it("rejects malformed privileged responses", async () => {
    const api = createDesktopApi(async () => ({ state: "ready" }));

    await expect(api.workspace.initialize()).rejects.toThrow();
  });
});
