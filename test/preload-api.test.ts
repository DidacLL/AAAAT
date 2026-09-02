import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "../src/preload/api";
import { channels } from "../src/shared/contracts";

describe("desktop preload API", () => {
  it("exposes only fixed system and workspace intentions", async () => {
    const invoke = vi.fn(
      async (channel: string, ..._args: readonly unknown[]) => {
        if (channel === channels.systemInfo) {
          return {
            appVersion: "2.0.0",
            electronVersion: "44.1.1",
            nodeVersion: "24.19.0",
          };
        }

        if (channel === channels.workspaceCurrent) {
          return null;
        }

        return {
          rootPath: "/tmp/aaaat-workspace",
          schemaVersion: 1,
          initializedAt: "2026-09-02T12:00:00.000Z",
        };
      },
    );

    const api = createDesktopApi(invoke);

    expect(Object.keys(api)).toEqual(["system", "workspace"]);
    expect(Object.keys(api.system)).toEqual(["info"]);
    expect(Object.keys(api.workspace)).toEqual(["current", "choose"]);
    await expect(api.system.info()).resolves.toMatchObject({
      electronVersion: "44.1.1",
    });
    await expect(api.workspace.current()).resolves.toBeNull();
    await expect(api.workspace.choose("create")).resolves.toMatchObject({
      rootPath: "/tmp/aaaat-workspace",
      schemaVersion: 1,
    });
    expect(invoke).toHaveBeenNthCalledWith(1, channels.systemInfo);
    expect(invoke).toHaveBeenNthCalledWith(2, channels.workspaceCurrent);
    expect(invoke).toHaveBeenNthCalledWith(
      3,
      channels.workspaceChoose,
      "create",
    );
  });

  it("rejects malformed privileged responses", async () => {
    const api = createDesktopApi(async () => ({ schemaVersion: 1 }));

    await expect(api.workspace.current()).rejects.toThrow();
  });
});
