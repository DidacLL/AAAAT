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
  it("exposes one bounded read-only environment operation", async () => {
    const invoke = vi.fn(async () => snapshot);
    const api = createSetupEnvironmentDesktopApi(invoke);

    await expect(api.setupEnvironment.current()).resolves.toEqual(snapshot);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(setupEnvironmentChannels.current);
  });

  it("rejects malformed privileged output", async () => {
    const invoke = vi.fn(async () => ({ ...snapshot, workspaceReady: "yes" }));
    const api = createSetupEnvironmentDesktopApi(invoke);

    await expect(api.setupEnvironment.current()).rejects.toThrow();
  });
});
