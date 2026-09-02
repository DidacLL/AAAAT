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
  .object({
    rootPath: z.string().min(1),
  })
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
export type ProfileItemContentPatch = z.infer<
  typeof profileItemContentPatchSchema
>;

export const profileItemSchema = profileItemInputSchema
  .extend({
    id: z.string().uuid(),
    sortOrder: z.number().int().nonnegative(),
  })
  .strict();
export type ProfileItem = z.infer<typeof profileItemSchema>;

export const profileItemUpdateSchema = z
  .object({
    id: z.string().uuid(),
    item: profileItemInputSchema,
  })
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
  .extend({
    id: z.string().uuid(),
    rules: z.array(profileVariantRuleSchema),
  })
  .strict();
export type ProfileVariant = z.infer<typeof profileVariantSchema>;

export const profileSnapshotSchema = z
  .object({
    items: z.array(profileItemSchema),
    variants: z.array(profileVariantSchema),
  })
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
export type ProfileVariantItemRuleInput = z.infer<
  typeof profileVariantItemRuleInputSchema
>;

export const profileVariantReorderSchema = z
  .object({
    variantId: z.string().uuid(),
    itemIds: z.array(z.string().uuid()).min(1),
  })
  .strict();
export type ProfileVariantReorder = z.infer<typeof profileVariantReorderSchema>;

export const resolvedProfileSchema = z
  .object({
    variant: profileVariantSchema,
    items: z.array(profileItemSchema),
  })
  .strict();
export type ResolvedProfile = z.infer<typeof resolvedProfileSchema>;

export interface DesktopApi {
  readonly system: {
    readonly info: () => Promise<SystemInfo>;
  };
  readonly workspace: {
    readonly current: () => Promise<WorkspaceInfo | null>;
    readonly choose: (choice: WorkspaceChoice) => Promise<WorkspaceInfo | null>;
  };
  readonly profile: {
    readonly current: () => Promise<ProfileSnapshot>;
    readonly addItem: (item: ProfileItemInput) => Promise<ProfileSnapshot>;
    readonly updateItem: (update: ProfileItemUpdate) => Promise<ProfileSnapshot>;
    readonly removeItem: (itemId: string) => Promise<ProfileSnapshot>;
    readonly createVariant: (
      variant: ProfileVariantInput,
    ) => Promise<ProfileSnapshot>;
    readonly updateVariant: (
      variant: ProfileVariantUpdate,
    ) => Promise<ProfileSnapshot>;
    readonly removeVariant: (variantId: string) => Promise<ProfileSnapshot>;
    readonly configureVariantItem: (
      rule: ProfileVariantItemRuleInput,
    ) => Promise<ProfileSnapshot>;
    readonly reorderVariant: (
      reorder: ProfileVariantReorder,
    ) => Promise<ProfileSnapshot>;
    readonly resolveVariant: (variantId: string) => Promise<ResolvedProfile>;
  };
}
