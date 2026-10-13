import {
  candidatureApplicationInformationResultImportResultSchema,
  candidatureExternalAiCopyResultSchema,
  candidatureExternalAiExportResultSchema,
  candidatureExternalAiRequestTextSchema,
  candidatureExternalAiResultInputSchema,
  candidatureInterviewResultImportResultSchema,
  candidatureInterviewResultRetainResultSchema,
  candidatureOpportunityResearchAccessChannels,
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
  externalApplicationInformationPendingResultOptionalSchema,
  externalApplicationInformationPendingResultSchema,
  externalApplicationInformationTaskSchema,
  externalInterviewPreparationContextSchema,
  type CandidatureOpportunityResearchAccessDesktopApi,
} from "../shared/candidature-opportunity-research-access-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

type ResearchApi = CandidatureOpportunityResearchAccessDesktopApi["candidatureOpportunityResearchAccess"];

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
      update: async (input: Parameters<ResearchApi["update"]>[0]) =>
        candidatureOpportunityResearchAccessSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.update,
            candidatureOpportunityResearchAccessUpdateSchema.parse(input),
          ),
        ),
      applicationInformationTask: async (
        candidatureId: string,
      ) =>
        externalApplicationInformationTaskSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.applicationInformationTask,
            candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId),
          ),
        ),
      takeApplicationInformationResult: async (candidatureId: string) =>
        externalApplicationInformationPendingResultOptionalSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.takeApplicationInformationResult,
            candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId),
          ),
        ),
      copyApplicationInformationTask: async (
        input: Parameters<ResearchApi["copyApplicationInformationTask"]>[0],
      ) =>
        candidatureExternalAiCopyResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.copyApplicationInformationTask,
            candidatureExternalAiRequestTextSchema.parse(input),
          ),
        ),
      exportApplicationInformationTask: async (
        input: Parameters<ResearchApi["copyApplicationInformationTask"]>[0],
      ) =>
        candidatureExternalAiExportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.exportApplicationInformationTask,
            candidatureExternalAiRequestTextSchema.parse(input),
          ),
        ),
      submitApplicationInformationResult: async (input: Parameters<ResearchApi["submitApplicationInformationResult"]>[0]) =>
        externalApplicationInformationPendingResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.submitApplicationInformationResult,
            candidatureExternalAiResultInputSchema.parse(input),
          ),
        ),
      importApplicationInformationResult: async (candidatureId: string) =>
        candidatureApplicationInformationResultImportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.importApplicationInformationResult,
            candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId),
          ),
        ),
      interviewContext: async (candidatureId: string) =>
        externalInterviewPreparationContextSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.interviewContext, candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId)),
        ),
      copyInterviewTask: async (
        input: Parameters<ResearchApi["copyApplicationInformationTask"]>[0],
      ) =>
        candidatureExternalAiCopyResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.copyInterviewTask,
            candidatureExternalAiRequestTextSchema.parse(input),
          ),
        ),
      exportInterviewTask: async (
        input: Parameters<ResearchApi["copyApplicationInformationTask"]>[0],
      ) =>
        candidatureExternalAiExportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.exportInterviewTask,
            candidatureExternalAiRequestTextSchema.parse(input),
          ),
        ),
      retainInterviewResult: async (input: Parameters<ResearchApi["retainInterviewResult"]>[0]) =>
        candidatureInterviewResultRetainResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.retainInterviewResult,
            candidatureExternalAiResultInputSchema.parse(input),
          ),
        ),
      importInterviewResult: async (candidatureId: string) =>
        candidatureInterviewResultImportResultSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.importInterviewResult, candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId)),
        ),
    }),
  });
}
