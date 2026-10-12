import {
  candidatureApplicationInformationResultImportResultSchema,
  candidatureExternalAiCopyResultSchema,
  candidatureExternalAiExportResultSchema,
  candidatureExternalAiInstructionSchema,
  candidatureExternalAiTaskTextSchema,
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
      privateApplicationInformationTask: async (candidatureId: string, instruction: Parameters<ResearchApi["privateApplicationInformationTask"]>[1]) =>
        externalApplicationInformationTaskSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.privateApplicationInformationTask, candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId), candidatureExternalAiInstructionSchema.parse(instruction))),
      useConnectedApplicationInformationTask: async (taskText: string) => externalApplicationInformationTaskSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.useConnectedApplicationInformationTask, candidatureExternalAiTaskTextSchema.parse(taskText))),
      takeApplicationInformationResult: async (candidatureId: string) =>
        externalApplicationInformationPendingResultOptionalSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.takeApplicationInformationResult,
            candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId),
          ),
        ),
      copyApplicationInformationTask: async (
        taskText: Parameters<ResearchApi["copyApplicationInformationTask"]>[0],
      ) =>
        candidatureExternalAiCopyResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.copyApplicationInformationTask,
            candidatureExternalAiTaskTextSchema.parse(taskText),
          ),
        ),
      exportApplicationInformationTask: async (
        taskText: Parameters<ResearchApi["exportApplicationInformationTask"]>[0],
      ) =>
        candidatureExternalAiExportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.exportApplicationInformationTask,
            candidatureExternalAiTaskTextSchema.parse(taskText),
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
      privateInterviewContext: async (candidatureId: string) => externalInterviewPreparationContextSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.privateInterviewContext, candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId))),
      disableConnectedTaskAccess: async (candidatureId: string) => candidatureOpportunityResearchAccessSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.disableConnectedTaskAccess, candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId))),
      interviewTaskText: async () => candidatureExternalAiTaskTextSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.interviewTaskText)),
      useConnectedInterviewTask: async (taskText: string) => candidatureExternalAiTaskTextSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.useConnectedInterviewTask, candidatureExternalAiTaskTextSchema.parse(taskText))),
      copyInterviewTask: async (
        taskText: Parameters<ResearchApi["copyInterviewTask"]>[0],
      ) =>
        candidatureExternalAiCopyResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.copyInterviewTask,
            candidatureExternalAiTaskTextSchema.parse(taskText),
          ),
        ),
      exportInterviewTask: async (
        taskText: Parameters<ResearchApi["exportInterviewTask"]>[0],
      ) =>
        candidatureExternalAiExportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.exportInterviewTask,
            candidatureExternalAiTaskTextSchema.parse(taskText),
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
