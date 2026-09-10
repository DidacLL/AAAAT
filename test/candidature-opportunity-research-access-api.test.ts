// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createCandidatureOpportunityResearchAccessDesktopApi } from "../src/preload/candidature-opportunity-research-access-api";
import { candidatureOpportunityResearchAccessChannels } from "../src/shared/candidature-opportunity-research-access-contracts";

const candidatureId = "00000000-0000-4000-8000-000000000451";

describe("opportunity research access preload API", () => {
  it("uses fixed task-specific channels and validates request and response data", async () => {
    const invoke = vi.fn(async (channel: string) => ({
      candidatureId,
      allowed: channel === candidatureOpportunityResearchAccessChannels.current,
    }));
    const api = createCandidatureOpportunityResearchAccessDesktopApi(invoke);

    await expect(api.candidatureOpportunityResearchAccess.current(candidatureId)).resolves.toEqual({
      candidatureId,
      allowed: true,
    });
    expect(invoke).toHaveBeenCalledWith(
      candidatureOpportunityResearchAccessChannels.current,
      candidatureId,
    );

    await expect(
      api.candidatureOpportunityResearchAccess.update({ candidatureId, allowed: false }),
    ).resolves.toEqual({ candidatureId, allowed: false });
    expect(invoke).toHaveBeenCalledWith(candidatureOpportunityResearchAccessChannels.update, {
      candidatureId,
      allowed: false,
    });
  });

  it("rejects invalid privileged output before returning it to the renderer", async () => {
    const api = createCandidatureOpportunityResearchAccessDesktopApi(async () => ({
      candidatureId,
      allowed: "yes",
    }));
    await expect(api.candidatureOpportunityResearchAccess.current(candidatureId)).rejects.toThrow();
  });
});
