import { describe, expect, it, vi } from "vitest";

import { createProfileAiContextDesktopApi } from "../src/preload/profile-ai-context-api";
import { profileAiContextChannels } from "../src/shared/profile-ai-context-contracts";

const itemId = "00000000-0000-4000-8000-000000000701";

describe("professional-information AI disclosure preload API", () => {
  it("validates bounded read and update operations", async () => {
    const invoke = vi.fn(async (channel: string) => ({
      itemId,
      aiContextMode: channel === profileAiContextChannels.current ? "expose" : "token",
    }));
    const api = createProfileAiContextDesktopApi(invoke);

    await expect(api.profileAiContext.current(itemId)).resolves.toEqual({
      itemId,
      aiContextMode: "expose",
    });
    await expect(
      api.profileAiContext.update({ itemId, aiContextMode: "token" }),
    ).resolves.toEqual({ itemId, aiContextMode: "token" });

    expect(invoke).toHaveBeenNthCalledWith(1, profileAiContextChannels.current, itemId);
    expect(invoke).toHaveBeenNthCalledWith(2, profileAiContextChannels.update, {
      itemId,
      aiContextMode: "token",
    });
  });

  it("rejects invalid renderer input and malformed privileged output", async () => {
    const invoke = vi.fn(async () => ({ itemId, aiContextMode: "private" }));
    const api = createProfileAiContextDesktopApi(invoke);

    await expect(api.profileAiContext.current("not-a-uuid")).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
    await expect(api.profileAiContext.current(itemId)).rejects.toThrow();
  });
});
