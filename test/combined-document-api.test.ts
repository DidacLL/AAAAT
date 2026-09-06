import { describe, expect, it, vi } from "vitest";

import { createCombinedDocumentDesktopApi } from "../src/preload/combined-document-api";
import { combinedDocumentChannels } from "../src/shared/combined-document-contracts";

const cvDocumentId = "00000000-0000-4000-8000-000000000701";
const coverLetterDocumentId = "00000000-0000-4000-8000-000000000702";

describe("combined document preload API", () => {
  it("validates and forwards one named combined-output operation", async () => {
    const invoke = vi.fn(async () => ({ exportedPath: "/tmp/application-packet" }));
    const api = createCombinedDocumentDesktopApi(invoke);

    await expect(
      api.combinedDocuments.exportPacket({ cvDocumentId, coverLetterDocumentId }),
    ).resolves.toEqual({ exportedPath: "/tmp/application-packet" });
    expect(invoke).toHaveBeenCalledWith(combinedDocumentChannels.exportPacket, {
      cvDocumentId,
      coverLetterDocumentId,
    });
  });

  it("rejects invalid input and malformed privileged responses", async () => {
    const invoke = vi.fn(async () => ({ exportedPath: "" }));
    const api = createCombinedDocumentDesktopApi(invoke);

    await expect(
      api.combinedDocuments.exportPacket({
        cvDocumentId,
        coverLetterDocumentId: cvDocumentId,
      }),
    ).rejects.toThrow();
    await expect(
      api.combinedDocuments.exportPacket({ cvDocumentId, coverLetterDocumentId }),
    ).rejects.toThrow();
  });
});
