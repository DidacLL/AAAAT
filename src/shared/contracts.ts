import { z } from "zod";

export const channels = Object.freeze({
  systemInfo: "aaaat:system-info",
  workspaceCurrent: "aaaat:workspace-current",
  workspaceChoose: "aaaat:workspace-choose",
  profileCurrent: "aaaat:profile-current",
  profileAddItem: "aaaat:profile-add-item",
  profileUpdateItem: "aaaat:profile-update-item",
  profileRemoveItem: "aaaat:profile-remove-item",
  profileCreateVariant: "aaaat:profile-create-variant",
  profileUpdateVariant: "aaaat:profile-update-variant",
  profileRemoveVariant: "aaaat:profile-remove-variant",
  profileConfigureVariantItem: "aaaat:profile-configure-variant-item",
  profileReorderVariant: "aaaat:profile-reorder-variant",
  profileResolveVariant: "aaaat:profile-resolve-variant",
  documentList: "aaaat:document-list",
  documentCreate: "aaaat:document-create",
  documentUpdate: "aaaat:document-update",
  documentRemove: "aaaat:document-remove",
  documentConfigureItem: "aaaat:document-configure-item",
  documentReorder: "aaaat:document-reorder",
  documentResolve: "aaaat:document-resolve",
  documentRender: "aaaat:document-render",
  documentRegenerate: "aaaat:document-regenerate",
  documentExport: "aaaat:document-export",
  candidatureList: "aaaat:candidature-list",
  candidatureCreate: "aaaat:candidature-create",
  candidatureUpdate: "aaaat:candidature-update",
  candidatureSetDocuments: "aaaat:candidature-set-documents",
  candidatureListConcepts: "aaaat:candidature-list-concepts",
  candidatureCreateConcept: "aaaat:candidature-create-concept",
  candidatureUpdateConcept: "aaaat:candidature-update-concept",
  candidatureSetConcepts: "aaaat:candidature-set-concepts",
} as const);

export const systemInfoSchema = z
  .object({
    appVersion: z.string().min(1),
    electronVersion: z.string().min(1),
    nodeVersion: z.string().min(1),
  })
  .strict();
export type SystemInfo = z.infer<typeof systemInfoSchema>;

export const workspaceChoiceSchema = z.enum(["create", "open"]);
export type WorkspaceChoice = z.infer<typeof workspaceChoiceSchema>;

export const workspaceInfoSchema = z
  .object({ rootPath: z.string().min(1) })
  .strict();
export const optionalWorkspaceInfoSchema = workspaceInfoSchema.nullable();
export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>;

export const profileItemKindSchema = z.enum([
  "identity",
  "contact",
  "summary",
  "experience",
  "education",
  "project",
  "skill",
  "certification",
  "language",
  "link",
]);
export type ProfileItemKind = z.infer<typeof profileItemKindSchema>;

const optionalShortText = z.string().max(300).optional();
const optionalDateText = z.string().max(40).optional();
const optionalUrl = z.string().url().max(2048).optional();

export const profileItemInputSchema = z
  .object({
    kind: profileItemKindSchema,
    title: z.string().min(1).max(200),
    subtitle: optionalShortText,
    description: z.string().max(5000).optional(),
    startDate: optionalDateText,
    endDate: optionalDateText,
    url: optionalUrl,
  })
  .strict();
export type ProfileItemInput = z.infer<typeof profileItemInputSchema>;

export const profileItemContentPatchSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    subtitle: optionalShortText,
    description: z.string().max(5000).optional(),
    startDate: optionalDateText,
    endDate: optionalDateText,
    url: optionalUrl,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one content override.",
  });
export type ProfileItemContentPatch = z.infer<typeof profileItemContentPatchSchema>;

export const profileItemSchema = profileItemInputSchema
  .extend({
    id: z.string().uuid(),
    sortOrder: z.number().int().nonnegative(),
  })
  .strict();
export type ProfileItem = z.infer<typeof profileItemSchema>;

