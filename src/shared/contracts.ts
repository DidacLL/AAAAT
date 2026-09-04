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
  careerContextCurrent: "aaaat:career-context-current",
  careerContextUpdate: "aaaat:career-context-update",
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
  candidatureFilter: "aaaat:candidature-filter",
  candidatureFieldList: "aaaat:candidature-field-list",
  candidatureFieldCreate: "aaaat:candidature-field-create",
  candidatureFieldUpdate: "aaaat:candidature-field-update",
  candidatureFieldDelete: "aaaat:candidature-field-delete",
  candidatureFieldPreferencesUpdate: "aaaat:candidature-field-preferences-update",
  candidatureFieldValueSet: "aaaat:candidature-field-value-set",
  candidatureFieldValueClear: "aaaat:candidature-field-value-clear",
  candidatureSourceList: "aaaat:candidature-source-list",
  candidatureSourceAdd: "aaaat:candidature-source-add",
  candidatureSourceUpdate: "aaaat:candidature-source-update",
  candidatureSourceRemove: "aaaat:candidature-source-remove",
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

export const workspaceInfoSchema = z.object({ rootPath: z.string().min(1) }).strict();
export const optionalWorkspaceInfoSchema = workspaceInfoSchema.nullable();
export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>;

const careerContextText = z.string().max(10000);
export const careerContextSchema = z
  .object({
    careerDirection: careerContextText,
    objectives: careerContextText,
    constraints: careerContextText,
    targetRoles: careerContextText,
    targetMarketsLocations: careerContextText,
    workPreferences: careerContextText,
    applicationWritingPreferences: careerContextText,
  })
  .strict();
export type CareerContext = z.infer<typeof careerContextSchema>;
export const careerContextUpdateSchema = careerContextSchema;
export type CareerContextUpdate = z.infer<typeof careerContextUpdateSchema>;

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
  .extend({ id: z.string().uuid(), sortOrder: z.number().int().nonnegative() })
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

export const candidatureSourceKindSchema = z.enum([
  "job_posting",
  "recruiter_message",
  "application_form",
  "conversation",
  "link",
  "other",
]);
export type CandidatureSourceKind = z.infer<typeof candidatureSourceKindSchema>;

export const candidatureSourceDraftSchema = z
  .object({
    kind: candidatureSourceKindSchema.default("other"),
    title: z.string().max(200).default(""),
    url: z.string().max(2048).default(""),
    sourceText: z.string().max(50000).default(""),
  })
  .strict();
export type CandidatureSourceDraft = z.infer<typeof candidatureSourceDraftSchema>;

export const candidatureFieldValueTypeSchema = z.enum([
  "text",
  "long_text",
  "number",
  "boolean",
  "date",
  "url",
  "choice",
]);
export type CandidatureFieldValueType = z.infer<typeof candidatureFieldValueTypeSchema>;
export const candidatureFieldCardinalitySchema = z.enum(["one", "many"]);
export type CandidatureFieldCardinality = z.infer<typeof candidatureFieldCardinalitySchema>;
export const focusProminenceSchema = z.enum(["compact", "normal", "wide"]);
export type FocusProminence = z.infer<typeof focusProminenceSchema>;
/** Provider-context disclosure preference, separate from ordinary persistence rules. */
export const aiContextModeSchema = z.enum(["expose", "omit", "token"]);
export type AiContextMode = z.infer<typeof aiContextModeSchema>;

export const candidatureChoiceDefinitionSchema = z
  .object({ id: z.string().uuid(), label: z.string().trim().min(1).max(120) })
  .strict();
export type CandidatureChoiceDefinition = z.infer<typeof candidatureChoiceDefinitionSchema>;

