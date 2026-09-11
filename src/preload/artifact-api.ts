import {
  applicationArtifactCandidatureIdSchema,
  applicationArtifactCaptureSchema,
  applicationArtifactIdSchema,
  applicationArtifactListSchema,
  applicationArtifactOpenResultSchema,
  applicationArtifactRecordSchema,
  artifactChannels,
  combinedApplicationArtifactCaptureSchema,
  type ArtifactDesktopApi,
} from "../shared/artifact-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createArtifactDesktopApi(invoke: Invoke): ArtifactDesktopApi {
  const artifacts = Object.freeze({
    list: async (candidatureId: string) =>
      applicationArtifactListSchema.parse(
        await invoke(
          artifactChannels.list,
          applicationArtifactCandidatureIdSchema.parse(candidatureId),
        ),
      ),
    capture: async (input: Parameters<ArtifactDesktopApi["artifacts"]["capture"]>[0]) =>
      applicationArtifactRecordSchema.parse(
        await invoke(artifactChannels.capture, applicationArtifactCaptureSchema.parse(input)),
      ),
    captureCombined: async (
      input: Parameters<ArtifactDesktopApi["artifacts"]["captureCombined"]>[0],
    ) =>
      applicationArtifactRecordSchema.parse(
        await invoke(
          artifactChannels.captureCombined,
          combinedApplicationArtifactCaptureSchema.parse(input),
        ),
      ),
    open: async (artifactId: string) =>
      applicationArtifactOpenResultSchema.parse(
        await invoke(artifactChannels.open, applicationArtifactIdSchema.parse(artifactId)),
      ),
  });

  return Object.freeze({ artifacts });
}
