import { z } from "zod";

export const channels = Object.freeze({
  systemInfo: "aaaat:system-info",
  workspaceCurrent: "aaaat:workspace-current",
  workspaceRecent: "aaaat:workspace-recent",
  workspaceContinue: "aaaat:workspace-continue",
  workspaceClose: "aaaat:workspace-close",
  workspaceDelete: "aaaat:workspace-delete",
  workspaceChoose: "aaaat:workspace-choose",
  workspaceCreateDemo: "aaaat:workspace-create-demo",
  workspaceReset: "aaaat:workspace-reset",
  workspaceStatus: "aaaat:workspace-status",
  profileCurrent: "aaaat:profile-current",
  profileAddItem: "aaaat:profile-add-item",
  profileUpdateItem: "aaaat:profile-update-item",
  profileRemoveItem: "aaaat:profile-remove-item",
  careerContextCurrent: "aaaat:career-context-current",
  careerContextUpdate: "aaaat:career-context-update",
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
  candidatureListTags: "aaaat:candidature-list-tags",
  candidatureCreateTag: "aaaat:candidature-create-tag",
  candidatureUpdateTag: "aaaat:candidature-update-tag",
  candidatureSetTags: "aaaat:candidature-set-tags",
} as const);

export const systemInfoSchema = z
  .object({ appVersion: z.string().min(1), electronVersion: z.string().min(1), nodeVersion: z.string().min(1) })
  .strict();
export type SystemInfo = z.infer<typeof systemInfoSchema>;

export const workspaceChoiceSchema = z.enum(["create", "open"]);
export type WorkspaceChoice = z.infer<typeof workspaceChoiceSchema>;
export const workspaceInfoSchema = z.object({ rootPath: z.string().min(1) }).strict();
export const optionalWorkspaceInfoSchema = workspaceInfoSchema.nullable();
export const recentWorkspacePathSchema = z.string().min(1).nullable();
export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>;
export const workspaceStatusSchema = z.object({ demo: z.boolean() }).strict();
export type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>;

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

export const profileItemKindSchema = z.string().trim().min(1).max(80);
export type ProfileItemKind = z.infer<typeof profileItemKindSchema>;
const optionalShortText = z.string().max(300).optional();
const optionalDateText = z.string().max(40).optional();
const optionalUrl = z.string().url().max(2048).optional();

export const profileItemContentSchema = z
  .object({
    title: z.string().min(1).max(200),
    subtitle: optionalShortText,
    description: z.string().max(5000).optional(),
    startDate: optionalDateText,
    endDate: optionalDateText,
    url: optionalUrl,
  })
  .strict();
export type ProfileItemContent = z.infer<typeof profileItemContentSchema>;

export const profileItemInputSchema = profileItemContentSchema
  .extend({ kind: profileItemKindSchema })
  .strict();
export type ProfileItemInput = z.infer<typeof profileItemInputSchema>;

export const profileItemSchema = profileItemInputSchema
  .extend({ id: z.string().uuid(), sortOrder: z.number().int().nonnegative() })
  .strict();
export type ProfileItem = z.infer<typeof profileItemSchema>;
export const profileItemUpdateSchema = z.object({ id: z.string().uuid(), item: profileItemInputSchema }).strict();
export type ProfileItemUpdate = z.infer<typeof profileItemUpdateSchema>;
export const profileSnapshotSchema = z.object({ items: z.array(profileItemSchema) }).strict();
export type ProfileSnapshot = z.infer<typeof profileSnapshotSchema>;

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

export const candidatureFieldValueTypeSchema = z.enum(["text", "long_text", "number", "boolean", "date", "url", "choice"]);
export type CandidatureFieldValueType = z.infer<typeof candidatureFieldValueTypeSchema>;
export const candidatureFieldCardinalitySchema = z.enum(["one", "many"]);
export type CandidatureFieldCardinality = z.infer<typeof candidatureFieldCardinalitySchema>;
export const candidaturePresentationSizeSchema = z.enum(["compact", "normal", "wide"]);
export type CandidaturePresentationSize = z.infer<typeof candidaturePresentationSizeSchema>;

