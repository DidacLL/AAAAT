// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import {
  createCoverLetter,
  createWorkingCv,
  listDocumentCollections,
  saveWorkingCvAsTemplate,
  saveWorkingCvItem,
  updateWorkingCv,
} from "../src/main/document-domain-service";
import { addProfileItem, getProfile } from "../src/main/profile-service";
import { listProfileVariants } from "../src/main/profile-variant-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-document-domain-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("explicit document domain", () => {
  it("creates an application-owned Working CV and letter without candidature document associations", () => {
    const root = workspace();
    try {
      addProfileItem(root, {
        kind: "experience",
        title: "Backend Engineer",
        description: "Built APIs and data services.",
      });
      const candidature = createCandidature(root, { values: [] });

      const working = createWorkingCv(root, {
        title: "Application CV",
        candidatureId: candidature.id,
        source: { kind: "profile" },
      });
      const letter = createCoverLetter(root, {
        candidatureId: candidature.id,
        title: "Application letter",
        bodyParagraphs: ["I am interested in this role."],
      });

      expect(working.candidatureId).toBe(candidature.id);
      expect(working.sections.flatMap((section) => section.items)).toHaveLength(1);
      expect(letter.candidatureId).toBe(candidature.id);

      const collections = listDocumentCollections(root);
      expect(collections.workingCvs.map((item) => item.id)).toContain(working.id);
      expect(collections.letters.map((item) => item.id)).toContain(letter.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps document-local wording local until an explicit ownership action", () => {
    const root = workspace();
    try {
      const profileItem = addProfileItem(root, {
        kind: "experience",
        title: "Backend Engineer",
        description: "Built APIs.",
      }).items[0];
      if (!profileItem) throw new Error("Profile item missing");
      const working = createWorkingCv(root, {
        title: "Standalone CV",
        candidatureId: null,
        source: { kind: "profile" },
      });
      const section = working.sections[0];
      const item = section?.items[0];
      if (!section || !item) throw new Error("Working CV item missing");

      const overridden = updateWorkingCv(root, {
        id: working.id,
        title: working.title,
        language: working.language,
        sections: [{
          ...section,
          items: [{
            ...item,
            sourceMode: "override",
            profileVariantId: null,
            content: { ...item.content, title: "Senior Backend Engineer", description: "Led API delivery." },
          }],
        }],
      });

      expect(getProfile(root).items[0]?.title).toBe("Backend Engineer");
      expect(overridden.sections[0]?.items[0]?.content.title).toBe("Senior Backend Engineer");

      saveWorkingCvItem(root, {
        workingCvId: working.id,
        itemId: item.id,
        target: "profile_variant",
        variantName: "Senior wording",
      });
      expect(listProfileVariants(root)).toEqual([
        expect.objectContaining({
          itemId: profileItem.id,
          name: "Senior wording",
          content: expect.objectContaining({ title: "Senior Backend Engineer" }),
        }),
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("saves Working CV composition as a reusable template", () => {
    const root = workspace();
    try {
      addProfileItem(root, { kind: "skill", title: "TypeScript", description: "Production TypeScript." });
      const working = createWorkingCv(root, {
        title: "Reusable CV",
        candidatureId: null,
        source: { kind: "profile" },
      });

      const template = saveWorkingCvAsTemplate(root, { workingCvId: working.id, name: "Backend template" });
      expect(template.name).toBe("Backend template");
      expect(template.sections).toHaveLength(working.sections.length);
      expect(listDocumentCollections(root).templates.map((item) => item.id)).toContain(template.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