export const candidatureFieldDefinitionSchema = z
  .object({
    id: z.string().uuid(),
    systemKey: z.string().trim().min(1).max(200).nullable(),
    label: z.string().trim().min(1).max(120),
    description: z.string().max(2000),
    valueType: candidatureFieldValueTypeSchema,
    cardinality: candidatureFieldCardinalitySchema,
    choices: z.array(candidatureChoiceDefinitionSchema).max(64),
    enabled: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();
export type CandidatureFieldDefinition = z.infer<typeof candidatureFieldDefinitionSchema>;

export const candidatureFieldPreferencesSchema = z
  .object({
    fieldId: z.string().uuid(),
    focusVisible: z.boolean(),
    focusOrder: z.number().int().nonnegative().nullable(),
    focusProminence: focusProminenceSchema,
    identityOrder: z.number().int().nonnegative().nullable(),
    aiDiscovery: z.boolean(),
    aiContextMode: aiContextModeSchema,
  })
  .strict();
export type CandidatureFieldPreferences = z.infer<typeof candidatureFieldPreferencesSchema>;

export const candidatureFieldConfigurationSchema = z
  .object({
    definition: candidatureFieldDefinitionSchema,
    preferences: candidatureFieldPreferencesSchema,
  })
  .strict();
export type CandidatureFieldConfiguration = z.infer<typeof candidatureFieldConfigurationSchema>;
export const candidatureFieldListSchema = z.array(candidatureFieldConfigurationSchema);

export const candidatureFieldCreateSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    description: z.string().max(2000).default(""),
    valueType: candidatureFieldValueTypeSchema.default("text"),
    cardinality: candidatureFieldCardinalitySchema.default("one"),
    choices: z.array(candidatureChoiceDefinitionSchema).max(64).default([]),
    enabled: z.boolean().default(true),
  })
  .strict();
export type CandidatureFieldCreate = z.infer<typeof candidatureFieldCreateSchema>;

export const candidatureFieldUpdateSchema = candidatureFieldCreateSchema
  .extend({ id: z.string().uuid() })
  .strict();
export type CandidatureFieldUpdate = z.infer<typeof candidatureFieldUpdateSchema>;

export const candidatureFieldPreferencesUpdateSchema = candidatureFieldPreferencesSchema;
export type CandidatureFieldPreferencesUpdate = z.infer<typeof candidatureFieldPreferencesUpdateSchema>;

const candidatureScalarValueSchema = z.union([
  z.string().max(50000),
  z.number().finite(),
  z.boolean(),
]);
export const candidatureRuntimeValueSchema = z.union([
  candidatureScalarValueSchema,
  z.array(candidatureScalarValueSchema).max(64),
]);
export type CandidatureRuntimeValue = z.infer<typeof candidatureRuntimeValueSchema>;

