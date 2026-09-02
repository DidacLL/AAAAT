import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  profileItemContentPatchSchema,
  profileItemInputSchema,
  profileItemSchema,
  profileItemUpdateSchema,
  profileSnapshotSchema,
  profileVariantInputSchema,
  profileVariantItemRuleInputSchema,
  profileVariantReorderSchema,
  profileVariantSchema,
  profileVariantUpdateSchema,
  resolvedProfileSchema,
  type ProfileItem,
  type ProfileItemContentPatch,
  type ProfileItemInput,
  type ProfileItemUpdate,
  type ProfileSnapshot,
  type ProfileVariant,
  type ProfileVariantInput,
  type ProfileVariantItemRuleInput,
  type ProfileVariantReorder,
  type ProfileVariantUpdate,
  type ResolvedProfile,
} from "../shared/contracts";
import { withWorkspaceDatabase } from "./workspace";

interface ProfileItemRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly description: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly url: string | null;
  readonly sortOrder: number;
}

interface ProfileVariantRow {
  readonly id: string;
  readonly name: string;
  readonly focus: string;
  readonly targetTagsJson: string;
  readonly preferredLanguage: string | null;
}

interface ProfileVariantRuleRow {
  readonly variantId: string;
  readonly itemId: string;
  readonly excluded: number;
  readonly contentPatchJson: string | null;
  readonly orderRank: number | null;
}

interface NextOrderRow {
  readonly nextOrder: number;
}

class ProfileServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileServiceError";
  }
}

