import {
  candidatureApplicationInformationResultImportResultSchema,
  candidatureExternalAiCopyResultSchema,
  candidatureExternalAiExportResultSchema,
  candidatureExternalAiInstructionSchema,
  candidaturePreparedTaskSchema,
  candidaturePreparedTaskTargetSchema,
  type CandidaturePreparedTaskTarget,
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
        candidaturePreparedTaskSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.privateApplicationInformationTask, candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId), candidatureExternalAiInstructionSchema.parse(instruction))),
      useConnectedApplicationInformationTask: async (target: CandidaturePreparedTaskTarget, taskText: string) => externalApplicationInformationTaskSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.useConnectedApplicationInformationTask, candidaturePreparedTaskTargetSchema.parse(target), candidatureExternalAiTaskTextSchema.parse(taskText))),
      takeApplicationInformationResult: async (target: CandidaturePreparedTaskTarget) =>
        externalApplicationInformationPendingResultOptionalSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.takeApplicationInformationResult,
            candidaturePreparedTaskTargetSchema.parse(target),
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
      submitApplicationInformationResult: async (target: CandidaturePreparedTaskTarget, resultText: string) =>
        externalApplicationInformationPendingResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.submitApplicationInformationResult,
            candidaturePreparedTaskTargetSchema.parse(target),
            candidatureExternalAiResultTextSchema.parse(resultText),
          ),
        ),
      importApplicationInformationResult: async (target: CandidaturePreparedTaskTarget) =>
        candidatureApplicationInformationResultImportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.importApplicationInformationResult,
            candidaturePreparedTaskTargetSchema.parse(target),
          ),
        ),
      interviewContext: async () =>
        externalInterviewPreparationContextSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.interviewContext),
        ),
      privateInterviewContext: async (candidatureId: string) => candidaturePreparedTaskSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.privateInterviewContext, candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId))),
      closePrivateTask: async (target: CandidaturePreparedTaskTarget) => { await invoke(candidatureOpportunityResearchAccessChannels.closePrivateTask, candidaturePreparedTaskTargetSchema.parse(target)); },
      disableConnectedTaskAccess: async (candidatureId: string) => candidatureOpportunityResearchAccessSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.disableConnectedTaskAccess, candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(candidatureId))),
      interviewTaskText: async () => candidatureExternalAiTaskTextSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.interviewTaskText)),
      useConnectedInterviewTask: async (target: CandidaturePreparedTaskTarget, taskText: string) => candidatureExternalAiTaskTextSchema.parse(await invoke(candidatureOpportunityResearchAccessChannels.useConnectedInterviewTask, candidaturePreparedTaskTargetSchema.parse(target), candidatureExternalAiTaskTextSchema.parse(taskText))),
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
      retainInterviewResult: async (target: CandidaturePreparedTaskTarget, resultText: string) =>
        candidatureInterviewResultRetainResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.retainInterviewResult,
            candidaturePreparedTaskTargetSchema.parse(target),
            candidatureExternalAiResultTextSchema.parse(resultText),
          ),
        ),
      importInterviewResult: async (target: CandidaturePreparedTaskTarget) =>
        candidatureInterviewResultImportResultSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.importInterviewResult, candidaturePreparedTaskTargetSchema.parse(target)),
        ),
    }),
  });
}
