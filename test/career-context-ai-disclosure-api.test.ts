import { describe, expect, it, vi } from "vitest";

import { createCareerContextAiDisclosureDesktopApi } from "../src/preload/career-context-ai-disclosure-api";
import { careerContextAiDisclosureChannels } from "../src/shared/career-context-ai-disclosure-contracts";

const allShared = {
  careerDirection: true,
  objectives: true,
  constraints: true,
  targetRoles: true,
  targetMarketsLocations: true,
  workPreferences: true,
  applicationWritingPreferences: true,
};

describe("Career preferences AI disclosure preload API", () => {
  it("accepts only the fixed disclosure snapshot", async () => {
    const invoke = vi.fn(async (_channel: string, input?: unknown) => input ?? allShared);
    const api = createCareerContextAiDisclosureDesktopApi(invoke);

    expect(await api.careerContextAiDisclosure.current()).toEqual(allShared);
    expect(invoke).toHaveBeenLastCalledWith(careerContextAiDisclosureChannels.current);

    const restricted = { ...allShared, constraints: false };
    expect(await api.careerContextAiDisclosure.update(restricted)).toEqual(restricted);
    expect(invoke).toHaveBeenLastCalledWith(
      careerContextAiDisclosureChannels.update,
      restricted,
    );

    await expect(
      api.careerContextAiDisclosure.update({
        ...allShared,
        constraints: "no" as unknown as boolean,
      }),
    ).rejects.toThrow();
    await expect(
      api.careerContextAiDisclosure.update({
        careerDirection: true,
      } as typeof allShared),
    ).rejects.toThrow();
  });

  it("rejects malformed privileged output", async () => {
    const invoke = vi.fn(async () => ({ ...allShared, extra: true }));
    const api = createCareerContextAiDisclosureDesktopApi(invoke);
    await expect(api.careerContextAiDisclosure.current()).rejects.toThrow();
  });
});
