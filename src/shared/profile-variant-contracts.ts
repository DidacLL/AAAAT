import { z } from "zod";
import { profileItemContentSchema } from "./contracts";
export const profileVariantChannels = Object.freeze({ list: "aaaat:profile-variant-list", create: "aaaat:profile-variant-create", update: "aaaat:profile-variant-update", remove: "aaaat:profile-variant-remove" } as const);
export const profileVariantInputSchema = z.object({ itemId: z.string().uuid(), name: z.string().trim().min(1).max(120), content: profileItemContentSchema }).strict();
export type ProfileVariantInput = z.infer<typeof profileVariantInputSchema>;
export const profileVariantRecordSchema = profileVariantInputSchema.extend({ id: z.string().uuid(), createdAt: z.string().min(1), updatedAt: z.string().min(1) }).strict();
export type ProfileVariantRecord = z.infer<typeof profileVariantRecordSchema>;
export const profileVariantUpdateSchema = profileVariantInputSchema.omit({ itemId: true }).extend({ id: z.string().uuid() }).strict();
export type ProfileVariantUpdate = z.infer<typeof profileVariantUpdateSchema>;
export const profileVariantListSchema = z.array(profileVariantRecordSchema);
export interface ProfileVariantDesktopApi { readonly profileVariants: { readonly list: () => Promise<ProfileVariantRecord[]>; readonly create: (input: ProfileVariantInput) => Promise<ProfileVariantRecord[]>; readonly update: (input: ProfileVariantUpdate) => Promise<ProfileVariantRecord[]>; readonly remove: (variantId: string) => Promise<ProfileVariantRecord[]>; }; }
