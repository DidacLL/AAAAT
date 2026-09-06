import { describe, expect, it } from "vitest";

import {
  workspaceBackupResultSchema,
  workspaceRestoreResultSchema,
} from "../src/shared/workspace-recovery-contracts";

describe("workspace recovery contracts", () => {
  it("accepts only bounded path-free recovery results", () => {
    expect(workspaceBackupResultSchema.parse({ status: "cancelled" })).toEqual({ status: "cancelled" });
    expect(
      workspaceRestoreResultSchema.parse({
        status: "restored",
        workspace: { rootPath: "/tmp/restored-aaaat" },
      }),
    ).toEqual({ status: "restored", workspace: { rootPath: "/tmp/restored-aaaat" } });
    expect(() =>
      workspaceBackupResultSchema.parse({ status: "backed_up", path: "/tmp/private" }),
    ).toThrow();
  });
});
