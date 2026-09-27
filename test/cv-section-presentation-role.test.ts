// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCvTemplate,
  createWorkingCv,
  listDocumentCollections,
  saveWorkingCvAsTemplate,
  updateWorkingCv,
} from "../src/main/document-domain-service";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-cv-section-role-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("CV section presentation-role ownership", () => {
  it("defaults profile composition to Main and preserves template roles independently of Working CV edits", () => {
    const root = workspace();
    try {
      const profileItem = addProfileItem(root, {
        kind: "experience",
        title: "Platform Engineer",
      }).items[0];
      if (!profileItem) throw new Error("Profile item missing");

      const fromProfile = createWorkingCv(root, {
        title: "Profile CV",
        candidatureId: null,
        source: { kind: "profile" },
      });
      expect(fromProfile.sections).not.toHaveLength(0);
      expect(fromProfile.sections.every((section) => section.presentationRole === "main")).toBe(true);

      const template = createCvTemplate(root, {
        name: "Secondary experience template",
        sections: [{
          id: crypto.randomUUID(),
          name: "Experience",
          presentationRole: "secondary",
          items: [{
            id: crypto.randomUUID(),
            sourceMode: "current",
            profileItemId: profileItem.id,
          }],
        }],
      }).templates.find((candidate) => candidate.name === "Secondary experience template");
      if (!template) throw new Error("Template missing");

      const fromTemplate = createWorkingCv(root, {
        title: "Template CV",
        candidatureId: null,
        source: { kind: "template", templateId: template.id },
      });
      expect(fromTemplate.sections[0]?.presentationRole).toBe("secondary");

      const edited = updateWorkingCv(root, {
        id: fromTemplate.id,
        title: fromTemplate.title,
        language: fromTemplate.language,
        sections: fromTemplate.sections.map((section) => ({
          ...section,
          presentationRole: "main" as const,
        })),
      });
      expect(edited.sections[0]?.presentationRole).toBe("main");
      expect(
        listDocumentCollections(root).templates.find((candidate) => candidate.id === template.id)
          ?.sections[0]?.presentationRole,
      ).toBe("secondary");

      const copiedTemplate = saveWorkingCvAsTemplate(root, {
        workingCvId: edited.id,
        name: "Copied role template",
      });
      expect(copiedTemplate.sections[0]?.presentationRole).toBe("main");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
