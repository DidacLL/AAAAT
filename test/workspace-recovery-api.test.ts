import { describe, expect, it, vi } from "vitest";

import { createWorkspaceRecoveryDesktopApi } from "../src/preload/workspace-recovery-api";
import { workspaceRecoveryChannels } from "../src/shared/workspace-recovery-contracts";

const restoredWorkspace = { rootPath: "/tmp/restored-aaaat" };

describe("workspace recovery preload API", () => {
  it("forwards only the two fixed no-argument recovery intentions", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === workspaceRecoveryChannels.backup) return { status: "backed_up" };
      if (channel === workspaceRecoveryChannels.restore) {
        return { status: "restored", workspace: restoredWorkspace };
      }
      throw new Error("unexpected channel");
    });
    const api = createWorkspaceRecoveryDesktopApi(invoke);

    await expect(api.workspaceRecovery.backup()).resolves.toEqual({ status: "backed_up" });
    await expect(api.workspaceRecovery.restore()).resolves.toEqual({
      status: "restored",
      workspace: restoredWorkspace,
    });
    expect(invoke).toHaveBeenCalledWith(workspaceRecoveryChannels.backup);
    expect(invoke).toHaveBeenCalledWith(workspaceRecoveryChannels.restore);
  });

  it("rejects malformed privileged recovery responses", async () => {
    const api = createWorkspaceRecoveryDesktopApi(async () => ({ status: "restored" }));
    await expect(api.workspaceRecovery.restore()).rejects.toThrow();
  });
});
