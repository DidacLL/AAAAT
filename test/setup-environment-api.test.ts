// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createSetupEnvironmentDesktopApi } from "../src/preload/setup-environment-api";
import { setupEnvironmentChannels } from "../src/shared/setup-environment-contracts";

const snapshot = {
  workspaceReady: true,
  tex: {
    commands: [
      { command: "latexmk" as const, available: true, version: "Latexmk 4.86" },
      { command: "pdflatex" as const, available: true, version: "pdfTeX" },
    ],
    documentRenderingReady: true,
  },
  ai: {
    configurationReadable: true,
    connectionCount: 1,
    operations: [
      { operation: "opportunity_review" as const, available: true, connectionName: "Local model" },
      { operation: "job_extraction" as const, available: false, connectionName: null },
      { operation: "historical_field_discovery" as const, available: false, connectionName: null },
      { operation: "variant_recommendation" as const, available: false, connectionName: null },
      { operation: "cv_tailoring" as const, available: false, connectionName: null },
      { operation: "cover_letter_draft" as const, available: false, connectionName: null },
    ],
  },
};

describe("setup environment preload API", () => {
  it("exposes bounded environment status and local connection details", async () => {
    const invoke = vi.fn(async (channel: string) =>
      channel === setupEnvironmentChannels.current
        ? snapshot
        : { packaged: true, executablePath: "C:\\Apps\\AAAAT.exe", workspacePath: "C:\\Data\\AAAAT" },
    );
    const api = createSetupEnvironmentDesktopApi(invoke);

    await expect(api.setupEnvironment.current()).resolves.toEqual(snapshot);
    await expect(api.setupEnvironment.externalConnection()).resolves.toEqual({ packaged: true, executablePath: "C:\\Apps\\AAAAT.exe", workspacePath: "C:\\Data\\AAAAT" });
    expect(invoke).toHaveBeenNthCalledWith(1, setupEnvironmentChannels.current);
    expect(invoke).toHaveBeenNthCalledWith(2, setupEnvironmentChannels.externalConnection);
  });

  it("rejects malformed privileged output", async () => {
    const invoke = vi.fn(async () => ({ packaged: true, executablePath: "AAAAT", path: "/arbitrary" }));
    const api = createSetupEnvironmentDesktopApi(invoke);

    await expect(api.setupEnvironment.externalConnection()).rejects.toThrow();
  });
});
