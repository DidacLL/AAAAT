import { describe, expect, it } from "vitest";

import {
  workspaceBackupResultSchema,
  workspaceRestoreResultSchema,
} from "../src/shared/workspace-recovery-contracts";

describe("workspace recovery state results", () => {
  it("keeps cancellation path-free and restores only through ordinary WorkspaceInfo", () => {
    expect(workspaceBackupResultSchema.parse({ status: "cancelled" })).toEqual({ status: "cancelled" });
    expect(workspaceRestoreResultSchema.parse({ status: "cancelled" })).toEqual({ status: "cancelled" });
    expect(
      workspaceRestoreResultSchema.parse({
        status: "restored",
        workspace: { rootPath: "/tmp/restored" },
      }),
    ).toEqual({ status: "restored", workspace: { rootPath: "/tmp/restored" } });
  });
});