export const candidatureFieldValueSchema = z
  .object({
    candidatureId: z.string().uuid(),
    fieldId: z.string().uuid(),
    value: candidatureRuntimeValueSchema,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();
export type CandidatureFieldValue = z.infer<typeof candidatureFieldValueSchema>;
export const candidatureFieldValueListSchema = z.array(candidatureFieldValueSchema);

export const candidatureFieldValueSetSchema = z
  .object({
    candidatureId: z.string().uuid(),
    fieldId: z.string().uuid(),
    value: candidatureRuntimeValueSchema,
  })
  .strict();
export type CandidatureFieldValueSet = z.infer<typeof candidatureFieldValueSetSchema>;

export const candidatureFieldValueClearSchema = z
  .object({ candidatureId: z.string().uuid(), fieldId: z.string().uuid() })
  .strict();
export type CandidatureFieldValueClear = z.infer<typeof candidatureFieldValueClearSchema>;

export const candidatureInputSchema = z
  .object({
    source: candidatureSourceDraftSchema.optional(),
    values: z.array(candidatureFieldValueSetSchema.omit({ candidatureId: true })).max(64).default([]),
  })
  .strict();
export type CandidatureInput = z.infer<typeof candidatureInputSchema>;

export const candidatureUpdateSchema = z
  .object({ id: z.string().uuid(), archived: z.boolean() })
  .strict();
export type CandidatureUpdate = z.infer<typeof candidatureUpdateSchema>;

export const candidatureRecordSchema = z
  .object({
    id: z.string().uuid(),
    archived: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    label: z.string().min(1),
    values: candidatureFieldValueListSchema,
    documentIds: z.array(z.string().uuid()),
    conceptIds: z.array(z.string().uuid()),
  })
  .strict();
export type CandidatureRecord = z.infer<typeof candidatureRecordSchema>;
export const candidatureListSchema = z.array(candidatureRecordSchema);

export const candidatureFilterOperatorSchema = z.enum([
  "contains",
  "equals",
  "less_than",
  "less_than_or_equal",
  "greater_than",
  "greater_than_or_equal",
  "before",
  "after",
  "contains_any",
  "contains_all",
  "is_set",
  "is_not_set",
]);
export type CandidatureFilterOperator = z.infer<typeof candidatureFilterOperatorSchema>;
export const candidatureFieldFilterSchema = z
  .object({
    fieldId: z.string().uuid(),
    operator: candidatureFilterOperatorSchema,
    value: candidatureRuntimeValueSchema.optional(),
  })
  .strict();
export type CandidatureFieldFilter = z.infer<typeof candidatureFieldFilterSchema>;
export const candidatureFilterResultSchema = z.array(z.string().uuid());

export const candidatureSourceInputSchema = candidatureSourceDraftSchema
  .extend({ candidatureId: z.string().uuid() })
  .strict();
export type CandidatureSourceInput = z.infer<typeof candidatureSourceInputSchema>;

export const candidatureSourceUpdateSchema = candidatureSourceInputSchema
  .extend({ id: z.string().uuid() })
  .strict();
export type CandidatureSourceUpdate = z.infer<typeof candidatureSourceUpdateSchema>;

export const candidatureSourceRemoveSchema = z
  .object({ candidatureId: z.string().uuid(), sourceId: z.string().uuid() })
  .strict();
export type CandidatureSourceRemove = z.infer<typeof candidatureSourceRemoveSchema>;

export const candidatureSourceSchema = candidatureSourceInputSchema
  .extend({
    id: z.string().uuid(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();
export type CandidatureSource = z.infer<typeof candidatureSourceSchema>;
export const candidatureSourceListSchema = z.array(candidatureSourceSchema);

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
    (value) =>
      new Set(value.aliases.map((alias) => alias.toLocaleLowerCase())).size === value.aliases.length,
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
  readonly careerContext: {
    readonly current: () => Promise<CareerContext>;
    readonly update: (update: CareerContextUpdate) => Promise<CareerContext>;
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
    readonly filter: (filter: CandidatureFieldFilter) => Promise<string[]>;
    readonly listFields: () => Promise<CandidatureFieldConfiguration[]>;
    readonly createField: (input: CandidatureFieldCreate) => Promise<CandidatureFieldConfiguration>;
    readonly updateField: (input: CandidatureFieldUpdate) => Promise<CandidatureFieldConfiguration>;
    readonly deleteField: (fieldId: string) => Promise<CandidatureFieldConfiguration[]>;
    readonly updateFieldPreferences: (
      input: CandidatureFieldPreferencesUpdate,
    ) => Promise<CandidatureFieldConfiguration>;
    readonly setFieldValue: (input: CandidatureFieldValueSet) => Promise<CandidatureRecord>;
    readonly clearFieldValue: (input: CandidatureFieldValueClear) => Promise<CandidatureRecord>;
    readonly listSources: (candidatureId: string) => Promise<CandidatureSource[]>;
    readonly addSource: (input: CandidatureSourceInput) => Promise<CandidatureSource[]>;
    readonly updateSource: (update: CandidatureSourceUpdate) => Promise<CandidatureSource[]>;
    readonly removeSource: (remove: CandidatureSourceRemove) => Promise<CandidatureSource[]>;
    readonly setDocuments: (selection: CandidatureDocumentSelection) => Promise<CandidatureRecord>;
    readonly listConcepts: () => Promise<ConceptRecord[]>;
    readonly createConcept: (input: ConceptInput) => Promise<ConceptRecord>;
    readonly updateConcept: (update: ConceptUpdate) => Promise<ConceptRecord>;
    readonly setConcepts: (selection: CandidatureConceptSelection) => Promise<CandidatureRecord>;
  };
}
