// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  addProfileItem,
  configureProfileVariantItem,
  createProfileVariant,
  getProfile,
  reorderProfileVariant,
  resolveProfileVariant,
  updateProfileItem,
} from "../src/main/profile-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-profile-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("canonical profile and focused variants", () => {
  it("stores only variant differences while resolving exclusion, override, and order", () => {
    const root = temporaryWorkspace();

    try {
      let snapshot = addProfileItem(root, {
        kind: "identity",
        title: "Canonical name",
        subtitle: "Platform engineer",
      });
      snapshot = addProfileItem(root, {
        kind: "experience",
        title: "Earlier role",
        description: "Canonical role details",
      });
      snapshot = addProfileItem(root, {
        kind: "project",
        title: "Relevant project",
        description: "Canonical project details",
      });

      const identity = snapshot.items.find(
        (item) => item.title === "Canonical name",
      );
      const experience = snapshot.items.find(
        (item) => item.title === "Earlier role",
      );
      const project = snapshot.items.find(
        (item) => item.title === "Relevant project",
      );
      expect(identity && experience && project).toBeTruthy();
      if (!identity || !experience || !project) {
        return;
      }

      snapshot = createProfileVariant(root, {
        name: "Platform focus",
        focus: "Emphasize platform engineering",
        targetTags: ["platform", "typescript"],
        preferredLanguage: "en",
      });
      const variant = snapshot.variants[0];
      expect(variant).toBeDefined();
      if (!variant) {
        return;
      }

      configureProfileVariantItem(root, {
        variantId: variant.id,
        itemId: experience.id,
        included: false,
      });
      configureProfileVariantItem(root, {
        variantId: variant.id,
        itemId: identity.id,
        included: true,
        contentPatch: { title: "Focused name" },
      });
      reorderProfileVariant(root, {
        variantId: variant.id,
        itemIds: [project.id, identity.id, experience.id],
      });

      const resolved = resolveProfileVariant(root, variant.id);
      expect(resolved.items.map((item) => item.title)).toEqual([
        "Relevant project",
        "Focused name",
      ]);

      const canonical = getProfile(root);
      expect(
        canonical.items.find((item) => item.id === identity.id)?.title,
      ).toBe("Canonical name");
      expect(
        canonical.items.find((item) => item.id === experience.id)?.title,
      ).toBe("Earlier role");

      const database = new DatabaseSync(path.join(root, "workspace.sqlite"), {
        readOnly: true,
      });
      try {
        const rules = database
          .prepare(
            `SELECT item_id AS itemId, excluded,
                    content_patch_json AS contentPatchJson,
                    order_rank AS orderRank
               FROM profile_variant_item_rules
              WHERE variant_id = ?
              ORDER BY item_id`,
          )
          .all(variant.id);
        expect(rules).toHaveLength(3);
        expect(
          rules.find(
            (row) =>
              (row as { itemId: string }).itemId === identity.id,
          ),
        ).toMatchObject({
          excluded: 0,
          contentPatchJson: JSON.stringify({ title: "Focused name" }),
          orderRank: 1,
        });
        expect(
          rules.find(
            (row) =>
              (row as { itemId: string }).itemId === experience.id,
          ),
        ).toMatchObject({ excluded: 1, contentPatchJson: null, orderRank: 2 });
      } finally {
        database.close();
      }

      snapshot = updateProfileItem(root, {
        id: identity.id,
        item: {
          kind: identity.kind,
          title: "Focused name",
          subtitle: identity.subtitle,
        },
      });
      const normalizedRule = snapshot.variants[0]?.rules.find(
        (rule) => rule.itemId === identity.id,
      );
      expect(normalizedRule?.contentPatch).toBeNull();
      expect(normalizedRule?.orderRank).toBe(1);

      openWorkspace(root);
      expect(
        resolveProfileVariant(root, variant.id).items.map((item) => item.title),
      ).toEqual(["Relevant project", "Focused name"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects conflicting mutations before authoritative state changes", () => {
    const root = temporaryWorkspace();

    try {
      let snapshot = addProfileItem(root, {
        kind: "summary",
        title: "Summary",
        description: "Canonical summary",
      });
      snapshot = addProfileItem(root, {
        kind: "skill",
        title: "TypeScript",
      });
      snapshot = createProfileVariant(root, {
        name: "Focused",
        focus: "",
        targetTags: [],
      });

      const variant = snapshot.variants[0];
      const itemIds = snapshot.items.map((item) => item.id);
      expect(variant).toBeDefined();
      expect(itemIds).toHaveLength(2);
      if (!variant || itemIds.length !== 2) {
        return;
      }

      const before = getProfile(root);
      expect(() =>
        reorderProfileVariant(root, {
          variantId: variant.id,
          itemIds: [itemIds[0], itemIds[0]],
        }),
      ).toThrow(
        "Variant ordering must contain every canonical profile item exactly once.",
      );
      expect(getProfile(root)).toEqual(before);

      expect(() =>
        createProfileVariant(root, {
          name: "focused",
          focus: "duplicate name",
          targetTags: [],
        }),
      ).toThrow("A profile variant already uses that name.");
      expect(getProfile(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
