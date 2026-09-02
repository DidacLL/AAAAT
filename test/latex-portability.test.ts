// @vitest-environment node

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import {
  createDocument,
  exportDocumentProject,
  renderDocument,
  updateDocument,
} from "../src/main/document-service";
import { addProfileItem, createProfileVariant } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";
import type { DocumentEngine } from "../src/shared/contracts";

const latexIt = process.env.AAAAT_LATEX_TEST === "1" ? it : it.skip;

latexIt("renders with supported built-in engines and compiles after unrelated-directory export", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-latex-workspace-"));
  const exportRoot = mkdtempSync(path.join(tmpdir(), "aaaat-latex-export-"));
  try {
    createOrOpenWorkspace(root);
    addProfileItem(root, {
      kind: "summary",
      title: "R&D_50% & Platform #1",
      description: "Portable {LaTeX} source with $special$ characters.",
    });
    const profile = createProfileVariant(root, {
      name: "Portable",
      focus: "Portable documents",
      targetTags: ["latex"],
      preferredLanguage: "en",
    });
    const variant = profile.variants[0];
    if (!variant) throw new Error("Expected profile variant");

    let document = createDocument(root, {
      kind: "cv",
      title: "Portable CV",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
    });

    for (const engine of ["pdflatex", "lualatex", "xelatex"] as const satisfies readonly DocumentEngine[]) {
      document = updateDocument(root, {
        id: document.id,
        title: document.title,
        language: "en",
        engine,
        bodyParagraphs: [],
      });
      const rendered = renderDocument(root, document.id);
      expect(existsSync(rendered.artifactPath)).toBe(true);
    }

    document = updateDocument(root, {
      id: document.id,
      title: document.title,
      language: "en",
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    renderDocument(root, document.id);
    const exported = exportDocumentProject(root, document.id, exportRoot);
    rmSync(path.join(exported, "build"), { recursive: true, force: true });

    for (const file of ["main.tex", "content.tex", "aaaat.sty"]) {
      const source = readFileSync(path.join(exported, file), "utf8");
      expect(source).not.toContain(root);
      expect(source).not.toContain(exportRoot);
    }

    const compiled = spawnSync(
      "latexmk",
      ["-pdf", "-interaction=nonstopmode", "-halt-on-error", "-outdir=build", "main.tex"],
      { cwd: exported, encoding: "utf8" },
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stdout + compiled.stderr).toBe(0);
    expect(existsSync(path.join(exported, "build", "main.pdf"))).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(exportRoot, { recursive: true, force: true });
  }
});
