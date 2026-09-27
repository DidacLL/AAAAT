import {
  candidatureOpportunityResearchAccessChannels,
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
  candidatureOpportunityResearchResultImportResultSchema,
  candidatureOpportunityResearchResultRetainResultSchema,
  candidatureOpportunityResearchResultTextSchema,
  candidatureOpportunityResearchTaskContextSchema,
  candidatureOpportunityResearchTaskCopyResultSchema,
  candidatureOpportunityResearchTaskExportResultSchema,
  candidatureOpportunityResearchTaskInstructionSchema,
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
      taskContext: async () =>
        candidatureOpportunityResearchTaskContextSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.taskContext),
        ),
      copyTask: async (instruction) =>
        candidatureOpportunityResearchTaskCopyResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.copyTask,
            candidatureOpportunityResearchTaskInstructionSchema.parse(instruction),
          ),
        ),
      exportTask: async (instruction) =>
        candidatureOpportunityResearchTaskExportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.exportTask,
            candidatureOpportunityResearchTaskInstructionSchema.parse(instruction),
          ),
        ),
      retainResult: async (sourceText) =>
        candidatureOpportunityResearchResultRetainResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.retainResult,
            candidatureOpportunityResearchResultTextSchema.parse(sourceText),
          ),
        ),
      importResult: async () =>
        candidatureOpportunityResearchResultImportResultSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.importResult),
        ),
    }),
  });
}
