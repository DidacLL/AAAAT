import {
  applicationArtifactCaptureSchema,
  applicationArtifactListSchema,
  applicationArtifactRecordSchema,
  artifactChannels,
  type ArtifactDesktopApi,
} from "../shared/artifact-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createArtifactDesktopApi(invoke: Invoke): ArtifactDesktopApi {
  const artifacts = Object.freeze({
    list: async (candidatureId: string) =>
      applicationArtifactListSchema.parse(
        await invoke(
          artifactChannels.list,
          applicationArtifactCaptureSchema.shape.candidatureId.parse(candidatureId),
        ),
      ),
    capture: async (input: Parameters<ArtifactDesktopApi["artifacts"]["capture"]>[0]) =>
      applicationArtifactRecordSchema.parse(
        await invoke(artifactChannels.capture, applicationArtifactCaptureSchema.parse(input)),
      ),
  });

  return Object.freeze({ artifacts });
}
