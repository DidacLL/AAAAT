import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "../src/preload/api";
import { channels } from "../src/shared/contracts";

const emptyProfile = { items: [], variants: [] };

describe("desktop preload API", () => {
  it("exposes only fixed system, workspace, and profile intentions", async () => {
    const invoke = vi.fn(async (channel: string) => {
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

      if (channel === channels.workspaceChoose) {
        return { rootPath: "/tmp/aaaat-workspace" };
      }

      return emptyProfile;
    });

    const api = createDesktopApi(invoke);

    expect(Object.keys(api)).toEqual(["system", "workspace", "profile"]);
    expect(Object.keys(api.system)).toEqual(["info"]);
    expect(Object.keys(api.workspace)).toEqual(["current", "choose"]);
    expect(Object.keys(api.profile)).toEqual([
      "current",
      "addItem",
      "updateItem",
      "removeItem",
      "createVariant",
      "updateVariant",
      "removeVariant",
      "configureVariantItem",
      "reorderVariant",
      "resolveVariant",
    ]);

    await expect(api.system.info()).resolves.toMatchObject({
      electronVersion: "44.1.1",
    });
    await expect(api.workspace.current()).resolves.toBeNull();
    await expect(api.workspace.choose("create")).resolves.toEqual({
      rootPath: "/tmp/aaaat-workspace",
    });
    await expect(
      api.profile.addItem({ kind: "skill", title: "TypeScript" }),
    ).resolves.toEqual(emptyProfile);

    expect(invoke).toHaveBeenNthCalledWith(1, channels.systemInfo);
    expect(invoke).toHaveBeenNthCalledWith(2, channels.workspaceCurrent);
    expect(invoke).toHaveBeenNthCalledWith(
      3,
      channels.workspaceChoose,
      "create",
    );
    expect(invoke).toHaveBeenNthCalledWith(4, channels.profileAddItem, {
      kind: "skill",
      title: "TypeScript",
    });
  });

  it("rejects malformed privileged responses and invalid profile input", async () => {
    const api = createDesktopApi(async () => ({ schemaVersion: 1 }));

    await expect(api.workspace.current()).rejects.toThrow();
    await expect(
      api.profile.addItem({ kind: "skill", title: "" }),
    ).rejects.toThrow();
  });
});
