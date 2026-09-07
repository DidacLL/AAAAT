// @vitest-environment node

import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { exportCombinedDocumentProject } from "../src/main/combined-document-service";
import {
  createDocument,
  exportDocumentProject,
  renderDocument,
  updateDocument,
} from "../src/main/document-service";
import { addProfileItem, createProfileVariant } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";
const latexIt = process.env.AAAAT_LATEX_TEST === "1" ? it : it.skip;

latexIt(
  "renders multilingual user-owned sources with pdfLaTeX and compiles after unrelated-directory export",
  async () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-latex-workspace-"));
    const exportRoot = mkdtempSync(path.join(tmpdir(), "aaaat-latex-export-"));
    try {
      createOrOpenWorkspace(root);
      addProfileItem(root, {
        kind: "summary",
        title: "Ingeniería de plataforma R&D_50% & #1",
        description:
          "Diseñé herramientas fiables en España y Montréal con {LaTeX}, $special$, C:\\tools, ^carets^ y ~tildes~.",
      });
      const profile = createProfileVariant(root, {
        name: "Portátil",
        focus: "Documentos portátiles",
        targetTags: ["latex"],
        preferredLanguage: "es",
      });
      const variant = profile.variants[0];
      if (!variant) throw new Error("Expected profile variant");

      let document = createDocument(root, {
        kind: "cv",
        title: "Currículum portátil",
        variantId: variant.id,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      appendFileSync(document.sourcePath, "\n% user blueprint portability edit\n", "utf8");
      appendFileSync(
        path.join(document.projectPath, "aaaat.sty"),
        "\n% user package portability edit\n",
        "utf8",
      );

      const rendered = await renderDocument(root, document.id);
      expect(existsSync(rendered.artifactPath)).toBe(true);

      document = updateDocument(root, {
        id: document.id,
        title: document.title,
        language: "es",
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      await renderDocument(root, document.id);
      const exported = exportDocumentProject(root, document.id, exportRoot);
      rmSync(path.join(exported, "build"), { recursive: true, force: true });

      for (const file of ["main.tex", "data.tex", "aaaat.sty"]) {
        const source = readFileSync(path.join(exported, file), "utf8");
        expect(source).not.toContain(root);
        expect(source).not.toContain(exportRoot);
      }
      const exportedData = readFileSync(path.join(exported, "data.tex"), "utf8");
      expect(exportedData).toContain("Currículum portátil");
      expect(exportedData).toContain("Ingeniería de plataforma");
      expect(exportedData).toContain("Diseñé herramientas fiables en España y Montréal");
      expect(readFileSync(path.join(exported, "main.tex"), "utf8")).toContain(
        "% user blueprint portability edit",
      );
      expect(readFileSync(path.join(exported, "aaaat.sty"), "utf8")).toContain(
        "% user package portability edit",
      );

      const compiled = spawnSync(
        "latexmk",
        [
          "-pdf",
          "-interaction=nonstopmode",
          "-halt-on-error",
          "-outdir=build",
          "main.tex",
        ],
        { cwd: exported, encoding: "utf8" },
      );
      expect(compiled.error).toBeUndefined();
      expect(compiled.status, compiled.stdout + compiled.stderr).toBe(0);
      expect(existsSync(path.join(exported, "build", "main.pdf"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(exportRoot, { recursive: true, force: true });
    }
  },
  60_000,
);

latexIt(
  "combines a cover letter and CV into a portable packet that recompiles after another copy",
  async () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-combined-latex-workspace-"));
    const exportRoot = mkdtempSync(path.join(tmpdir(), "aaaat-combined-latex-export-"));
    const copyRoot = mkdtempSync(path.join(tmpdir(), "aaaat-combined-latex-copy-"));
    try {
      createOrOpenWorkspace(root);
      addProfileItem(root, {
        kind: "summary",
        title: "Portable combined profile",
        description: "One source of truth for both application documents.",
      });
      const cv = createDocument(root, {
        kind: "cv",
        title: "Combined portable CV",
        variantId: null,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      const coverLetter = createDocument(root, {
        kind: "cover_letter",
        title: "Combined portable cover letter",
        variantId: null,
        engine: "pdflatex",
        recipient: "Hiring team",
        subject: "Portable application",
        bodyParagraphs: ["This cover letter is combined with the CV."],
      });
      appendFileSync(cv.sourcePath, "\n% combined cv blueprint edit\n", "utf8");
      appendFileSync(
        path.join(coverLetter.projectPath, "aaaat.sty"),
        "\n% combined cover package edit\n",
        "utf8",
      );

      const exported = await exportCombinedDocumentProject(
        root,
        { cvDocumentId: cv.id, coverLetterDocumentId: coverLetter.id },
        exportRoot,
        60_000,
      );
      expect(existsSync(path.join(exported, "build", "main.pdf"))).toBe(true);
      expect(readFileSync(path.join(exported, "cv", "main.tex"), "utf8")).toContain(
        "% combined cv blueprint edit",
      );
      expect(readFileSync(path.join(exported, "cover-letter", "aaaat.sty"), "utf8")).toContain(
        "% combined cover package edit",
      );
      const wrapper = readFileSync(path.join(exported, "main.tex"), "utf8");
      expect(wrapper).not.toContain(root);
      expect(wrapper).not.toContain(exportRoot);
      expect(wrapper.indexOf("cover-letter/build/main.pdf")).toBeLessThan(
        wrapper.indexOf("cv/build/main.pdf"),
      );

      const copied = path.join(copyRoot, "application-packet");
      cpSync(exported, copied, { recursive: true });
      rmSync(path.join(copied, "build"), { recursive: true, force: true });
      const compiled = spawnSync(
        "latexmk",
        [
          "-pdf",
          "-interaction=nonstopmode",
          "-halt-on-error",
          "-outdir=build",
          "main.tex",
        ],
        { cwd: copied, encoding: "utf8" },
      );
      expect(compiled.error).toBeUndefined();
      expect(compiled.status, compiled.stdout + compiled.stderr).toBe(0);
      expect(existsSync(path.join(copied, "build", "main.pdf"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(exportRoot, { recursive: true, force: true });
      rmSync(copyRoot, { recursive: true, force: true });
    }
  },
  120_000,
);