export const profileItemUpdateSchema = z
  .object({ id: z.string().uuid(), item: profileItemInputSchema })
  .strict();
export type ProfileItemUpdate = z.infer<typeof profileItemUpdateSchema>;

export const profileVariantInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    focus: z.string().max(500),
    targetTags: z.array(z.string().trim().min(1).max(80)).max(20),
    preferredLanguage: z.string().trim().min(1).max(40).optional(),
  })
  .strict();
export type ProfileVariantInput = z.infer<typeof profileVariantInputSchema>;

export const profileVariantUpdateSchema = profileVariantInputSchema
  .extend({ id: z.string().uuid() })
  .strict();
export type ProfileVariantUpdate = z.infer<typeof profileVariantUpdateSchema>;

export const profileVariantRuleSchema = z
  .object({
    itemId: z.string().uuid(),
    excluded: z.boolean(),
    contentPatch: profileItemContentPatchSchema.nullable(),
    orderRank: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type ProfileVariantRule = z.infer<typeof profileVariantRuleSchema>;

export const profileVariantSchema = profileVariantInputSchema
  .extend({ id: z.string().uuid(), rules: z.array(profileVariantRuleSchema) })
  .strict();
export type ProfileVariant = z.infer<typeof profileVariantSchema>;

export const profileSnapshotSchema = z
  .object({ items: z.array(profileItemSchema), variants: z.array(profileVariantSchema) })
  .strict();
export type ProfileSnapshot = z.infer<typeof profileSnapshotSchema>;

export const profileVariantItemRuleInputSchema = z
  .object({
    variantId: z.string().uuid(),
    itemId: z.string().uuid(),
    included: z.boolean(),
    contentPatch: profileItemContentPatchSchema.nullable().optional(),
  })
  .strict();
export type ProfileVariantItemRuleInput = z.infer<typeof profileVariantItemRuleInputSchema>;

export const profileVariantReorderSchema = z
  .object({ variantId: z.string().uuid(), itemIds: z.array(z.string().uuid()).min(1) })
  .strict();
export type ProfileVariantReorder = z.infer<typeof profileVariantReorderSchema>;

export const resolvedProfileSchema = z
  .object({ variant: profileVariantSchema, items: z.array(profileItemSchema) })
  .strict();
export type ResolvedProfile = z.infer<typeof resolvedProfileSchema>;

export const documentKindSchema = z.enum(["cv", "cover_letter"]);
export type DocumentKind = z.infer<typeof documentKindSchema>;
export const documentModeSchema = z.enum(["managed", "manual"]);
export type DocumentMode = z.infer<typeof documentModeSchema>;
export const documentEngineSchema = z.enum(["pdflatex", "lualatex", "xelatex"]);
export type DocumentEngine = z.infer<typeof documentEngineSchema>;

export const documentInputSchema = z
  .object({
    kind: documentKindSchema,
    title: z.string().trim().min(1).max(200),
    variantId: z.string().uuid(),
    language: z.string().trim().min(1).max(40).optional(),
    engine: documentEngineSchema.default("pdflatex"),
    recipient: z.string().max(300).optional(),
    subject: z.string().max(300).optional(),
    bodyParagraphs: z.array(z.string().max(5000)).max(20).default([]),
    closing: z.string().max(500).optional(),
  })
  .strict();
export type DocumentInput = z.infer<typeof documentInputSchema>;

export const documentUpdateSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    language: z.string().trim().min(1).max(40).optional(),
    engine: documentEngineSchema,
    recipient: z.string().max(300).optional(),
    subject: z.string().max(300).optional(),
    bodyParagraphs: z.array(z.string().max(5000)).max(20),
    closing: z.string().max(500).optional(),
  })
  .strict();
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;

