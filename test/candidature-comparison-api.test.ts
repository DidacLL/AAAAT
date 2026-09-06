import { describe, expect, it, vi } from "vitest";

import { createCandidatureComparisonDesktopApi } from "../src/preload/candidature-comparison-api";
import {
  candidatureComparisonChannels,
  candidatureComparisonRequestSchema,
} from "../src/shared/candidature-comparison-contracts";

const firstId = "00000000-0000-4000-8000-000000001901";
const secondId = "00000000-0000-4000-8000-000000001902";

const preview = {
  connection: {
    name: "Local model",
    endpoint: "http://localhost:11434/v1",
    model: "comparison-model",
  },
  entries: [
    {
      candidatureId: firstId,
      localLabel: "First candidature",
      providerLabel: "Candidature 1",
      information: [{ label: "Role", value: "Engineer" }],
    },
    {
      candidatureId: secondId,
      localLabel: "Second candidature",
      providerLabel: "Candidature 2",
      information: [],
    },
  ],
};

const result = {
  analyses: [
    { candidatureId: firstId, strengths: ["A"], concerns: [], questions: [] },
    { candidatureId: secondId, strengths: [], concerns: ["B"], questions: [] },
  ],
  considerations: ["Consideration"],
};

describe("candidature comparison preload API", () => {
  it("validates bounded requests and privileged preview/run responses", async () => {
    const invoke = vi.fn(async (channel: string) =>
      channel === candidatureComparisonChannels.preview ? preview : result,
    );
    const api = createCandidatureComparisonDesktopApi(invoke);
    const request = { candidatureIds: [firstId, secondId] };

    await expect(api.candidatureComparison.preview(request)).resolves.toEqual(preview);
    await expect(api.candidatureComparison.run(request)).resolves.toEqual(result);
    expect(invoke).toHaveBeenCalledWith(candidatureComparisonChannels.preview, request);
    expect(invoke).toHaveBeenCalledWith(candidatureComparisonChannels.run, request);

    await expect(
      api.candidatureComparison.preview({ candidatureIds: [firstId] }),
    ).rejects.toThrow();
    await expect(
      api.candidatureComparison.run({ candidatureIds: [firstId, firstId] }),
    ).rejects.toThrow();
  });

  it("rejects malformed or decision-making-shaped privileged results", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === candidatureComparisonChannels.preview) {
        return { ...preview, arbitraryPath: "/tmp/private" };
      }
      return {
        ...result,
        winner: firstId,
      };
    });
    const api = createCandidatureComparisonDesktopApi(invoke);
    const request = { candidatureIds: [firstId, secondId] };

    await expect(api.candidatureComparison.preview(request)).rejects.toThrow();
    await expect(api.candidatureComparison.run(request)).rejects.toThrow();
    expect(() =>
      candidatureComparisonRequestSchema.parse({
        candidatureIds: [firstId, secondId, crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()],
      }),
    ).toThrow();
  });
});
