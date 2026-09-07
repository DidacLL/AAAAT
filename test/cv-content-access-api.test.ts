// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createCvContentAccessDesktopApi } from "../src/preload/cv-content-access-api";
import { cvContentAccessChannels } from "../src/shared/cv-content-access-contracts";

const documentId = "00000000-0000-4000-8000-000000000401";

describe("CV content access preload API", () => {
  it("uses only fixed named channels and validates request and response data", async () => {
    const invoke = vi.fn(async (channel: string) => ({
      documentId,
      allowed: channel === cvContentAccessChannels.current,
      renderAllowed: channel === cvContentAccessChannels.updateRender,
    }));
    const api = createCvContentAccessDesktopApi(invoke);

    await expect(api.cvContentAccess.current(documentId)).resolves.toEqual({
      documentId,
      allowed: true,
      renderAllowed: false,
    });
    expect(invoke).toHaveBeenCalledWith(cvContentAccessChannels.current, documentId);

    await expect(api.cvContentAccess.update({ documentId, allowed: false })).resolves.toEqual({
      documentId,
      allowed: false,
      renderAllowed: false,
    });
    expect(invoke).toHaveBeenCalledWith(cvContentAccessChannels.update, {
      documentId,
      allowed: false,
    });

    await expect(api.cvContentAccess.updateRender({ documentId, allowed: true })).resolves.toEqual({
      documentId,
      allowed: false,
      renderAllowed: true,
    });
    expect(invoke).toHaveBeenCalledWith(cvContentAccessChannels.updateRender, {
      documentId,
      allowed: true,
    });
  });

  it("rejects invalid privileged output before returning it to the renderer", async () => {
    const api = createCvContentAccessDesktopApi(async () => ({
      documentId,
      allowed: true,
      renderAllowed: "yes",
    }));
    await expect(api.cvContentAccess.current(documentId)).rejects.toThrow();
  });
});