export const candidatureChoiceDefinitionSchema = z.object({ id: z.string().uuid(), label: z.string().trim().min(1).max(120) }).strict();
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
    favourite: z.boolean(),
    favouriteOrder: z.number().int().nonnegative().nullable(),
    presentationSize: candidaturePresentationSizeSchema,
    aiUseAllowed: z.boolean(),
  })
  .strict();
export type CandidatureFieldPreferences = z.infer<typeof candidatureFieldPreferencesSchema>;
export const candidatureFieldConfigurationSchema = z
  .object({ definition: candidatureFieldDefinitionSchema, preferences: candidatureFieldPreferencesSchema })
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
export const candidatureFieldUpdateSchema = candidatureFieldCreateSchema.extend({ id: z.string().uuid() }).strict();
export type CandidatureFieldUpdate = z.infer<typeof candidatureFieldUpdateSchema>;
export const candidatureFieldPreferencesUpdateSchema = candidatureFieldPreferencesSchema;
export type CandidatureFieldPreferencesUpdate = z.infer<typeof candidatureFieldPreferencesUpdateSchema>;

const candidatureScalarValueSchema = z.union([z.string().max(50000), z.number().finite(), z.boolean()]);
export const candidatureRuntimeValueSchema = z.union([candidatureScalarValueSchema, z.array(candidatureScalarValueSchema).max(64)]);
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
  .object({ candidatureId: z.string().uuid(), fieldId: z.string().uuid(), value: candidatureRuntimeValueSchema })
  .strict();
export type CandidatureFieldValueSet = z.infer<typeof candidatureFieldValueSetSchema>;
export const candidatureFieldValueClearSchema = z.object({ candidatureId: z.string().uuid(), fieldId: z.string().uuid() }).strict();
export type CandidatureFieldValueClear = z.infer<typeof candidatureFieldValueClearSchema>;

export const candidatureInputSchema = z
  .object({
    source: candidatureSourceDraftSchema.optional(),
    values: z.array(candidatureFieldValueSetSchema.omit({ candidatureId: true })).max(64).default([]),
  })
  .strict();
export type CandidatureInput = z.infer<typeof candidatureInputSchema>;
export const candidatureUpdateSchema = z.object({ id: z.string().uuid(), archived: z.boolean() }).strict();
export type CandidatureUpdate = z.infer<typeof candidatureUpdateSchema>;
export const candidatureRecordSchema = z
  .object({
    id: z.string().uuid(),
    archived: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    sourceSearchText: z.string(),
    values: candidatureFieldValueListSchema,
    tagIds: z.array(z.string().uuid()),
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
  .object({ fieldId: z.string().uuid(), operator: candidatureFilterOperatorSchema, value: candidatureRuntimeValueSchema.optional() })
  .strict();
export type CandidatureFieldFilter = z.infer<typeof candidatureFieldFilterSchema>;
export const candidatureFilterResultSchema = z.array(z.string().uuid());

export const candidatureSourceInputSchema = candidatureSourceDraftSchema.extend({ candidatureId: z.string().uuid() }).strict();
export type CandidatureSourceInput = z.infer<typeof candidatureSourceInputSchema>;
export const candidatureSourceUpdateSchema = candidatureSourceInputSchema.extend({ id: z.string().uuid() }).strict();
export type CandidatureSourceUpdate = z.infer<typeof candidatureSourceUpdateSchema>;
export const candidatureSourceRemoveSchema = z.object({ candidatureId: z.string().uuid(), sourceId: z.string().uuid() }).strict();
export type CandidatureSourceRemove = z.infer<typeof candidatureSourceRemoveSchema>;
export const candidatureSourceSchema = candidatureSourceInputSchema
  .extend({ id: z.string().uuid(), createdAt: z.string().min(1), updatedAt: z.string().min(1) })
  .strict();
export type CandidatureSource = z.infer<typeof candidatureSourceSchema>;
export const candidatureSourceListSchema = z.array(candidatureSourceSchema);

const tagAliasSchema = z.string().trim().min(1).max(120);
export const tagInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    definition: z.string().max(3000),
    notes: z.string().max(5000).optional(),
    aliases: z.array(tagAliasSchema).max(30),
  })
  .strict()
  .refine((value) => new Set(value.aliases.map((alias) => alias.toLocaleLowerCase())).size === value.aliases.length, {
    message: "Tag aliases must be unique.",
  });
