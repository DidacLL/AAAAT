import {
  candidatureSearchChannels,
  candidatureSearchInputSchema,
  candidatureSearchResultSchema,
  type CandidatureSearchDesktopApi,
} from "../shared/candidature-search-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCandidatureSearchDesktopApi(invoke: Invoke): CandidatureSearchDesktopApi {
  return Object.freeze({
    candidatureSearch: Object.freeze({
      search: async (
        input: Parameters<CandidatureSearchDesktopApi["candidatureSearch"]["search"]>[0],
      ) =>
        candidatureSearchResultSchema.parse(
          await invoke(
            candidatureSearchChannels.search,
            candidatureSearchInputSchema.parse(input),
          ),
        ),
    }),
  });
}
