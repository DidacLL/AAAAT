import { describe, expect, it, vi } from "vitest";

import { createCandidatureActivityDesktopApi } from "../src/preload/candidature-activity-api";
import { candidatureActivityChannels } from "../src/shared/candidature-activity-contracts";

const candidatureId = "00000000-0000-4000-8000-000000000901";

describe("candidature Activity preload API", () => {
  it("validates and forwards only the candidature identity", async () => {
    const invoke = vi.fn(async () => [
      { occurredAt: "2026-09-11T12:00:00.000Z", kind: "source_added" },
    ]);
    const api = createCandidatureActivityDesktopApi(invoke);

    await expect(api.candidatureActivity.list(candidatureId)).resolves.toEqual([
      { occurredAt: "2026-09-11T12:00:00.000Z", kind: "source_added" },
    ]);
    expect(invoke).toHaveBeenCalledWith(candidatureActivityChannels.list, candidatureId);
  });

  it("rejects invalid input and malformed privileged output", async () => {
    const invoke = vi.fn(async () => [
      { occurredAt: "2026-09-11T12:00:00.000Z", kind: "candidature.source-added" },
    ]);
    const api = createCandidatureActivityDesktopApi(invoke);

    await expect(api.candidatureActivity.list("not-a-uuid")).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
    await expect(api.candidatureActivity.list(candidatureId)).rejects.toThrow();
  });
});
