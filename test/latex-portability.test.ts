// @vitest-environment node

import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
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
const latexIt = process.env.AAAAT_LATEX_TEST === "1" ? it : it.skip;

latexIt(
  "renders user-owned sources with pdfLaTeX and compiles after unrelated-directory export",
  async () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-latex-workspace-"));
    const exportRoot = mkdtempSync(path.join(tmpdir(), "aaaat-latex-export-"));
    try {
      createOrOpenWorkspace(root);
      addProfileItem(root, {
        kind: "summary",
        title: "R&D_50% & Platform #1",
        description:
          "Portable {LaTeX} source with $special$ characters, C:\\tools, ^carets^, and ~tildes~.",
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
        language: "en",
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
