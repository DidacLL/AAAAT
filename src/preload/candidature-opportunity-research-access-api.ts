import {
  candidatureOpportunityResearchAccessChannels,
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
  candidatureOpportunityResearchResultImportResultSchema,
  candidatureOpportunityResearchTaskExportResultSchema,
  type CandidatureOpportunityResearchAccessDesktopApi,
} from "../shared/candidature-opportunity-research-access-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCandidatureOpportunityResearchAccessDesktopApi(
  invoke: Invoke,
): CandidatureOpportunityResearchAccessDesktopApi {
  return Object.freeze({
    candidatureOpportunityResearchAccess: Object.freeze({
      current: async (candidatureId: string) =>
        candidatureOpportunityResearchAccessSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.current,
            candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId),
          ),
        ),
      update: async (
        input: Parameters<
          CandidatureOpportunityResearchAccessDesktopApi["candidatureOpportunityResearchAccess"]["update"]
        >[0],
      ) =>
        candidatureOpportunityResearchAccessSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.update,
            candidatureOpportunityResearchAccessUpdateSchema.parse(input),
          ),
        ),
      exportTask: async () =>
        candidatureOpportunityResearchTaskExportResultSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.exportTask),
        ),
      importResult: async () =>
        candidatureOpportunityResearchResultImportResultSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.importResult),
        ),
    }),
  });
}
