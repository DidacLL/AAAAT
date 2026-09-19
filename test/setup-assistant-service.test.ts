// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getSetupAssistantAccess,
  requireConfiguratorActionsAllowed,
  requireInstallerActionsAllowed,
  updateSetupAssistantAccess,
} from "../src/main/setup-assistant-service";
import { createOrOpenWorkspace, resetWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-setup-authority-"));
  createOrOpenWorkspace(root);
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("bounded setup assistant authority", () => {
  it("defaults both mutation classes off and persists only explicit workspace-local choices", () => {
    const root = workspace();
    expect(getSetupAssistantAccess(root)).toEqual({
      installerActionsAllowed: false,
      configuratorActionsAllowed: false,
    });
    expect(() => requireInstallerActionsAllowed(root)).toThrow(/disabled/i);
    expect(() => requireConfiguratorActionsAllowed(root)).toThrow(/disabled/i);

    expect(
      updateSetupAssistantAccess(root, {
        installerActionsAllowed: true,
        configuratorActionsAllowed: false,
      }),
    ).toEqual({ installerActionsAllowed: true, configuratorActionsAllowed: false });
    expect(() => requireInstallerActionsAllowed(root)).not.toThrow();
    expect(() => requireConfiguratorActionsAllowed(root)).toThrow(/disabled/i);
  });

  it("is cleared by the existing destructive workspace reset", () => {
    const root = workspace();
    updateSetupAssistantAccess(root, {
      installerActionsAllowed: true,
      configuratorActionsAllowed: true,
    });
    resetWorkspace(root);
    expect(getSetupAssistantAccess(root)).toEqual({
      installerActionsAllowed: false,
      configuratorActionsAllowed: false,
    });
  });
});
