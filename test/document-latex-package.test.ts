// @vitest-environment node

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { BUILTIN_BLUEPRINT_SOURCE } from "../src/main/document-blueprints";
import {
  resolveDocumentBabelLanguage,
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
  it("feeds semantic section roles while Blueprints decide how to present them", () => {
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
          presentationRole: "main",
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
          presentationRole: "secondary",
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
    expect(data).toContain("\\AAAATBlock{main}{Experience}{");
    expect(data).toContain("\\AAAATBlock{secondary}{Skills}{");
    expect(data.indexOf("Experience")).toBeLessThan(data.indexOf("Skills"));
    expect(data).not.toContain("\\AAAATMetadata{Language}");
    expect(data).not.toContain("textwidth");
    expect(data).not.toContain("minipage");

    expect(main.trim()).toBe("\\input{blueprint.tex}");
    expect(blueprint).toContain("\\AAAATIfDocumentKindTF{cv}");
    expect(blueprint).toContain("\\AAAATTwoRegionBody");
    expect(blueprint).toContain("\\AAAATRenderSecondaryBlocks");
    expect(blueprint).toContain("\\AAAATRenderMainBlocks");
    expect(blueprint).toContain("\\AAAATRenderLetter");

    expect(style).toContain("\\ProvidesExplPackage");
    expect(style).toContain("\\AAAATDocumentKind");
    expect(style).toContain("\\AAAATIfDocumentKindTF");
    expect(style).toContain("\\NewDocumentCommand{\\AAAATBlock}{mmm}");
    expect(style).toContain("\\AAAATRenderSecondaryBlocks");
    expect(style).not.toContain("AAAATRenderRailBlocks");
    expect(style).not.toContain("aaaat_set_block_split");
    expect(style).toContain("\\babelprovide");

    const stackedBlueprint = String.raw`\documentclass[10pt]{article}
\usepackage{aaaat}
\input{data.tex}
\begin{document}
\AAAATIfDocumentKindTF{cv}
  {\AAAATRenderMainBlocks\par\bigskip\AAAATRenderSecondaryBlocks}
  {\AAAATRenderLetter}
\end{document}
`;
    const alternateProject = temporaryProject("aaaat-alternate-role-blueprint-");
    writeCvLatexProject(alternateProject, working, stackedBlueprint);
    expect(source(alternateProject, "data.tex")).toBe(data);
    expect(source(alternateProject, "blueprint.tex")).toBe(stackedBlueprint);
    expect(stackedBlueprint.indexOf("\\AAAATRenderMainBlocks"))
      .toBeLessThan(stackedBlueprint.indexOf("\\AAAATRenderSecondaryBlocks"));
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

  it("accepts supported language names/codes and rejects unsupported supplied languages", () => {
    expect(resolveDocumentBabelLanguage(undefined)).toBe("english");

    expect(resolveDocumentBabelLanguage("English")).toBe("english");
    expect(resolveDocumentBabelLanguage("english")).toBe("english");
    expect(resolveDocumentBabelLanguage("  ENGLISH  ")).toBe("english");
    expect(resolveDocumentBabelLanguage("Catalan")).toBe("catalan");
    expect(resolveDocumentBabelLanguage("German")).toBe("german");
    expect(resolveDocumentBabelLanguage("Spanish")).toBe("spanish");
    expect(resolveDocumentBabelLanguage("French")).toBe("french");
    expect(resolveDocumentBabelLanguage("Italian")).toBe("italian");
    expect(resolveDocumentBabelLanguage("Portuguese")).toBe("portuguese");

    expect(resolveDocumentBabelLanguage("ca-ES")).toBe("catalan");
    expect(resolveDocumentBabelLanguage("de-DE")).toBe("german");
    expect(resolveDocumentBabelLanguage("en-GB")).toBe("english");
    expect(resolveDocumentBabelLanguage("es-ES")).toBe("spanish");
    expect(resolveDocumentBabelLanguage("fr-CA")).toBe("french");
    expect(resolveDocumentBabelLanguage("it-IT")).toBe("italian");
    expect(resolveDocumentBabelLanguage("pt-PT")).toBe("portuguese");
    expect(resolveDocumentBabelLanguage("ca-ES / fr-FR")).toBe("catalan");

    expect(() => resolveDocumentBabelLanguage("ja-JP")).toThrow(/Unsupported document language/);
    expect(() => resolveDocumentBabelLanguage("Japanese")).toThrow(/Unsupported document language/);
    expect(() => resolveDocumentBabelLanguage("ru-RU")).toThrow(/Unsupported document language/);
    expect(() => resolveDocumentBabelLanguage("arbitrary invalid text"))
      .toThrow(/supports these Latin-script languages through Babel: English, Catalan, German, Spanish, French, Italian, Portuguese/);
  });
});
