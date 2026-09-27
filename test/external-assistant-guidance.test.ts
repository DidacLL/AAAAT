// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { externalAssistantGuidance } from "../src/main/external-assistant-guidance";
import { createSetupEnvironmentDesktopApi } from "../src/preload/setup-environment-api";
import { setupEnvironmentChannels } from "../src/shared/setup-environment-contracts";

describe("reusable external AI guidance", () => {
  it("defines the AAAAT interaction once without bloating individual task payloads", () => {
    expect(externalAssistantGuidance.content).toContain("Context section");
    expect(externalAssistantGuidance.content).toContain("Task section");
    expect(externalAssistantGuidance.content).toContain("Markdown or plain text");
    expect(externalAssistantGuidance.content).toContain("When AAAAT tools are not available");
    expect(externalAssistantGuidance.content).not.toContain("database");
    expect(externalAssistantGuidance.content).not.toContain("local path");
    expect(externalAssistantGuidance.content).not.toContain("MCP");
  });

  it("exposes guidance, copy and export as bounded setup actions", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === setupEnvironmentChannels.externalGuidance) return externalAssistantGuidance;
      if (channel === setupEnvironmentChannels.externalGuidanceCopy) return "copied";
      if (channel === setupEnvironmentChannels.externalGuidanceExport) return "exported";
      throw new Error(`Unexpected channel ${channel}`);
    });
    const api = createSetupEnvironmentDesktopApi(invoke);

    await expect(api.setupEnvironment.externalGuidance()).resolves.toEqual(externalAssistantGuidance);
    await expect(api.setupEnvironment.copyExternalGuidance()).resolves.toBe("copied");
    await expect(api.setupEnvironment.exportExternalGuidance()).resolves.toBe("exported");

    expect(invoke).toHaveBeenCalledWith(setupEnvironmentChannels.externalGuidance);
    expect(invoke).toHaveBeenCalledWith(setupEnvironmentChannels.externalGuidanceCopy);
    expect(invoke).toHaveBeenCalledWith(setupEnvironmentChannels.externalGuidanceExport);
  });
});
