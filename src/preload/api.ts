import {
  aiConnectionInputSchema,
  aiConnectionStatusSchema,
  aiChannels,
  fitAssessmentPreviewSchema,
  fitAssessmentRequestSchema,
  fitAssessmentResultSchema,
  optionalAiConnectionStatusSchema,
  type AiDesktopApi,
} from "../shared/ai-contracts";
import {
  candidatureConceptSelectionSchema,
  candidatureDocumentSelectionSchema,
  candidatureInputSchema,
  candidatureListSchema,
  candidatureRecordSchema,
  candidatureUpdateSchema,
  channels,
  conceptInputSchema,
  conceptListSchema,
  conceptRecordSchema,
  conceptUpdateSchema,
  documentExportResultSchema,
  documentInputSchema,
  documentItemRuleInputSchema,
  documentListSchema,
  documentRecordSchema,
  documentReorderSchema,
  documentUpdateSchema,
  optionalWorkspaceInfoSchema,
  profileItemInputSchema,
  profileItemSchema,
  profileItemUpdateSchema,
  profileSnapshotSchema,
  profileVariantInputSchema,
  profileVariantItemRuleInputSchema,
  profileVariantReorderSchema,
  profileVariantSchema,
  profileVariantUpdateSchema,
  resolvedDocumentSchema,
  resolvedProfileSchema,
  systemInfoSchema,
  workspaceChoiceSchema,
  type DesktopApi,
} from "../shared/contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createDesktopApi(invoke: Invoke): DesktopApi & AiDesktopApi {
  const system = Object.freeze({
    info: async () => systemInfoSchema.parse(await invoke(channels.systemInfo)),
  });

  const workspace = Object.freeze({
    current: async () => optionalWorkspaceInfoSchema.parse(await invoke(channels.workspaceCurrent)),
    choose: async (choice: "create" | "open") =>
      optionalWorkspaceInfoSchema.parse(
        await invoke(channels.workspaceChoose, workspaceChoiceSchema.parse(choice)),
      ),
  });

  const profile = Object.freeze({
    current: async () => profileSnapshotSchema.parse(await invoke(channels.profileCurrent)),
    addItem: async (item: Parameters<DesktopApi["profile"]["addItem"]>[0]) =>
      profileSnapshotSchema.parse(await invoke(channels.profileAddItem, profileItemInputSchema.parse(item))),
    updateItem: async (update: Parameters<DesktopApi["profile"]["updateItem"]>[0]) =>
      profileSnapshotSchema.parse(await invoke(channels.profileUpdateItem, profileItemUpdateSchema.parse(update))),
    removeItem: async (itemId: string) =>
      profileSnapshotSchema.parse(await invoke(channels.profileRemoveItem, profileItemSchema.shape.id.parse(itemId))),
    createVariant: async (variant: Parameters<DesktopApi["profile"]["createVariant"]>[0]) =>
      profileSnapshotSchema.parse(await invoke(channels.profileCreateVariant, profileVariantInputSchema.parse(variant))),
    updateVariant: async (variant: Parameters<DesktopApi["profile"]["updateVariant"]>[0]) =>
      profileSnapshotSchema.parse(await invoke(channels.profileUpdateVariant, profileVariantUpdateSchema.parse(variant))),
    removeVariant: async (variantId: string) =>
      profileSnapshotSchema.parse(await invoke(channels.profileRemoveVariant, profileVariantSchema.shape.id.parse(variantId))),
    configureVariantItem: async (rule: Parameters<DesktopApi["profile"]["configureVariantItem"]>[0]) =>
      profileSnapshotSchema.parse(
        await invoke(channels.profileConfigureVariantItem, profileVariantItemRuleInputSchema.parse(rule)),
      ),
    reorderVariant: async (reorder: Parameters<DesktopApi["profile"]["reorderVariant"]>[0]) =>
      profileSnapshotSchema.parse(await invoke(channels.profileReorderVariant, profileVariantReorderSchema.parse(reorder))),
    resolveVariant: async (variantId: string) =>
      resolvedProfileSchema.parse(await invoke(channels.profileResolveVariant, profileVariantSchema.shape.id.parse(variantId))),
  });

  const documents = Object.freeze({
    list: async () => documentListSchema.parse(await invoke(channels.documentList)),
    create: async (input: Parameters<DesktopApi["documents"]["create"]>[0]) =>
      documentRecordSchema.parse(await invoke(channels.documentCreate, documentInputSchema.parse(input))),
    update: async (update: Parameters<DesktopApi["documents"]["update"]>[0]) =>
      documentRecordSchema.parse(await invoke(channels.documentUpdate, documentUpdateSchema.parse(update))),
    remove: async (documentId: string) =>
      documentListSchema.parse(await invoke(channels.documentRemove, documentRecordSchema.shape.id.parse(documentId))),
    configureItem: async (rule: Parameters<DesktopApi["documents"]["configureItem"]>[0]) =>
      documentRecordSchema.parse(
        await invoke(channels.documentConfigureItem, documentItemRuleInputSchema.parse(rule)),
      ),
    reorder: async (reorder: Parameters<DesktopApi["documents"]["reorder"]>[0]) =>
      documentRecordSchema.parse(await invoke(channels.documentReorder, documentReorderSchema.parse(reorder))),
    resolve: async (documentId: string) =>
      resolvedDocumentSchema.parse(await invoke(channels.documentResolve, documentRecordSchema.shape.id.parse(documentId))),
    render: async (documentId: string) =>
      documentRecordSchema.parse(await invoke(channels.documentRender, documentRecordSchema.shape.id.parse(documentId))),
    regenerate: async (documentId: string) =>
      documentRecordSchema.parse(await invoke(channels.documentRegenerate, documentRecordSchema.shape.id.parse(documentId))),
    exportProject: async (documentId: string) =>
      documentExportResultSchema.parse(
        await invoke(channels.documentExport, documentRecordSchema.shape.id.parse(documentId)),
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
    setDocuments: async (
      selection: Parameters<DesktopApi["candidatures"]["setDocuments"]>[0],
    ) =>
      candidatureRecordSchema.parse(
        await invoke(
          channels.candidatureSetDocuments,
          candidatureDocumentSelectionSchema.parse(selection),
        ),
      ),
    listConcepts: async () =>
      conceptListSchema.parse(await invoke(channels.candidatureListConcepts)),
    createConcept: async (
      input: Parameters<DesktopApi["candidatures"]["createConcept"]>[0],
    ) =>
      conceptRecordSchema.parse(
        await invoke(channels.candidatureCreateConcept, conceptInputSchema.parse(input)),
      ),
    updateConcept: async (
      update: Parameters<DesktopApi["candidatures"]["updateConcept"]>[0],
    ) =>
      conceptRecordSchema.parse(
        await invoke(channels.candidatureUpdateConcept, conceptUpdateSchema.parse(update)),
      ),
    setConcepts: async (
      selection: Parameters<DesktopApi["candidatures"]["setConcepts"]>[0],
    ) =>
      candidatureRecordSchema.parse(
        await invoke(
          channels.candidatureSetConcepts,
          candidatureConceptSelectionSchema.parse(selection),
        ),
      ),
  });

  const ai = Object.freeze({
    connection: async () =>
      optionalAiConnectionStatusSchema.parse(await invoke(aiChannels.connectionCurrent)),
    saveConnection: async (input: Parameters<AiDesktopApi["ai"]["saveConnection"]>[0]) =>
      aiConnectionStatusSchema.parse(
        await invoke(aiChannels.connectionSave, aiConnectionInputSchema.parse(input)),
      ),
    previewFit: async (request: Parameters<AiDesktopApi["ai"]["previewFit"]>[0]) =>
      fitAssessmentPreviewSchema.parse(
        await invoke(aiChannels.fitPreview, fitAssessmentRequestSchema.parse(request)),
      ),
    assessFit: async (request: Parameters<AiDesktopApi["ai"]["assessFit"]>[0]) =>
      fitAssessmentResultSchema.parse(
        await invoke(aiChannels.fitAssess, fitAssessmentRequestSchema.parse(request)),
      ),
  });

  return Object.freeze({ system, workspace, profile, documents, candidatures, ai });
}
