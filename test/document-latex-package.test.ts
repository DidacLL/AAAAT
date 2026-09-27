// @vitest-environment node

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { BUILTIN_BLUEPRINT_SOURCE } from "../src/main/document-blueprints";
import {
  writeCoverLetterLatexProject,
  writeCvLatexProject,
} from "../src/main/document-latex";
import type {
  CoverLetterSnapshot,
  WorkingCvRecord,
} from "../src/shared/document-domain-contracts";

const temporaryRoots: string[] = [];

function temporaryProject(prefix: string): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

function source(project: string, name: string): string {
  return readFileSync(path.join(project, name), "utf8");
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("portable LaTeX Blueprint/package boundary", () => {
  it("keeps CV data content-oriented while one retained Blueprint owns presentation", () => {
    const now = new Date().toISOString();
    const working: WorkingCvRecord = {
      id: crypto.randomUUID(),
      title: "Portable CV",
      language: "ca-ES / fr-FR",
      sourceTemplateId: null,
      candidatureId: null,
      sections: [
        {
          id: crypto.randomUUID(),
          name: "Experience",
          items: [
            {
              id: crypto.randomUUID(),
              templateItemId: null,
              sourceMode: "custom",
              profileItemId: null,
              profileVariantId: null,
              content: {
                kind: "experience",
                title: "Platform engineer",
                description: "Portable content only.",
              },
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          name: "Skills",
          items: [
            {
              id: crypto.randomUUID(),
              templateItemId: null,
              sourceMode: "custom",
              profileItemId: null,
              profileVariantId: null,
              content: {
                kind: "skill",
                title: "TypeScript and TeX",
              },
            },
          ],
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const project = temporaryProject("aaaat-cv-package-");
    writeCvLatexProject(project, working, BUILTIN_BLUEPRINT_SOURCE);

    const data = source(project, "data.tex");
    const main = source(project, "main.tex");
    const blueprint = source(project, "blueprint.tex");
    const style = source(project, "aaaat.sty");

    expect(data).toContain("\\AAAATDocumentKind{cv}");
    expect(data).toContain("\\AAAATDocumentLanguage{catalan}");
    expect(data).toContain("\\AAAATBlock{Experience}{");
    expect(data).toContain("\\AAAATBlock{Skills}{");
    expect(data).not.toContain("\\AAAATMetadata{Language}");
    expect(data).not.toContain("textwidth");
    expect(data).not.toContain("minipage");

    expect(main.trim()).toBe("\\input{blueprint.tex}");
    expect(blueprint).toContain("\\AAAATIfDocumentKindTF{cv}");
    expect(blueprint).toContain("\\AAAATTwoRegionBody");
    expect(blueprint).toContain("\\AAAATRenderLetter");

    expect(style).toContain("\\ProvidesExplPackage");
    expect(style).toContain("\\AAAATDocumentKind");
    expect(style).toContain("\\AAAATIfDocumentKindTF");
    expect(style).toContain("\\AAAATBlock");
    expect(style).toContain("\\babelprovide");
  });

  it("uses the same Blueprint contract and Babel seam for cover letters", () => {
    const letter: CoverLetterSnapshot = {
      candidatureId: null,
      title: "Lettre portable",
      language: "fr-FR",
      recipient: "Équipe R&D",
      subject: "Candidature",
      bodyParagraphs: ["Bonjour.", "Contenu portable."],
      closing: "Cordialement",
    };

    const project = temporaryProject("aaaat-letter-package-");
    writeCoverLetterLatexProject(project, letter, BUILTIN_BLUEPRINT_SOURCE);

    const data = source(project, "data.tex");
    const blueprint = source(project, "blueprint.tex");

    expect(data).toContain("\\AAAATDocumentKind{letter}");
    expect(data).toContain("\\AAAATDocumentLanguage{french}");
    expect(data).not.toContain("\\AAAATMetadata{Language}");
    expect(blueprint.indexOf("\\input{data.tex}")).toBeLessThan(blueprint.indexOf("\\begin{document}"));
    expect(blueprint).toContain("\\AAAATRenderLetter");
  });
});
