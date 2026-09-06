// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createFocusDesktopApi } from "../src/preload/focus-api";
import { focusChannels } from "../src/shared/focus-contracts";

const preferences = {
  sources: true,
  concepts: false,
  todos: true,
  documents: false,
};

describe("Focus preload API", () => {
  it("uses only the two named Focus preference channels", async () => {
    const invoke = vi.fn(async () => preferences);
    const api = createFocusDesktopApi(invoke);

    await expect(api.focus.current()).resolves.toEqual(preferences);
    await expect(api.focus.update(preferences)).resolves.toEqual(preferences);

    expect(invoke.mock.calls).toEqual([
      [focusChannels.current],
      [focusChannels.update, preferences],
    ]);
  });

  it("rejects invalid preference input before IPC", async () => {
    const invoke = vi.fn();
    const api = createFocusDesktopApi(invoke);

    await expect(
      api.focus.update({ ...preferences, sources: "yes" } as never),
    ).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
  });
});
