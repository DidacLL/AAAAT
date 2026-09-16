import { describe, expect, it, vi } from "vitest";

import { createProfileAiContextDesktopApi } from "../src/preload/profile-ai-context-api";
import { profileAiContextChannels } from "../src/shared/profile-ai-context-contracts";

const itemId = "00000000-0000-4000-8000-000000000701";

describe("professional-information AI-use preload API", () => {
  it("validates bounded read and update operations", async () => {
    const invoke = vi.fn(async (channel: string) => ({
      itemId,
      aiUseAllowed: channel === profileAiContextChannels.current,
    }));
    const api = createProfileAiContextDesktopApi(invoke);

    await expect(api.profileAiContext.current(itemId)).resolves.toEqual({
      itemId,
      aiUseAllowed: true,
    });
    await expect(
      api.profileAiContext.update({ itemId, aiUseAllowed: false }),
    ).resolves.toEqual({ itemId, aiUseAllowed: false });

    expect(invoke).toHaveBeenNthCalledWith(1, profileAiContextChannels.current, itemId);
    expect(invoke).toHaveBeenNthCalledWith(2, profileAiContextChannels.update, {
      itemId,
      aiUseAllowed: false,
    });
  });

  it("rejects invalid renderer input and malformed privileged output", async () => {
    const invoke = vi.fn(async () => ({ itemId, aiUseAllowed: "private" }));
    const api = createProfileAiContextDesktopApi(invoke);

    await expect(api.profileAiContext.current("not-a-uuid")).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
    await expect(api.profileAiContext.current(itemId)).rejects.toThrow();
  });
});
