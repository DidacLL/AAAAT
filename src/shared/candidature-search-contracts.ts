import { z } from "zod";

export const candidatureSearchChannels = Object.freeze({
  search: "aaaat:candidature-search",
} as const);

export const candidatureSearchInputSchema = z
  .object({ query: z.string().trim().min(1).max(200) })
  .strict();
export type CandidatureSearchInput = z.infer<typeof candidatureSearchInputSchema>;

export const candidatureSearchResultSchema = z.array(z.string().uuid());
export type CandidatureSearchResult = z.infer<typeof candidatureSearchResultSchema>;

export interface CandidatureSearchDesktopApi {
  readonly candidatureSearch: {
    readonly search: (input: CandidatureSearchInput) => Promise<CandidatureSearchResult>;
  };
}
