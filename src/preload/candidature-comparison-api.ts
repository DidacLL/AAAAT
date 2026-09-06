import {
  candidatureComparisonChannels,
  candidatureComparisonPreviewSchema,
  candidatureComparisonRequestSchema,
  candidatureComparisonResultSchema,
  type CandidatureComparisonDesktopApi,
  type CandidatureComparisonRequest,
} from "../shared/candidature-comparison-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCandidatureComparisonDesktopApi(
  invoke: Invoke,
): CandidatureComparisonDesktopApi {
  return Object.freeze({
    candidatureComparison: Object.freeze({
      preview: async (request: CandidatureComparisonRequest) =>
        candidatureComparisonPreviewSchema.parse(
          await invoke(
            candidatureComparisonChannels.preview,
            candidatureComparisonRequestSchema.parse(request),
          ),
        ),
      run: async (request: CandidatureComparisonRequest) =>
        candidatureComparisonResultSchema.parse(
          await invoke(
            candidatureComparisonChannels.run,
            candidatureComparisonRequestSchema.parse(request),
          ),
        ),
    }),
  });
}
