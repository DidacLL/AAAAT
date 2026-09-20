import { z } from "zod";

import { profileItemContentSchema, profileItemKindSchema } from "./contracts";

export const documentDomainChannels = Object.freeze({
  collections: "aaaat:document-domain-collections",
  templateCreate: "aaaat:cv-template-create",
  templateUpdate: "aaaat:cv-template-update",
  templateRemove: "aaaat:cv-template-remove",
  workingCreate: "aaaat:working-cv-create",
  workingUpdate: "aaaat:working-cv-update",
  workingRemove: "aaaat:working-cv-remove",
  workingSaveItem: "aaaat:working-cv-save-item",
  workingSaveTemplate: "aaaat:working-cv-save-template",
  renderCv: "aaaat:working-cv-render",
  duplicateRenderedCv: "aaaat:rendered-cv-duplicate",
  openRenderedCv: "aaaat:rendered-cv-open",
  exportRenderedCv: "aaaat:rendered-cv-export",
  letterCreate: "aaaat:cover-letter-create",
  letterUpdate: "aaaat:cover-letter-update",
  letterRemove: "aaaat:cover-letter-remove",
  packetCreate: "aaaat:application-packet-create",
  packetOpen: "aaaat:application-packet-open",
} as const);

const optionalLanguageSchema = z.string().trim().min(1).max(40).optional();
const optionalUuidSchema = z.string().uuid().nullable();

export const cvContentSchema = profileItemContentSchema
  .extend({ kind: profileItemKindSchema })
  .strict();
export type CvContent = z.infer<typeof cvContentSchema>;

const templateCurrentItemSchema = z.object({ id: z.string().uuid(), sourceMode: z.literal("current"), profileItemId: z.string().uuid() }).strict();
const templateVariantItemSchema = z.object({ id: z.string().uuid(), sourceMode: z.literal("variant"), profileItemId: z.string().uuid(), profileVariantId: z.string().uuid() }).strict();
const templateOverrideItemSchema = z.object({ id: z.string().uuid(), sourceMode: z.literal("override"), profileItemId: z.string().uuid(), content: cvContentSchema }).strict();
const templateCustomItemSchema = z.object({ id: z.string().uuid(), sourceMode: z.literal("custom"), content: cvContentSchema }).strict();

export const cvTemplateItemSchema = z.discriminatedUnion("sourceMode", [
  templateCurrentItemSchema,
  templateVariantItemSchema,
  templateOverrideItemSchema,
  templateCustomItemSchema,
]);
export type CvTemplateItem = z.infer<typeof cvTemplateItemSchema>;
export const cvTemplateSectionSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120), items: z.array(cvTemplateItemSchema).max(100) }).strict();
export type CvTemplateSection = z.infer<typeof cvTemplateSectionSchema>;
export const cvTemplateInputSchema = z.object({ name: z.string().trim().min(1).max(200), language: optionalLanguageSchema, sections: z.array(cvTemplateSectionSchema).max(40) }).strict();
export type CvTemplateInput = z.infer<typeof cvTemplateInputSchema>;
export const cvTemplateRecordSchema = cvTemplateInputSchema.extend({ id: z.string().uuid(), createdAt: z.string().min(1), updatedAt: z.string().min(1) }).strict();
export type CvTemplateRecord = z.infer<typeof cvTemplateRecordSchema>;
export const cvTemplateUpdateSchema = cvTemplateInputSchema.extend({ id: z.string().uuid() }).strict();
export type CvTemplateUpdate = z.infer<typeof cvTemplateUpdateSchema>;

export const workingCvItemSchema = z.object({
  id: z.string().uuid(),
  templateItemId: z.string().uuid().nullable(),
  sourceMode: z.enum(["current", "variant", "override", "custom"]),
  profileItemId: z.string().uuid().nullable(),
  profileVariantId: z.string().uuid().nullable(),
  content: cvContentSchema,
}).strict().superRefine((item, context) => {
  if (item.sourceMode === "custom" && (item.profileItemId !== null || item.profileVariantId !== null)) context.addIssue({ code: "custom", message: "Custom CV content cannot point to My information." });
  if (item.sourceMode !== "custom" && item.profileItemId === null) context.addIssue({ code: "custom", message: "Profile-backed CV content needs a My information item." });
  if (item.sourceMode === "variant" && item.profileVariantId === null) context.addIssue({ code: "custom", message: "Variant CV content needs a saved item variant." });
});
export type WorkingCvItem = z.infer<typeof workingCvItemSchema>;
export const workingCvSectionSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120), items: z.array(workingCvItemSchema).max(100) }).strict();
export type WorkingCvSection = z.infer<typeof workingCvSectionSchema>;

export const workingCvSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("template"), templateId: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("profile") }).strict(),
  z.object({ kind: z.literal("blank") }).strict(),
]);
export type WorkingCvSource = z.infer<typeof workingCvSourceSchema>;
export const workingCvCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  language: optionalLanguageSchema,
  candidatureId: optionalUuidSchema,
  source: workingCvSourceSchema,
}).strict().readonly();
export type WorkingCvCreate = z.infer<typeof workingCvCreateSchema>;
export const workingCvRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  language: optionalLanguageSchema,
  sourceTemplateId: optionalUuidSchema,
  candidatureId: optionalUuidSchema,
  sections: z.array(workingCvSectionSchema).max(40),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).strict();
export type WorkingCvRecord = z.infer<typeof workingCvRecordSchema>;
export const workingCvUpdateSchema = workingCvRecordSchema.pick({ id: true, title: true, language: true, sections: true }).strict();
export type WorkingCvUpdate = z.infer<typeof workingCvUpdateSchema>;

