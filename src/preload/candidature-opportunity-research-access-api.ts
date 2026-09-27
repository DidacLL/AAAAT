import {
  candidatureAiTaskTemplateDeleteSchema,
  candidatureAiTaskTemplateSaveSchema,
  candidatureAiTaskTemplateSchema,
  candidatureAiTaskTemplatesSchema,
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
      taskContext: async () =>
        candidatureOpportunityResearchTaskContextSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.taskContext),
        ),
      taskTemplates: async () =>
        candidatureAiTaskTemplatesSchema.parse(
          await invoke(candidatureOpportunityResearchAccessChannels.taskTemplates),
        ),
      saveTaskTemplate: async (input: Parameters<ResearchApi["saveTaskTemplate"]>[0]) =>
        candidatureAiTaskTemplateSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.taskTemplateSave,
            candidatureAiTaskTemplateSaveSchema.parse(input),
          ),
        ),
      deleteTaskTemplate: async (id: string) => {
        const result = await invoke(
          candidatureOpportunityResearchAccessChannels.taskTemplateDelete,
          candidatureAiTaskTemplateDeleteSchema.parse(id),
        );
        if (result !== "deleted") throw new Error("Invalid task template delete response.");
        return "deleted" as const;
      },
      copyTask: async (instruction: Parameters<ResearchApi["copyTask"]>[0]) =>
        candidatureOpportunityResearchTaskCopyResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.copyTask,
            candidatureOpportunityResearchTaskInstructionSchema.parse(instruction),
          ),
        ),
      exportTask: async (instruction: Parameters<ResearchApi["exportTask"]>[0]) =>
        candidatureOpportunityResearchTaskExportResultSchema.parse(
          await invoke(
            candidatureOpportunityResearchAccessChannels.exportTask,
            candidatureOpportunityResearchTaskInstructionSchema.parse(instruction),
          ),
        ),
      retainResult: async (sourceText: Parameters<ResearchApi["retainResult"]>[0]) =>
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
