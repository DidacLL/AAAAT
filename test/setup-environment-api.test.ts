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
  it("exposes bounded environment status and a no-input VS Code setup action", async () => {
    const invoke = vi.fn(async (channel: string) =>
      channel === setupEnvironmentChannels.current
        ? snapshot
        : { status: "configured", message: "Connected." },
    );
    const api = createSetupEnvironmentDesktopApi(invoke);

    await expect(api.setupEnvironment.current()).resolves.toEqual(snapshot);
    await expect(api.setupEnvironment.connectVscode()).resolves.toEqual({ status: "configured", message: "Connected." });
    expect(invoke).toHaveBeenNthCalledWith(1, setupEnvironmentChannels.current);
    expect(invoke).toHaveBeenNthCalledWith(2, setupEnvironmentChannels.connectVscode);
  });

  it("rejects malformed privileged output", async () => {
    const invoke = vi.fn(async () => ({ status: "configured", path: "/arbitrary" }));
    const api = createSetupEnvironmentDesktopApi(invoke);

    await expect(api.setupEnvironment.connectVscode()).rejects.toThrow();
  });
});