export type TagInput = z.infer<typeof tagInputSchema>;
export const tagRecordSchema = tagInputSchema.extend({ id: z.string().uuid() }).strict();
export type TagRecord = z.infer<typeof tagRecordSchema>;
export const tagListSchema = z.array(tagRecordSchema);
export const tagUpdateSchema = tagInputSchema.extend({ id: z.string().uuid() }).strict();
export type TagUpdate = z.infer<typeof tagUpdateSchema>;
export const candidatureTagSelectionSchema = z
  .object({ candidatureId: z.string().uuid(), tagIds: z.array(z.string().uuid()).max(100) })
  .strict()
  .refine((value) => new Set(value.tagIds).size === value.tagIds.length, { message: "Each tag can be associated only once." });
export type CandidatureTagSelection = z.infer<typeof candidatureTagSelectionSchema>;

export interface DesktopApi {
  readonly system: { readonly info: () => Promise<SystemInfo> };
  readonly workspace: {
    readonly current: () => Promise<WorkspaceInfo | null>;
    readonly recent: () => Promise<string | null>;
    readonly continueRecent: () => Promise<WorkspaceInfo | null>;
    readonly close: () => Promise<void>;
    readonly delete: () => Promise<void>;
    readonly choose: (choice: WorkspaceChoice) => Promise<WorkspaceInfo | null>;
    readonly createDemo: () => Promise<WorkspaceInfo | null>;
    readonly reset: () => Promise<WorkspaceInfo>;
    readonly status: () => Promise<WorkspaceStatus>;
  };
  readonly profile: {
    readonly current: () => Promise<ProfileSnapshot>;
    readonly addItem: (item: ProfileItemInput) => Promise<ProfileSnapshot>;
    readonly updateItem: (update: ProfileItemUpdate) => Promise<ProfileSnapshot>;
    readonly removeItem: (itemId: string) => Promise<ProfileSnapshot>;
  };
  readonly careerContext: {
    readonly current: () => Promise<CareerContext>;
    readonly update: (update: CareerContextUpdate) => Promise<CareerContext>;
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
    readonly updateFieldPreferences: (input: CandidatureFieldPreferencesUpdate) => Promise<CandidatureFieldConfiguration>;
    readonly setFieldValue: (input: CandidatureFieldValueSet) => Promise<CandidatureRecord>;
    readonly clearFieldValue: (input: CandidatureFieldValueClear) => Promise<CandidatureRecord>;
    readonly listSources: (candidatureId: string) => Promise<CandidatureSource[]>;
    readonly addSource: (input: CandidatureSourceInput) => Promise<CandidatureSource[]>;
    readonly updateSource: (update: CandidatureSourceUpdate) => Promise<CandidatureSource[]>;
    readonly removeSource: (remove: CandidatureSourceRemove) => Promise<CandidatureSource[]>;
    readonly listTags: () => Promise<TagRecord[]>;
    readonly createTag: (input: TagInput) => Promise<TagRecord>;
    readonly updateTag: (update: TagUpdate) => Promise<TagRecord>;
    readonly setTags: (selection: CandidatureTagSelection) => Promise<CandidatureRecord>;
  };
}