export const documentItemRuleSchema = z
  .object({
    itemId: z.string().uuid(),
    excluded: z.boolean(),
    contentPatch: profileItemContentPatchSchema.nullable(),
    orderRank: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type DocumentItemRule = z.infer<typeof documentItemRuleSchema>;

export const documentRecordSchema = z
  .object({
    id: z.string().uuid(),
    kind: documentKindSchema,
    title: z.string().min(1),
    variantId: z.string().uuid(),
    language: z.string().optional(),
    engine: documentEngineSchema,
    recipient: z.string().optional(),
    subject: z.string().optional(),
    bodyParagraphs: z.array(z.string()),
    closing: z.string().optional(),
    mode: documentModeSchema,
    rules: z.array(documentItemRuleSchema),
    projectPath: z.string().min(1),
    sourcePath: z.string().min(1),
    artifactPath: z.string().min(1),
  })
  .strict();
export type DocumentRecord = z.infer<typeof documentRecordSchema>;

export const documentListSchema = z.array(documentRecordSchema);

export const documentItemRuleInputSchema = z
  .object({
    documentId: z.string().uuid(),
    itemId: z.string().uuid(),
    included: z.boolean(),
    contentPatch: profileItemContentPatchSchema.nullable().optional(),
  })
  .strict();
export type DocumentItemRuleInput = z.infer<typeof documentItemRuleInputSchema>;

export const documentReorderSchema = z
  .object({ documentId: z.string().uuid(), itemIds: z.array(z.string().uuid()).min(1) })
  .strict();
export type DocumentReorder = z.infer<typeof documentReorderSchema>;

export const resolvedDocumentSchema = z
  .object({ document: documentRecordSchema, items: z.array(profileItemSchema) })
  .strict();
export type ResolvedDocument = z.infer<typeof resolvedDocumentSchema>;

export const documentExportResultSchema = z
  .object({ exportedPath: z.string().min(1) })
  .strict()
  .nullable();
export type DocumentExportResult = z.infer<typeof documentExportResultSchema>;

export const candidatureStatusSchema = z.enum([
  "saved",
  "applied",
  "interview",
  "offer",
  "closed",
]);
export type CandidatureStatus = z.infer<typeof candidatureStatusSchema>;

export const candidatureInputSchema = z
  .object({
    company: z.string().max(200),
    role: z.string().max(200),
    location: z.string().max(200),
    workMode: z.string().max(80),
    salaryText: z.string().max(300),
    source: z.string().max(200),
    sourceUrl: z.string().max(2048),
    sourceText: z.string().max(50000),
    status: candidatureStatusSchema,
    applicationDate: z.string().max(40),
    nextAction: z.string().max(1000),
    nextActionDate: z.string().max(40),
    notes: z.string().max(20000),
  })
  .strict();
export type CandidatureInput = z.infer<typeof candidatureInputSchema>;

export const candidatureUpdateSchema = candidatureInputSchema
  .extend({
    id: z.string().uuid(),
    archived: z.boolean(),
  })
  .strict();
export type CandidatureUpdate = z.infer<typeof candidatureUpdateSchema>;

export const candidatureRecordSchema = candidatureInputSchema
  .extend({
    id: z.string().uuid(),
    archived: z.boolean(),
    documentIds: z.array(z.string().uuid()),
    conceptIds: z.array(z.string().uuid()),
  })
  .strict();
export type CandidatureRecord = z.infer<typeof candidatureRecordSchema>;

export const candidatureListSchema = z.array(candidatureRecordSchema);

export const candidatureDocumentSelectionSchema = z
  .object({
    candidatureId: z.string().uuid(),
    documentIds: z.array(z.string().uuid()).max(50),
  })
  .strict()
  .refine((value) => new Set(value.documentIds).size === value.documentIds.length, {
    message: "Each document can be associated only once.",
  });
export type CandidatureDocumentSelection = z.infer<typeof candidatureDocumentSelectionSchema>;

const conceptAliasSchema = z.string().trim().min(1).max(120);
export const conceptInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    definition: z.string().max(3000),
    aliases: z.array(conceptAliasSchema).max(30),
  })
  .strict()
  .refine(
    (value) => new Set(value.aliases.map((alias) => alias.toLocaleLowerCase())).size === value.aliases.length,
    { message: "Concept aliases must be unique." },
  );
