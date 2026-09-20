// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createCvTemplate } from "../src/main/document-domain-service";
import { addProfileItem, getProfile, removeProfileItem } from "../src/main/profile-service";
import {
  createProfileVariant,
  listProfileVariants,
  removeProfileVariant,
} from "../src/main/profile-variant-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-template-reference-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("CV template reusable-source integrity", () => {
  it("does not remove My information while a template uses that item", () => {
    const root = workspace();
    try {
      const item = addProfileItem(root, {
        kind: "experience",
        title: "Platform Engineer",
        description: "Built resilient services.",
      }).items[0];
      if (!item) throw new Error("Profile item missing");

      createCvTemplate(root, {
        name: "Platform template",
        sections: [{
          id: crypto.randomUUID(),
          name: "Experience",
          items: [{ id: crypto.randomUUID(), sourceMode: "current", profileItemId: item.id }],
        }],
      });

      expect(() => removeProfileItem(root, item.id)).toThrow(/used by a reusable CV template/i);
      expect(getProfile(root).items.map((candidate) => candidate.id)).toContain(item.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not remove an item-level variant while a template uses that variant", () => {
    const root = workspace();
    try {
      const item = addProfileItem(root, {
        kind: "experience",
        title: "Platform Engineer",
        description: "Built resilient services.",
      }).items[0];
      if (!item) throw new Error("Profile item missing");
      const variant = createProfileVariant(root, {
        itemId: item.id,
        name: "Leadership wording",
        content: {
          title: "Platform Engineering Lead",
          description: "Led resilient-service delivery.",
        },
      });

      createCvTemplate(root, {
        name: "Leadership template",
        sections: [{
          id: crypto.randomUUID(),
          name: "Experience",
          items: [{
            id: crypto.randomUUID(),
            sourceMode: "variant",
            profileItemId: item.id,
            profileVariantId: variant.id,
          }],
        }],
      });

      expect(() => removeProfileVariant(root, variant.id)).toThrow(/used by a reusable CV template/i);
      expect(listProfileVariants(root).map((candidate) => candidate.id)).toContain(variant.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
