// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createArtifactDesktopApi } from "../src/preload/artifact-api";
import { artifactChannels } from "../src/shared/artifact-contracts";

const candidatureId = "00000000-0000-4000-8000-000000000601";
const documentId = "00000000-0000-4000-8000-000000000602";
const artifactId = "00000000-0000-4000-8000-000000000603";
const record = {
  id: artifactId,
  candidatureId,
  documentId,
  kind: "cv" as const,
  title: "Submitted CV",
  capturedAt: "2026-09-06T12:00:00.000Z",
  projectPath: "/workspace/artifacts/603",
  sourcePath: "/workspace/artifacts/603/main.tex",
  artifactPath: "/workspace/artifacts/603/build/main.pdf",
};

describe("application artifact preload API", () => {
  it("uses only named artifact channels with validated IDs and inputs", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === artifactChannels.list) return [record];
      if (channel === artifactChannels.open) return { opened: true as const };
      return record;
    });
    const api = createArtifactDesktopApi(invoke);

    await expect(api.artifacts.list(candidatureId)).resolves.toEqual([record]);
    await expect(api.artifacts.capture({ candidatureId, documentId })).resolves.toEqual(record);
    await expect(api.artifacts.open(artifactId)).resolves.toEqual({ opened: true });

    expect(invoke.mock.calls).toEqual([
      [artifactChannels.list, candidatureId],
      [artifactChannels.capture, { candidatureId, documentId }],
      [artifactChannels.open, artifactId],
    ]);
  });

  it("rejects invalid IDs before invoking IPC", async () => {
    const invoke = vi.fn();
    const api = createArtifactDesktopApi(invoke);

    await expect(api.artifacts.capture({ candidatureId: "not-an-id", documentId })).rejects.toThrow();
    await expect(api.artifacts.open("not-an-id")).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
  });
});
