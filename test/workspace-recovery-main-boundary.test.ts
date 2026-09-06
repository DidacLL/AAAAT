import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const mainSource = readFileSync(path.join(process.cwd(), "src/main/main.ts"), "utf8");

describe("workspace recovery main boundary", () => {
  it("keeps recovery selection and activation in Electron main", () => {
    expect(mainSource).toContain("workspaceRecoveryChannels.backup");
    expect(mainSource).toContain("workspaceRecoveryChannels.restore");
    expect(mainSource).toContain("createWorkspaceBackup(requireWorkspaceRoot(), destinationPath)");
    expect(mainSource).toContain("restoreWorkspaceBackup(backupPath, destinationPath)");
    expect(mainSource.indexOf("restoreWorkspaceBackup(backupPath, destinationPath)")).toBeLessThan(
      mainSource.indexOf("currentWorkspace = workspace"),
    );
  });
});
