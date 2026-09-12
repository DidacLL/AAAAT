import { describe, expect, it, vi } from "vitest";

import { createDocumentOutputDesktopApi } from "../src/preload/document-output-api";
import { documentOutputChannels } from "../src/shared/document-output-contracts";

const documentId = "00000000-0000-4000-8000-000000000701";

describe("document output preload API", () => {
  it("forwards only a validated document id for PDF and project opening", async () => {
    const invoke = vi.fn(async () => ({ opened: true as const }));
    const api = createDocumentOutputDesktopApi(invoke);

    await expect(api.documentOutput.open(documentId)).resolves.toEqual({ opened: true });
    expect(invoke).toHaveBeenCalledWith(documentOutputChannels.open, documentId);

    await expect(api.documentOutput.openProject(documentId)).resolves.toEqual({ opened: true });
    expect(invoke).toHaveBeenCalledWith(documentOutputChannels.openProject, documentId);
  });

  it("rejects invalid document ids and malformed privileged responses", async () => {
    const invoke = vi.fn(async () => ({ opened: false }));
    const api = createDocumentOutputDesktopApi(invoke);

    await expect(api.documentOutput.open("/tmp/arbitrary.pdf")).rejects.toThrow();
    await expect(api.documentOutput.openProject("/tmp/arbitrary-project")).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();

    await expect(api.documentOutput.open(documentId)).rejects.toThrow();
    await expect(api.documentOutput.openProject(documentId)).rejects.toThrow();
  });
});