function transact(database: DatabaseSync, action: () => void): void {
  database.exec("BEGIN IMMEDIATE");
  try {
    action();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function nullable(value: string | undefined): string | null {
  return value === undefined ? null : value;
}

function optional(value: string | null): string | undefined {
  return value === null ? undefined : value;
}

function toItem(row: ProfileItemRow): ProfileItem {
  return profileItemSchema.parse({
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: optional(row.subtitle),
    description: optional(row.description),
    startDate: optional(row.startDate),
    endDate: optional(row.endDate),
    url: optional(row.url),
    sortOrder: row.sortOrder,
  });
}

function readItems(database: DatabaseSync): ProfileItem[] {
  const rows = database
    .prepare(
      `SELECT id, kind, title, subtitle, description,
              start_date AS startDate, end_date AS endDate,
              url, sort_order AS sortOrder
         FROM profile_items
        ORDER BY sort_order, id`,
    )
    .all() as unknown as ProfileItemRow[];
  return rows.map(toItem);
}

function parsePatch(value: string | null): ProfileItemContentPatch | null {
  if (value === null) {
    return null;
  }

  try {
    return profileItemContentPatchSchema.parse(JSON.parse(value));
  } catch {
    throw new ProfileServiceError("Stored profile variant data is invalid.");
  }
}

function readRuleRows(
  database: DatabaseSync,
  variantId?: string,
): ProfileVariantRuleRow[] {
  const statement = variantId
    ? database.prepare(
        `SELECT variant_id AS variantId, item_id AS itemId,
                excluded, content_patch_json AS contentPatchJson,
                order_rank AS orderRank
           FROM profile_variant_item_rules
          WHERE variant_id = ?
          ORDER BY item_id`,
      )
    : database.prepare(
        `SELECT variant_id AS variantId, item_id AS itemId,
                excluded, content_patch_json AS contentPatchJson,
                order_rank AS orderRank
           FROM profile_variant_item_rules
          ORDER BY variant_id, item_id`,
      );

  return (variantId ? statement.all(variantId) : statement.all()) as unknown as ProfileVariantRuleRow[];
}

function readVariants(database: DatabaseSync): ProfileVariant[] {
  const rows = database
    .prepare(
      `SELECT id, name, focus, target_tags_json AS targetTagsJson,
              preferred_language AS preferredLanguage
         FROM profile_variants
        ORDER BY name COLLATE NOCASE, id`,
    )
    .all() as unknown as ProfileVariantRow[];
  const rules = readRuleRows(database);

  return rows.map((row) => {
    let targetTags: unknown;
    try {
      targetTags = JSON.parse(row.targetTagsJson);
    } catch {
      throw new ProfileServiceError("Stored profile variant data is invalid.");
    }

    return profileVariantSchema.parse({
      id: row.id,
      name: row.name,
      focus: row.focus,
      targetTags,
      preferredLanguage: optional(row.preferredLanguage),
      rules: rules
        .filter((rule) => rule.variantId === row.id)
        .map((rule) => ({
          itemId: rule.itemId,
          excluded: rule.excluded === 1,
          contentPatch: parsePatch(rule.contentPatchJson),
          orderRank: rule.orderRank,
        })),
    });
  });
}

function readSnapshot(database: DatabaseSync): ProfileSnapshot {
  return profileSnapshotSchema.parse({
    items: readItems(database),
    variants: readVariants(database),
  });
}

function requireItem(database: DatabaseSync, itemId: string): ProfileItem {
  const row = database
    .prepare(
      `SELECT id, kind, title, subtitle, description,
              start_date AS startDate, end_date AS endDate,
              url, sort_order AS sortOrder
         FROM profile_items
        WHERE id = ?`,
    )
    .get(itemId) as unknown as ProfileItemRow | undefined;

  if (!row) {
    throw new ProfileServiceError("The profile item no longer exists.");
  }

  return toItem(row);
}

function requireVariant(database: DatabaseSync, variantId: string): void {
  const row = database
    .prepare("SELECT 1 AS present FROM profile_variants WHERE id = ?")
    .get(variantId);
  if (!row) {
    throw new ProfileServiceError("The profile variant no longer exists.");
  }
}

function recordActivity(
  database: DatabaseSync,
  action: string,
  entityType: "item" | "variant",
  entityId: string,
  occurredAt: string,
): void {
  database
    .prepare(
      `INSERT INTO profile_activity(occurred_at, action, entity_type, entity_id)
       VALUES (?, ?, ?, ?)`,
    )
    .run(occurredAt, action, entityType, entityId);
}

function nextSortOrder(database: DatabaseSync): number {
  const row = database
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM profile_items",
    )
    .get() as unknown as NextOrderRow;
  return row.nextOrder;
}

const patchKeys = [
  "title",
  "subtitle",
  "description",
  "startDate",
  "endDate",
  "url",
] as const;

function normalizePatch(
  item: ProfileItem,
  patch: ProfileItemContentPatch,
): ProfileItemContentPatch | null {
  const normalized: Record<string, string> = {};

  for (const key of patchKeys) {
    const patchedValue = patch[key];
    if (patchedValue !== undefined && patchedValue !== item[key]) {
      normalized[key] = patchedValue;
    }
  }

  return Object.keys(normalized).length === 0
    ? null
    : profileItemContentPatchSchema.parse(normalized);
}

function readRule(
  database: DatabaseSync,
  variantId: string,
  itemId: string,
): ProfileVariantRuleRow | null {
  return (
    (database
      .prepare(
        `SELECT variant_id AS variantId, item_id AS itemId,
                excluded, content_patch_json AS contentPatchJson,
                order_rank AS orderRank
           FROM profile_variant_item_rules
          WHERE variant_id = ? AND item_id = ?`,
      )
      .get(variantId, itemId) as unknown as ProfileVariantRuleRow | undefined) ??
    null
  );
}

function persistRule(
  database: DatabaseSync,
  variantId: string,
  itemId: string,
  excluded: boolean,
  contentPatch: ProfileItemContentPatch | null,
  orderRank: number | null,
): void {
  if (!excluded && contentPatch === null && orderRank === null) {
    database
      .prepare(
        "DELETE FROM profile_variant_item_rules WHERE variant_id = ? AND item_id = ?",
      )
      .run(variantId, itemId);
    return;
  }

  database
    .prepare(
      `INSERT INTO profile_variant_item_rules(
         variant_id, item_id, excluded, content_patch_json, order_rank
       ) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(variant_id, item_id) DO UPDATE SET
         excluded = excluded.excluded,
         content_patch_json = excluded.content_patch_json,
         order_rank = excluded.order_rank`,
    )
    .run(
      variantId,
      itemId,
      excluded ? 1 : 0,
      contentPatch === null ? null : JSON.stringify(contentPatch),
      orderRank,
    );
}

function orderedItemsForVariant(
  database: DatabaseSync,
  variantId: string,
  includeExcluded: boolean,
): ProfileItem[] {
  requireVariant(database, variantId);
  const items = readItems(database);
  const canonicalRank = new Map(items.map((item, index) => [item.id, index]));
  const rules = new Map(
    readRuleRows(database, variantId).map((rule) => [rule.itemId, rule]),
  );

  return items
    .filter((item) => includeExcluded || rules.get(item.id)?.excluded !== 1)
    .map((item) => {
      const rule = rules.get(item.id);
      const patch = parsePatch(rule?.contentPatchJson ?? null);
      return patch === null ? item : profileItemSchema.parse({ ...item, ...patch });
    })
    .sort((left, right) => {
      const leftRule = rules.get(left.id);
      const rightRule = rules.get(right.id);
      const leftRank = leftRule?.orderRank ?? canonicalRank.get(left.id) ?? 0;
      const rightRank = rightRule?.orderRank ?? canonicalRank.get(right.id) ?? 0;
      return leftRank - rightRank;
    });
}

function persistVariantOrder(
  database: DatabaseSync,
  variantId: string,
  itemIds: readonly string[],
): void {
  const items = readItems(database);
  const canonicalIds = items.map((item) => item.id);

  if (
    itemIds.length !== canonicalIds.length ||
    new Set(itemIds).size !== itemIds.length ||
    canonicalIds.some((id) => !itemIds.includes(id))
  ) {
    throw new ProfileServiceError(
      "Variant ordering must contain every canonical profile item exactly once.",
    );
  }

  for (const [desiredRank, itemId] of itemIds.entries()) {
    const canonicalRank = canonicalIds.indexOf(itemId);
    const existing = readRule(database, variantId, itemId);
    persistRule(
      database,
      variantId,
      itemId,
      existing?.excluded === 1,
      parsePatch(existing?.contentPatchJson ?? null),
      desiredRank === canonicalRank ? null : desiredRank,
    );
  }
}

export function getProfile(rootPath: string): ProfileSnapshot {
  return withWorkspaceDatabase(rootPath, readSnapshot);
}

export function addProfileItem(
  rootPath: string,
  input: ProfileItemInput,
): ProfileSnapshot {
  const item = profileItemInputSchema.parse(input);

  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();

    transact(database, () => {
      database
        .prepare(
          `INSERT INTO profile_items(
             id, kind, title, subtitle, description, start_date, end_date,
             url, sort_order, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          item.kind,
          item.title,
          nullable(item.subtitle),
          nullable(item.description),
          nullable(item.startDate),
          nullable(item.endDate),
          nullable(item.url),
          nextSortOrder(database),
          now,
          now,
        );
      recordActivity(database, "item.added", "item", id, now);
    });

    return readSnapshot(database);
  });
}

export function updateProfileItem(
  rootPath: string,
  input: ProfileItemUpdate,
): ProfileSnapshot {
  const update = profileItemUpdateSchema.parse(input);

  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();

    transact(database, () => {
      requireItem(database, update.id);
      database
        .prepare(
          `UPDATE profile_items
              SET kind = ?, title = ?, subtitle = ?, description = ?,
                  start_date = ?, end_date = ?, url = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(
          update.item.kind,
          update.item.title,
          nullable(update.item.subtitle),
          nullable(update.item.description),
          nullable(update.item.startDate),
          nullable(update.item.endDate),
          nullable(update.item.url),
          now,
          update.id,
        );

      const updatedItem = requireItem(database, update.id);
      for (const rule of readRuleRows(database).filter(
        (candidate) => candidate.itemId === update.id,
      )) {
        const patch = parsePatch(rule.contentPatchJson);
        persistRule(
          database,
          rule.variantId,
          rule.itemId,
          rule.excluded === 1,
          patch === null ? null : normalizePatch(updatedItem, patch),
          rule.orderRank,
        );
      }

      recordActivity(database, "item.updated", "item", update.id, now);
    });

    return readSnapshot(database);
  });
}

