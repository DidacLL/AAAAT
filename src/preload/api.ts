import {
  aiChannels,
  coverLetterDraftRequestSchema,
  coverLetterDraftSchema,
  cvTailoringRequestSchema,
  cvTailoringResultSchema,
  historicalFieldDiscoveryRequestSchema,
  historicalFieldDiscoveryResultSchema,
  jobExtractionRequestSchema,
  jobExtractionResultSchema,
  opportunityReviewPreviewSchema,
  opportunityReviewRequestSchema,
  opportunityReviewResultSchema,
  optionalAiConnectionStatusSchema,
  type AiDesktopApi,
} from "../shared/ai-contracts";
import {
  aiTaskCancellationChannels,
  aiTaskCancellationResultSchema,
  aiTaskIdSchema,
  cancellableJobExtractionRequestSchema,
  cancellableJobExtractionResultSchema,
  type AiTaskCancellationDesktopApi,
} from "../shared/ai-task-cancellation-contracts";
import {
  candidatureFieldCreateSchema,
  candidatureFieldDefinitionSchema,
  candidatureFieldFilterSchema,
  candidatureFieldListSchema,
  candidatureFieldPreferencesUpdateSchema,
  candidatureFieldUpdateSchema,
  candidatureFieldValueClearSchema,
  candidatureFieldValueSetSchema,
  candidatureFilterResultSchema,
  candidatureInputSchema,
  candidatureListSchema,
  candidatureRecordSchema,
  candidatureSourceInputSchema,
  candidatureSourceListSchema,
  candidatureSourceRemoveSchema,
  candidatureSourceUpdateSchema,
  candidatureTagSelectionSchema,
  candidatureUpdateSchema,
  careerContextSchema,
  careerContextUpdateSchema,
  channels,
  optionalWorkspaceInfoSchema,
  profileItemInputSchema,
  profileItemSchema,
  profileItemUpdateSchema,
  profileSnapshotSchema,
  recentWorkspacePathSchema,
  systemInfoSchema,
  tagInputSchema,
  tagListSchema,
  tagRecordSchema,
  tagUpdateSchema,
  workspaceChoiceSchema,
  workspaceInfoSchema,
  workspaceStatusSchema,
  type DesktopApi,
} from "../shared/contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createDesktopApi(
  invoke: Invoke,
): DesktopApi & AiDesktopApi & AiTaskCancellationDesktopApi {
  const system = Object.freeze({
    info: async () => systemInfoSchema.parse(await invoke(channels.systemInfo)),
  });

  const workspace = Object.freeze({
    current: async () => optionalWorkspaceInfoSchema.parse(await invoke(channels.workspaceCurrent)),
    recent: async () => recentWorkspacePathSchema.parse(await invoke(channels.workspaceRecent)),
    continueRecent: async () => optionalWorkspaceInfoSchema.parse(await invoke(channels.workspaceContinue)),
    close: async () => { await invoke(channels.workspaceClose); },
    delete: async () => { await invoke(channels.workspaceDelete); },
    choose: async (choice: "create" | "open") =>
      optionalWorkspaceInfoSchema.parse(
        await invoke(channels.workspaceChoose, workspaceChoiceSchema.parse(choice)),
      ),
    createDemo: async () => optionalWorkspaceInfoSchema.parse(await invoke(channels.workspaceCreateDemo)),
    reset: async () => workspaceInfoSchema.parse(await invoke(channels.workspaceReset)),
    status: async () => workspaceStatusSchema.parse(await invoke(channels.workspaceStatus)),
  });

  const profile = Object.freeze({
    current: async () => profileSnapshotSchema.parse(await invoke(channels.profileCurrent)),
    addItem: async (item: Parameters<DesktopApi["profile"]["addItem"]>[0]) =>
      profileSnapshotSchema.parse(
        await invoke(channels.profileAddItem, profileItemInputSchema.parse(item)),
      ),
    updateItem: async (update: Parameters<DesktopApi["profile"]["updateItem"]>[0]) =>
      profileSnapshotSchema.parse(
        await invoke(channels.profileUpdateItem, profileItemUpdateSchema.parse(update)),
      ),
    removeItem: async (itemId: string) =>
      profileSnapshotSchema.parse(
        await invoke(channels.profileRemoveItem, profileItemSchema.shape.id.parse(itemId)),
      ),
  });

  const careerContext = Object.freeze({
    current: async () => careerContextSchema.parse(await invoke(channels.careerContextCurrent)),
    update: async (update: Parameters<DesktopApi["careerContext"]["update"]>[0]) =>
      careerContextSchema.parse(
        await invoke(channels.careerContextUpdate, careerContextUpdateSchema.parse(update)),
      ),
  });

  const candidatures = Object.freeze({
    list: async () => candidatureListSchema.parse(await invoke(channels.candidatureList)),
    create: async (input: Parameters<DesktopApi["candidatures"]["create"]>[0]) =>
      candidatureRecordSchema.parse(
        await invoke(channels.candidatureCreate, candidatureInputSchema.parse(input)),
      ),
    update: async (update: Parameters<DesktopApi["candidatures"]["update"]>[0]) =>
      candidatureRecordSchema.parse(
        await invoke(channels.candidatureUpdate, candidatureUpdateSchema.parse(update)),
      ),
    filter: async (filter: Parameters<DesktopApi["candidatures"]["filter"]>[0]) =>
      candidatureFilterResultSchema.parse(
        await invoke(channels.candidatureFilter, candidatureFieldFilterSchema.parse(filter)),
      ),
    listFields: async () => candidatureFieldListSchema.parse(await invoke(channels.candidatureFieldList)),
    createField: async (input: Parameters<DesktopApi["candidatures"]["createField"]>[0]) =>
      candidatureFieldListSchema.element.parse(
        await invoke(channels.candidatureFieldCreate, candidatureFieldCreateSchema.parse(input)),
      ),
    updateField: async (input: Parameters<DesktopApi["candidatures"]["updateField"]>[0]) =>
      candidatureFieldListSchema.element.parse(
        await invoke(channels.candidatureFieldUpdate, candidatureFieldUpdateSchema.parse(input)),
      ),
    deleteField: async (fieldId: string) =>
      candidatureFieldListSchema.parse(
        await invoke(channels.candidatureFieldDelete, candidatureFieldDefinitionSchema.shape.id.parse(fieldId)),
      ),
    updateFieldPreferences: async (
      input: Parameters<DesktopApi["candidatures"]["updateFieldPreferences"]>[0],
    ) =>
      candidatureFieldListSchema.element.parse(
        await invoke(
          channels.candidatureFieldPreferencesUpdate,
          candidatureFieldPreferencesUpdateSchema.parse(input),
        ),
      ),
    setFieldValue: async (input: Parameters<DesktopApi["candidatures"]["setFieldValue"]>[0]) =>
      candidatureRecordSchema.parse(
        await invoke(channels.candidatureFieldValueSet, candidatureFieldValueSetSchema.parse(input)),
      ),
    clearFieldValue: async (input: Parameters<DesktopApi["candidatures"]["clearFieldValue"]>[0]) =>
      candidatureRecordSchema.parse(
        await invoke(channels.candidatureFieldValueClear, candidatureFieldValueClearSchema.parse(input)),
      ),
    listSources: async (candidatureId: string) =>
      candidatureSourceListSchema.parse(
        await invoke(channels.candidatureSourceList, candidatureRecordSchema.shape.id.parse(candidatureId)),
      ),
    addSource: async (input: Parameters<DesktopApi["candidatures"]["addSource"]>[0]) =>
      candidatureSourceListSchema.parse(
        await invoke(channels.candidatureSourceAdd, candidatureSourceInputSchema.parse(input)),
      ),
    updateSource: async (update: Parameters<DesktopApi["candidatures"]["updateSource"]>[0]) =>
      candidatureSourceListSchema.parse(
        await invoke(channels.candidatureSourceUpdate, candidatureSourceUpdateSchema.parse(update)),
      ),
    removeSource: async (remove: Parameters<DesktopApi["candidatures"]["removeSource"]>[0]) =>
      candidatureSourceListSchema.parse(
        await invoke(channels.candidatureSourceRemove, candidatureSourceRemoveSchema.parse(remove)),
      ),
    listTags: async () => tagListSchema.parse(await invoke(channels.candidatureListTags)),
    createTag: async (input: Parameters<DesktopApi["candidatures"]["createTag"]>[0]) =>
      tagRecordSchema.parse(await invoke(channels.candidatureCreateTag, tagInputSchema.parse(input))),
    updateTag: async (update: Parameters<DesktopApi["candidatures"]["updateTag"]>[0]) =>
      tagRecordSchema.parse(await invoke(channels.candidatureUpdateTag, tagUpdateSchema.parse(update))),
    setTags: async (selection: Parameters<DesktopApi["candidatures"]["setTags"]>[0]) =>
      candidatureRecordSchema.parse(
        await invoke(channels.candidatureSetTags, candidatureTagSelectionSchema.parse(selection)),
      ),
  });

  const ai = Object.freeze({
    connection: async () => optionalAiConnectionStatusSchema.parse(await invoke(aiChannels.connectionCurrent)),
    previewOpportunityReview: async (
      request: Parameters<AiDesktopApi["ai"]["previewOpportunityReview"]>[0],
    ) =>
      opportunityReviewPreviewSchema.parse(
        await invoke(aiChannels.opportunityReviewPreview, opportunityReviewRequestSchema.parse(request)),
      ),
    reviewOpportunity: async (
      request: Parameters<AiDesktopApi["ai"]["reviewOpportunity"]>[0],
    ) =>
      opportunityReviewResultSchema.parse(
        await invoke(aiChannels.opportunityReview, opportunityReviewRequestSchema.parse(request)),
      ),
    extractJob: async (request: Parameters<AiDesktopApi["ai"]["extractJob"]>[0]) =>
      jobExtractionResultSchema.parse(
        await invoke(aiChannels.jobExtract, jobExtractionRequestSchema.parse(request)),
      ),
    discoverField: async (request: Parameters<AiDesktopApi["ai"]["discoverField"]>[0]) =>
      historicalFieldDiscoveryResultSchema.parse(
        await invoke(aiChannels.fieldDiscover, historicalFieldDiscoveryRequestSchema.parse(request)),
      ),
    tailorCv: async (request: Parameters<AiDesktopApi["ai"]["tailorCv"]>[0]) =>
      cvTailoringResultSchema.parse(
        await invoke(aiChannels.cvTailor, cvTailoringRequestSchema.parse(request)),
      ),
    draftCoverLetter: async (
      request: Parameters<AiDesktopApi["ai"]["draftCoverLetter"]>[0],
    ) =>
      coverLetterDraftSchema.parse(
        await invoke(aiChannels.coverLetterDraft, coverLetterDraftRequestSchema.parse(request)),
      ),
  });

  const aiTasks = Object.freeze({
    extractJob: async (
      taskId: string,
      request: Parameters<AiTaskCancellationDesktopApi["aiTasks"]["extractJob"]>[1],
    ) =>
      cancellableJobExtractionResultSchema.parse(
        await invoke(
          aiTaskCancellationChannels.jobExtract,
          cancellableJobExtractionRequestSchema.parse({ taskId, request }),
        ),
      ),
    cancelJobExtraction: async (taskId: string) =>
      aiTaskCancellationResultSchema.parse(
        await invoke(aiTaskCancellationChannels.jobExtractCancel, aiTaskIdSchema.parse(taskId)),
      ),
  });

  return Object.freeze({ system, workspace, profile, careerContext, candidatures, ai, aiTasks });
}