export type ConceptInput = z.infer<typeof conceptInputSchema>;

export const conceptRecordSchema = conceptInputSchema
  .extend({ id: z.string().uuid() })
  .strict();
export type ConceptRecord = z.infer<typeof conceptRecordSchema>;
export const conceptListSchema = z.array(conceptRecordSchema);

export const conceptUpdateSchema = conceptInputSchema
  .extend({ id: z.string().uuid() })
  .strict();
export type ConceptUpdate = z.infer<typeof conceptUpdateSchema>;

export const candidatureConceptSelectionSchema = z
  .object({
    candidatureId: z.string().uuid(),
    conceptIds: z.array(z.string().uuid()).max(100),
  })
  .strict()
  .refine((value) => new Set(value.conceptIds).size === value.conceptIds.length, {
    message: "Each concept can be associated only once.",
  });
export type CandidatureConceptSelection = z.infer<typeof candidatureConceptSelectionSchema>;

export interface DesktopApi {
  readonly system: { readonly info: () => Promise<SystemInfo> };
  readonly workspace: {
    readonly current: () => Promise<WorkspaceInfo | null>;
    readonly choose: (choice: WorkspaceChoice) => Promise<WorkspaceInfo | null>;
  };
  readonly profile: {
    readonly current: () => Promise<ProfileSnapshot>;
    readonly addItem: (item: ProfileItemInput) => Promise<ProfileSnapshot>;
    readonly updateItem: (update: ProfileItemUpdate) => Promise<ProfileSnapshot>;
    readonly removeItem: (itemId: string) => Promise<ProfileSnapshot>;
    readonly createVariant: (variant: ProfileVariantInput) => Promise<ProfileSnapshot>;
    readonly updateVariant: (variant: ProfileVariantUpdate) => Promise<ProfileSnapshot>;
    readonly removeVariant: (variantId: string) => Promise<ProfileSnapshot>;
    readonly configureVariantItem: (rule: ProfileVariantItemRuleInput) => Promise<ProfileSnapshot>;
    readonly reorderVariant: (reorder: ProfileVariantReorder) => Promise<ProfileSnapshot>;
    readonly resolveVariant: (variantId: string) => Promise<ResolvedProfile>;
  };
  readonly documents: {
    readonly list: () => Promise<DocumentRecord[]>;
    readonly create: (input: DocumentInput) => Promise<DocumentRecord>;
    readonly update: (update: DocumentUpdate) => Promise<DocumentRecord>;
    readonly remove: (documentId: string) => Promise<DocumentRecord[]>;
    readonly configureItem: (rule: DocumentItemRuleInput) => Promise<DocumentRecord>;
    readonly reorder: (reorder: DocumentReorder) => Promise<DocumentRecord>;
    readonly resolve: (documentId: string) => Promise<ResolvedDocument>;
    readonly render: (documentId: string) => Promise<DocumentRecord>;
    readonly regenerate: (documentId: string) => Promise<DocumentRecord>;
    readonly exportProject: (documentId: string) => Promise<DocumentExportResult>;
  };
  readonly candidatures: {
    readonly list: () => Promise<CandidatureRecord[]>;
    readonly create: (input: CandidatureInput) => Promise<CandidatureRecord>;
    readonly update: (update: CandidatureUpdate) => Promise<CandidatureRecord>;
    readonly setDocuments: (selection: CandidatureDocumentSelection) => Promise<CandidatureRecord>;
    readonly listConcepts: () => Promise<ConceptRecord[]>;
    readonly createConcept: (input: ConceptInput) => Promise<ConceptRecord>;
    readonly updateConcept: (update: ConceptUpdate) => Promise<ConceptRecord>;
    readonly setConcepts: (selection: CandidatureConceptSelection) => Promise<CandidatureRecord>;
  };
}
