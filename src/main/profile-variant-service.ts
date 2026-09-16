import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import type { ProfileItemContent } from "../shared/contracts";
import {
  profileVariantInputSchema,
  profileVariantRecordSchema,
  profileVariantUpdateSchema,
  type ProfileVariantInput,
  type ProfileVariantRecord,
  type ProfileVariantUpdate,
} from "../shared/profile-variant-contracts";
import { cvTemplateReferencesProfileVariant } from "./cv-template-references";
import { withWorkspaceDatabase } from "./workspace";

interface VariantRow {
  readonly id: string;
  readonly itemId: string;
  readonly name: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly description: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly url: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class ProfileVariantServiceError extends Error {
  constructor(message: string) { super(message); this.name = "ProfileVariantServiceError"; }
}
function nullable(value: string | undefined): string | null { return value === undefined ? null : value; }
function toContent(row: VariantRow): ProfileItemContent {
  return {
    title: row.title,
    ...(row.subtitle === null ? {} : { subtitle: row.subtitle }),
    ...(row.description === null ? {} : { description: row.description }),
    ...(row.startDate === null ? {} : { startDate: row.startDate }),
    ...(row.endDate === null ? {} : { endDate: row.endDate }),
    ...(row.url === null ? {} : { url: row.url }),
  };
}
function toRecord(row: VariantRow): ProfileVariantRecord { return profileVariantRecordSchema.parse({ id: row.id, itemId: row.itemId, name: row.name, content: toContent(row), createdAt: row.createdAt, updatedAt: row.updatedAt }); }
function rows(database: DatabaseSync): VariantRow[] { return database.prepare(`SELECT id, item_id AS itemId, name, title, subtitle, description, start_date AS startDate, end_date AS endDate, url, created_at AS createdAt, updated_at AS updatedAt FROM profile_variants ORDER BY item_id, name COLLATE NOCASE, id`).all() as unknown as VariantRow[]; }
function requireItem(database: DatabaseSync, itemId: string): void { if (!database.prepare("SELECT 1 FROM profile_items WHERE id = ?").get(itemId)) throw new ProfileVariantServiceError("The My information item no longer exists."); }
function requireRow(database: DatabaseSync, id: string): VariantRow { const row = database.prepare(`SELECT id, item_id AS itemId, name, title, subtitle, description, start_date AS startDate, end_date AS endDate, url, created_at AS createdAt, updated_at AS updatedAt FROM profile_variants WHERE id = ?`).get(id) as unknown as VariantRow | undefined; if (!row) throw new ProfileVariantServiceError("The saved profile variant no longer exists."); return row; }

export function listProfileVariants(rootPath: string): ProfileVariantRecord[] { return withWorkspaceDatabase(rootPath, (database) => rows(database).map(toRecord)); }
export function getProfileVariant(rootPath: string, variantId: string): ProfileVariantRecord { return withWorkspaceDatabase(rootPath, (database) => toRecord(requireRow(database, variantId))); }
export function createProfileVariant(rootPath: string, rawInput: ProfileVariantInput): ProfileVariantRecord { const input = profileVariantInputSchema.parse(rawInput); return withWorkspaceDatabase(rootPath, (database) => { requireItem(database, input.itemId); const id = randomUUID(); const now = new Date().toISOString(); database.prepare(`INSERT INTO profile_variants(id, item_id, name, title, subtitle, description, start_date, end_date, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.itemId, input.name, input.content.title, nullable(input.content.subtitle), nullable(input.content.description), nullable(input.content.startDate), nullable(input.content.endDate), nullable(input.content.url), now, now); return toRecord(requireRow(database, id)); }); }
export function updateProfileVariant(rootPath: string, rawInput: ProfileVariantUpdate): ProfileVariantRecord { const input = profileVariantUpdateSchema.parse(rawInput); return withWorkspaceDatabase(rootPath, (database) => { requireRow(database, input.id); database.prepare(`UPDATE profile_variants SET name = ?, title = ?, subtitle = ?, description = ?, start_date = ?, end_date = ?, url = ?, updated_at = ? WHERE id = ?`).run(input.name, input.content.title, nullable(input.content.subtitle), nullable(input.content.description), nullable(input.content.startDate), nullable(input.content.endDate), nullable(input.content.url), new Date().toISOString(), input.id); return toRecord(requireRow(database, input.id)); }); }
export function removeProfileVariant(rootPath: string, variantId: string): void {
  withWorkspaceDatabase(rootPath, (database) => {
    requireRow(database, variantId);
    if (cvTemplateReferencesProfileVariant(database, variantId)) {
      throw new ProfileVariantServiceError(
        "This saved variation is used by a reusable CV template. Change the template before removing it.",
      );
    }
    database.prepare("DELETE FROM profile_variants WHERE id = ?").run(variantId);
  });
}
