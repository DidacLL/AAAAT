import {
  candidatureApplicationInformationResultImportResultSchema,
  candidatureExternalAiCopyResultSchema,
  candidatureExternalAiExportResultSchema,
  candidatureExternalAiInstructionSchema,
  candidatureExternalAiResultTextSchema,
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
        instruction: Parameters<ResearchApi["applicationInformationTask"]>[0],
      ) =>
        externalApplicationInformationTaskSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.applicationInformationTask,
            candidatureExternalAiInstructionSchema.parse(instruction),
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
        instruction: Parameters<ResearchApi["copyApplicationInformationTask"]>[0],
      ) =>
        candidatureExternalAiCopyResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.copyApplicationInformationTask,
            candidatureExternalAiInstructionSchema.parse(instruction),
          ),
        ),
      exportApplicationInformationTask: async (
        instruction: Parameters<ResearchApi["exportApplicationInformationTask"]>[0],
      ) =>
        candidatureExternalAiExportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.exportApplicationInformationTask,
            candidatureExternalAiInstructionSchema.parse(instruction),
          ),
        ),
      submitApplicationInformationResult: async (resultText: string) =>
        externalApplicationInformationPendingResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.submitApplicationInformationResult,
            candidatureExternalAiResultTextSchema.parse(resultText),
          ),
        ),
      importApplicationInformationResult: async () =>
        candidatureApplicationInformationResultImportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.importApplicationInformationResult,
          ),
        ),
      interviewContext: async () =>
        externalInterviewPreparationContextSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.interviewContext),
        ),
      copyInterviewTask: async (
        instruction: Parameters<ResearchApi["copyInterviewTask"]>[0],
      ) =>
        candidatureExternalAiCopyResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.copyInterviewTask,
            candidatureExternalAiInstructionSchema.parse(instruction),
          ),
        ),
      exportInterviewTask: async (
        instruction: Parameters<ResearchApi["exportInterviewTask"]>[0],
      ) =>
        candidatureExternalAiExportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.exportInterviewTask,
            candidatureExternalAiInstructionSchema.parse(instruction),
          ),
        ),
      retainInterviewResult: async (resultText: string) =>
        candidatureInterviewResultRetainResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.retainInterviewResult,
            candidatureExternalAiResultTextSchema.parse(resultText),
          ),
        ),
      importInterviewResult: async () =>
        candidatureInterviewResultImportResultSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.importInterviewResult),
        ),
    }),
  });
}