export function removeProfileItem(
  rootPath: string,
  itemId: string,
): ProfileSnapshot {
  const validatedId = profileItemSchema.shape.id.parse(itemId);

  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();

    transact(database, () => {
      requireItem(database, validatedId);
      const variants = readVariants(database);
      const previousOrders = new Map(
        variants.map((variant) => [
          variant.id,
          orderedItemsForVariant(database, variant.id, true).map(
            (item) => item.id,
          ),
        ]),
      );

      database.prepare("DELETE FROM profile_items WHERE id = ?").run(validatedId);

      for (const variant of variants) {
        const remainingOrder = (previousOrders.get(variant.id) ?? []).filter(
          (id) => id !== validatedId,
        );
        if (remainingOrder.length > 0) {
          persistVariantOrder(database, variant.id, remainingOrder);
        }
      }

      recordActivity(database, "item.removed", "item", validatedId, now);
    });

    return readSnapshot(database);
  });
}

function assertVariantNameAvailable(
  database: DatabaseSync,
  name: string,
  excludingId?: string,
): void {
  const row = excludingId
    ? database
        .prepare(
          "SELECT id FROM profile_variants WHERE name = ? COLLATE NOCASE AND id <> ?",
        )
        .get(name, excludingId)
    : database
        .prepare("SELECT id FROM profile_variants WHERE name = ? COLLATE NOCASE")
        .get(name);

  if (row) {
    throw new ProfileServiceError("A profile variant already uses that name.");
  }
}

