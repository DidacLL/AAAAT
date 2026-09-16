// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { addProfileItem } from "../src/main/profile-service";
import {
  createProfileVariant,
  getProfileVariant,
  listProfileVariants,
  removeProfileVariant,
  updateProfileVariant,
} from "../src/main/profile-variant-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-profile-variant-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("per-item profile variants", () => {
  it("stores alternate wording on one My information item", () => {
    const root = workspace();
    try {
      const item = addProfileItem(root, {
        kind: "experience",
        title: "Platform Engineer",
        description: "Built reliable APIs.",
      }).items[0];
      if (!item) throw new Error("Profile item missing");

      const created = createProfileVariant(root, {
        itemId: item.id,
        name: "Leadership emphasis",
        content: {
          title: "Lead Platform Engineer",
          description: "Led delivery of reliable APIs.",
        },
      });

      expect(created.itemId).toBe(item.id);
      expect(created.content.title).toBe("Lead Platform Engineer");
      expect(listProfileVariants(root)).toHaveLength(1);
      expect(getProfileVariant(root, created.id)).toEqual(created);

      const updated = updateProfileVariant(root, {
        id: created.id,
        name: "Staff emphasis",
        content: {
          title: "Staff Platform Engineer",
          description: "Set technical direction for reliable APIs.",
        },
      });
      expect(updated.name).toBe("Staff emphasis");
      expect(updated.content.title).toBe("Staff Platform Engineer");

      removeProfileVariant(root, created.id);
      expect(listProfileVariants(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects variants for missing My information", () => {
    const root = workspace();
    try {
      expect(() => createProfileVariant(root, {
        itemId: "00000000-0000-4000-8000-000000000999",
        name: "Missing",
        content: { title: "Missing" },
      })).toThrow("The My information item no longer exists.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
