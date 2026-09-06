import { describe, expect, it, vi } from "vitest";

import { createCandidatureSearchDesktopApi } from "../src/preload/candidature-search-api";
import { candidatureSearchChannels } from "../src/shared/candidature-search-contracts";

const candidatureId = "00000000-0000-4000-8000-000000000901";

describe("candidature search preload API", () => {
  it("validates and forwards bounded local search", async () => {
    const invoke = vi.fn(async () => [candidatureId]);
    const api = createCandidatureSearchDesktopApi(invoke);

    await expect(api.candidatureSearch.search({ query: "platform" })).resolves.toEqual([
      candidatureId,
    ]);
    expect(invoke).toHaveBeenCalledWith(candidatureSearchChannels.search, { query: "platform" });
  });

  it("rejects invalid input and malformed privileged output", async () => {
    const invoke = vi.fn(async () => ["not-a-uuid"]);
    const api = createCandidatureSearchDesktopApi(invoke);

    await expect(api.candidatureSearch.search({ query: "" })).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
    await expect(api.candidatureSearch.search({ query: "platform" })).rejects.toThrow();
  });
});