export function createProfileVariant(
  rootPath: string,
  input: ProfileVariantInput,
): ProfileSnapshot {
  const variant = profileVariantInputSchema.parse(input);

  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();

    transact(database, () => {
      assertVariantNameAvailable(database, variant.name);
      database
        .prepare(
          `INSERT INTO profile_variants(
             id, name, focus, target_tags_json, preferred_language,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          variant.name,
          variant.focus,
          JSON.stringify([...new Set(variant.targetTags)]),
          nullable(variant.preferredLanguage),
          now,
          now,
        );
      recordActivity(database, "variant.created", "variant", id, now);
    });

    return readSnapshot(database);
  });
}

export function updateProfileVariant(
  rootPath: string,
  input: ProfileVariantUpdate,
): ProfileSnapshot {
  const variant = profileVariantUpdateSchema.parse(input);

  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();

    transact(database, () => {
      requireVariant(database, variant.id);
      assertVariantNameAvailable(database, variant.name, variant.id);
      database
        .prepare(
          `UPDATE profile_variants
              SET name = ?, focus = ?, target_tags_json = ?,
                  preferred_language = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(
          variant.name,
          variant.focus,
          JSON.stringify([...new Set(variant.targetTags)]),
          nullable(variant.preferredLanguage),
          now,
          variant.id,
        );
      recordActivity(database, "variant.updated", "variant", variant.id, now);
    });

    return readSnapshot(database);
  });
}

export function removeProfileVariant(
  rootPath: string,
  variantId: string,
): ProfileSnapshot {
  const validatedId = profileVariantSchema.shape.id.parse(variantId);

  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();

    transact(database, () => {
      requireVariant(database, validatedId);
      database.prepare("DELETE FROM profile_variants WHERE id = ?").run(validatedId);
      recordActivity(database, "variant.removed", "variant", validatedId, now);
    });

    return readSnapshot(database);
  });
}

export function configureProfileVariantItem(
  rootPath: string,
  input: ProfileVariantItemRuleInput,
): ProfileSnapshot {
  const rule = profileVariantItemRuleInputSchema.parse(input);

  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();

    transact(database, () => {
      requireVariant(database, rule.variantId);
      const item = requireItem(database, rule.itemId);
      const existing = readRule(database, rule.variantId, rule.itemId);
      const existingPatch = parsePatch(existing?.contentPatchJson ?? null);
      const nextPatch =
        rule.contentPatch === undefined
          ? existingPatch
          : rule.contentPatch === null
            ? null
            : normalizePatch(item, rule.contentPatch);

      persistRule(
        database,
        rule.variantId,
        rule.itemId,
        !rule.included,
        nextPatch,
        existing?.orderRank ?? null,
      );
      recordActivity(
        database,
        "variant.item-configured",
        "variant",
        rule.variantId,
        now,
      );
    });

    return readSnapshot(database);
  });
}

export function reorderProfileVariant(
  rootPath: string,
  input: ProfileVariantReorder,
): ProfileSnapshot {
  const reorder = profileVariantReorderSchema.parse(input);

  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();

    transact(database, () => {
      requireVariant(database, reorder.variantId);
      persistVariantOrder(database, reorder.variantId, reorder.itemIds);
      recordActivity(
        database,
        "variant.reordered",
        "variant",
        reorder.variantId,
        now,
      );
    });

    return readSnapshot(database);
  });
}

export function resolveProfileVariant(
  rootPath: string,
  variantId: string,
): ResolvedProfile {
  const validatedId = profileVariantSchema.shape.id.parse(variantId);

  return withWorkspaceDatabase(rootPath, (database) => {
    const variant = readVariants(database).find(
      (candidate) => candidate.id === validatedId,
    );
    if (!variant) {
      throw new ProfileServiceError("The profile variant no longer exists.");
    }

    return resolvedProfileSchema.parse({
      variant,
      items: orderedItemsForVariant(database, validatedId, false),
    });
  });
}
