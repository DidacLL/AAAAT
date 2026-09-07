// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createCvDescriptorDesktopApi } from "../src/preload/cv-descriptor-api";
import { cvDescriptorChannels } from "../src/shared/cv-descriptor-contracts";

const documentId = "00000000-0000-4000-8000-000000000301";

describe("CV descriptor preload API", () => {
  it("uses only the named channels and validates request and response data", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === cvDescriptorChannels.current) {
        return { documentId, tags: ["platform"], notes: "Staff-level CV." };
      }
      return { documentId, tags: [], notes: null };
    });
    const api = createCvDescriptorDesktopApi(invoke);

    await expect(api.cvDescriptors.current(documentId)).resolves.toEqual({
      documentId,
      tags: ["platform"],
      notes: "Staff-level CV.",
    });
    expect(invoke).toHaveBeenCalledWith(cvDescriptorChannels.current, documentId);

    await expect(
      api.cvDescriptors.update({ documentId, tags: [], notes: null }),
    ).resolves.toEqual({ documentId, tags: [], notes: null });
    expect(invoke).toHaveBeenCalledWith(cvDescriptorChannels.update, {
      documentId,
      tags: [],
      notes: null,
    });
  });

  it("rejects invalid privileged output before returning it to the renderer", async () => {
    const api = createCvDescriptorDesktopApi(async () => ({
      documentId,
      tags: ["Platform", "platform"],
      notes: null,
    }));

    await expect(api.cvDescriptors.current(documentId)).rejects.toThrow();
  });
});
