// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createArtifactDesktopApi } from "../src/preload/artifact-api";
import { artifactChannels } from "../src/shared/artifact-contracts";

const candidatureId = "00000000-0000-4000-8000-000000000601";
const cvDocumentId = "00000000-0000-4000-8000-000000000602";
const coverLetterDocumentId = "00000000-0000-4000-8000-000000000604";
const artifactId = "00000000-0000-4000-8000-000000000603";
const record = {
  id: artifactId,
  candidatureId,
  cvDocumentId,
  coverLetterDocumentId: null,
  kind: "cv" as const,
  title: "Submitted CV",
  capturedAt: "2026-09-06T12:00:00.000Z",
  projectPath: "/workspace/artifacts/603",
  sourcePath: "/workspace/artifacts/603/main.tex",
  artifactPath: "/workspace/artifacts/603/build/main.pdf",
};
const combinedRecord = {
  ...record,
  cvDocumentId,
  coverLetterDocumentId,
  kind: "combined" as const,
  title: "Combined: Letter + CV",
};

describe("application artifact preload API", () => {
  it("uses only named artifact channels with validated IDs and inputs", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === artifactChannels.list) return [record];
      if (channel === artifactChannels.captureCombined) return combinedRecord;
      if (channel === artifactChannels.open) return { opened: true as const };
      return record;
    });
    const api = createArtifactDesktopApi(invoke);

    await expect(api.artifacts.list(candidatureId)).resolves.toEqual([record]);
    await expect(
      api.artifacts.capture({ candidatureId, documentId: cvDocumentId }),
    ).resolves.toEqual(record);
    await expect(
      api.artifacts.captureCombined({ candidatureId, cvDocumentId, coverLetterDocumentId }),
    ).resolves.toEqual(combinedRecord);
    await expect(api.artifacts.open(artifactId)).resolves.toEqual({ opened: true });

    expect(invoke.mock.calls).toEqual([
      [artifactChannels.list, candidatureId],
      [artifactChannels.capture, { candidatureId, documentId: cvDocumentId }],
      [artifactChannels.captureCombined, { candidatureId, cvDocumentId, coverLetterDocumentId }],
      [artifactChannels.open, artifactId],
    ]);
  });

  it("rejects invalid or duplicate IDs before invoking IPC", async () => {
    const invoke = vi.fn();
    const api = createArtifactDesktopApi(invoke);

    await expect(
      api.artifacts.capture({ candidatureId: "not-an-id", documentId: cvDocumentId }),
    ).rejects.toThrow();
    await expect(
      api.artifacts.captureCombined({
        candidatureId,
        cvDocumentId,
        coverLetterDocumentId: cvDocumentId,
      }),
    ).rejects.toThrow();
    await expect(api.artifacts.open("not-an-id")).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
  });
});
