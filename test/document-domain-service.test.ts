// @vitest-environment node

import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import {
  createCoverLetter,
  createWorkingCv,
  duplicateRenderedCv,
  listDocumentCollections,
  saveWorkingCvAsTemplate,
  saveWorkingCvItem,
  updateWorkingCv,
} from "../src/main/document-domain-service";
import { addProfileItem, getProfile } from "../src/main/profile-service";
import { listProfileVariants } from "../src/main/profile-variant-service";
import { createOrOpenWorkspace, withWorkspaceDatabase } from "../src/main/workspace";

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

  it("saves Working CV composition as a reusable template without flattening current My information into overrides", () => {
    const root = workspace();
    try {
      const profileItem = addProfileItem(root, {
        kind: "skill",
        title: "TypeScript",
        description: "Production TypeScript.",
      }).items[0];
      if (!profileItem) throw new Error("Profile item missing");
      const working = createWorkingCv(root, {
        title: "Reusable CV",
        candidatureId: null,
        source: { kind: "profile" },
      });

      const template = saveWorkingCvAsTemplate(root, { workingCvId: working.id, name: "Backend template" });
      expect(template.name).toBe("Backend template");
      expect(template.sections).toHaveLength(working.sections.length);
      expect(template.sections.flatMap((section) => section.items)).toEqual([
        expect.objectContaining({
          sourceMode: "current",
          profileItemId: profileItem.id,
        }),
      ]);
      expect(listDocumentCollections(root).templates.map((item) => item.id)).toContain(template.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("duplicates an immutable Rendered CV after its live reusable sources and application associations disappear", () => {
    const root = workspace();
    try {
      const profileItem = addProfileItem(root, {
        kind: "experience",
        title: "Reliability Engineer",
        description: "Operated critical services.",
      }).items[0];
      if (!profileItem) throw new Error("Profile item missing");
      const candidature = createCandidature(root, { values: [] });
      const seed = createWorkingCv(root, {
        title: "Seed CV",
        candidatureId: null,
        source: { kind: "profile" },
      });
      const template = saveWorkingCvAsTemplate(root, {
        workingCvId: seed.id,
        name: "Reliability template",
      });
      const working = createWorkingCv(root, {
        title: "Application CV",
        candidatureId: candidature.id,
        source: { kind: "template", templateId: template.id },
      });
      const renderedId = randomUUID();
      const snapshot = {
        title: working.title,
        sourceTemplateId: template.id,
        candidatureId: candidature.id,
        sections: working.sections,
      };

      withWorkspaceDatabase(root, (database) => {
        database.prepare(`INSERT INTO rendered_cvs(
          id, working_cv_id, source_template_id, candidature_id, title, language,
          snapshot_json, project_relative_path, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          renderedId,
          working.id,
          template.id,
          candidature.id,
          working.title,
          null,
          JSON.stringify(snapshot),
          `rendered-cvs/${renderedId}`,
          new Date().toISOString(),
        );
        database.prepare("DELETE FROM cv_templates WHERE id = ?").run(template.id);
        database.prepare("DELETE FROM candidatures WHERE id = ?").run(candidature.id);
        database.prepare("DELETE FROM profile_items WHERE id = ?").run(profileItem.id);
      });

      const retained = listDocumentCollections(root).renderedCvs.find((item) => item.id === renderedId);
      expect(retained).toMatchObject({
        sourceTemplateId: null,
        candidatureId: null,
        snapshot: expect.objectContaining({
          sourceTemplateId: template.id,
          candidatureId: candidature.id,
        }),
      });

      const duplicate = duplicateRenderedCv(root, renderedId);
      expect(duplicate).toMatchObject({
        title: "Application CV copy",
        sourceTemplateId: null,
        candidatureId: null,
      });
      expect(duplicate.sections.map((section) => section.name)).toEqual(
        working.sections.map((section) => section.name),
      );
      expect(duplicate.sections.flatMap((section) => section.items)).toEqual([
        expect.objectContaining({
          sourceMode: "custom",
          profileItemId: null,
          profileVariantId: null,
          content: expect.objectContaining({
            title: "Reliability Engineer",
            description: "Operated critical services.",
          }),
        }),
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