export const workingCvOwnershipTargetSchema = z.enum(["template", "profile_variant", "profile"]);
export type WorkingCvOwnershipTarget = z.infer<typeof workingCvOwnershipTargetSchema>;
export const workingCvSaveItemSchema = z.object({ workingCvId: z.string().uuid(), itemId: z.string().uuid(), target: workingCvOwnershipTargetSchema, variantName: z.string().trim().min(1).max(120).optional() }).strict();
export type WorkingCvSaveItem = z.infer<typeof workingCvSaveItemSchema>;
export const workingCvSaveTemplateSchema = z.object({ workingCvId: z.string().uuid(), name: z.string().trim().min(1).max(200) }).strict();
export type WorkingCvSaveTemplate = z.infer<typeof workingCvSaveTemplateSchema>;

export const renderedCvSnapshotSchema = workingCvRecordSchema.pick({ title: true, language: true, sourceTemplateId: true, candidatureId: true, sections: true });
export type RenderedCvSnapshot = z.infer<typeof renderedCvSnapshotSchema>;
export const renderedCvRecordSchema = z.object({ id: z.string().uuid(), workingCvId: optionalUuidSchema, sourceTemplateId: optionalUuidSchema, candidatureId: optionalUuidSchema, title: z.string().min(1), language: optionalLanguageSchema, snapshot: renderedCvSnapshotSchema, createdAt: z.string().min(1), hasPdf: z.boolean() }).strict();
export type RenderedCvRecord = z.infer<typeof renderedCvRecordSchema>;

export const coverLetterInputSchema = z.object({ candidatureId: optionalUuidSchema, title: z.string().trim().min(1).max(200), language: optionalLanguageSchema, recipient: z.string().max(300).optional(), subject: z.string().max(300).optional(), bodyParagraphs: z.array(z.string().max(5000)).max(20).default([]), closing: z.string().max(500).optional() }).strict();
export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;
export const coverLetterRecordSchema = coverLetterInputSchema.extend({ id: z.string().uuid(), createdAt: z.string().min(1), updatedAt: z.string().min(1) }).strict();
export type CoverLetterRecord = z.infer<typeof coverLetterRecordSchema>;
export const coverLetterUpdateSchema = coverLetterInputSchema.omit({ candidatureId: true }).extend({ id: z.string().uuid() }).strict();
export type CoverLetterUpdate = z.infer<typeof coverLetterUpdateSchema>;

export const applicationPacketCreateSchema = z.object({ candidatureId: z.string().uuid(), renderedCvId: z.string().uuid(), coverLetterId: z.string().uuid(), title: z.string().trim().min(1).max(200).optional() }).strict();
export type ApplicationPacketCreate = z.infer<typeof applicationPacketCreateSchema>;
export const applicationPacketRecordSchema = z.object({ id: z.string().uuid(), candidatureId: z.string().uuid(), renderedCvId: z.string().uuid(), coverLetterId: z.string().uuid(), title: z.string().min(1), createdAt: z.string().min(1), hasPdf: z.boolean() }).strict();
export type ApplicationPacketRecord = z.infer<typeof applicationPacketRecordSchema>;

export const documentCollectionsSchema = z.object({ templates: z.array(cvTemplateRecordSchema), workingCvs: z.array(workingCvRecordSchema), renderedCvs: z.array(renderedCvRecordSchema), letters: z.array(coverLetterRecordSchema), applicationPackets: z.array(applicationPacketRecordSchema) }).strict();
export type DocumentCollections = z.infer<typeof documentCollectionsSchema>;
export const openGeneratedResultSchema = z.object({ opened: z.literal(true) }).strict();
export type OpenGeneratedResult = z.infer<typeof openGeneratedResultSchema>;
export const portableProjectExportResultSchema = z.object({ exportedPath: z.string().min(1) }).strict().nullable();
export type PortableProjectExportResult = z.infer<typeof portableProjectExportResultSchema>;

export interface DocumentDomainDesktopApi {
  readonly documentDomain: {
    readonly collections: () => Promise<DocumentCollections>;
    readonly createTemplate: (input: CvTemplateInput) => Promise<DocumentCollections>;
    readonly updateTemplate: (input: CvTemplateUpdate) => Promise<DocumentCollections>;
    readonly removeTemplate: (templateId: string) => Promise<DocumentCollections>;
    readonly createWorkingCv: (input: WorkingCvCreate) => Promise<WorkingCvRecord>;
    readonly updateWorkingCv: (input: WorkingCvUpdate) => Promise<WorkingCvRecord>;
    readonly removeWorkingCv: (workingCvId: string) => Promise<DocumentCollections>;
    readonly saveWorkingItem: (input: WorkingCvSaveItem) => Promise<WorkingCvRecord>;
    readonly saveWorkingAsTemplate: (input: WorkingCvSaveTemplate) => Promise<CvTemplateRecord>;
    readonly renderCv: (workingCvId: string) => Promise<RenderedCvRecord>;
    readonly duplicateRenderedCv: (renderedCvId: string) => Promise<WorkingCvRecord>;
    readonly openRenderedCv: (renderedCvId: string) => Promise<OpenGeneratedResult>;
    readonly exportRenderedCv: (renderedCvId: string) => Promise<PortableProjectExportResult>;
    readonly createLetter: (input: CoverLetterInput) => Promise<CoverLetterRecord>;
    readonly updateLetter: (input: CoverLetterUpdate) => Promise<CoverLetterRecord>;
    readonly removeLetter: (letterId: string) => Promise<DocumentCollections>;
    readonly createPacket: (input: ApplicationPacketCreate) => Promise<ApplicationPacketRecord>;
    readonly openPacket: (packetId: string) => Promise<OpenGeneratedResult>;
  };
}
