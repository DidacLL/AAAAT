// @vitest-environment node

import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { exportCombinedDocumentProject } from "../src/main/combined-document-service";
import { createDocument } from "../src/main/document-service";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];
const originalPath = process.env.PATH;

function temporary(prefix: string): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function workspace(): string {
  const root = temporary("aaaat-combined-workspace-");
  createOrOpenWorkspace(root);
  addProfileItem(root, {
    kind: "summary",
    title: "Platform engineer",
    description: "Builds reliable local-first software.",
  });
  return root;
}

function installFakeLatexmk(): void {
  const root = temporary("aaaat-combined-latex-");
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");\nconst path = require("node:path");\nconst cwd = process.cwd();\nif (process.env.AAAAT_TEST_COMBINED_FAIL === "1" && path.basename(cwd).startsWith(".aaaat-combined-stage-")) process.exit(9);\nfs.mkdirSync(path.join(cwd, "build"), { recursive: true });\nfs.writeFileSync(path.join(cwd, "build", "main.pdf"), "pdf:" + path.basename(cwd));\n`,
    "utf8",
  );
  const executable = path.join(root, "latexmk");
  writeFileSync(executable, `#!/usr/bin/env node\nrequire(${JSON.stringify(script)});\n`, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(path.join(root, "latexmk.cmd"), `@node "${script}" %*\r\n`, "utf8");
  process.env.PATH = `${root}${path.delimiter}${originalPath ?? ""}`;
}

function pair(root: string) {
  const cv = createDocument(root, {
    kind: "cv",
    title: "Platform CV",
    variantId: null,
    engine: "pdflatex",
    bodyParagraphs: [],
  });
  const coverLetter = createDocument(root, {
    kind: "cover_letter",
    title: "Platform cover letter",
    variantId: null,
    engine: "pdflatex",
    bodyParagraphs: ["I am applying for the platform role."],
  });
  return { cv, coverLetter };
}

afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.AAAAT_TEST_COMBINED_FAIL;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("combined document production", () => {
  it("exports the effective cover letter then CV with both complete source projects", async () => {
    const root = workspace();
    const exportRoot = temporary("aaaat-combined-export-");
    installFakeLatexmk();
    const { cv, coverLetter } = pair(root);

    appendFileSync(cv.sourcePath, "\n% user-owned cv blueprint edit\n", "utf8");
    appendFileSync(
      path.join(coverLetter.projectPath, "aaaat.sty"),
      "\n% user-owned cover package edit\n",
      "utf8",
    );
    appendFileSync(
      path.join(coverLetter.projectPath, "data.tex"),
      "\n% explicitly preserved feeder-data edit\n",
      "utf8",
    );

    const exported = await exportCombinedDocumentProject(
      root,
      { cvDocumentId: cv.id, coverLetterDocumentId: coverLetter.id },
      exportRoot,
    );

    expect(existsSync(path.join(exported, "build", "main.pdf"))).toBe(true);
    const wrapper = readFileSync(path.join(exported, "main.tex"), "utf8");
    expect(wrapper.indexOf("cover-letter/build/main.pdf")).toBeLessThan(
      wrapper.indexOf("cv/build/main.pdf"),
    );
    expect(readFileSync(path.join(exported, "cv", "main.tex"), "utf8")).toContain(
      "% user-owned cv blueprint edit",
    );
    expect(readFileSync(path.join(exported, "cover-letter", "aaaat.sty"), "utf8")).toContain(
      "% user-owned cover package edit",
    );
    expect(readFileSync(path.join(exported, "cover-letter", "data.tex"), "utf8")).toContain(
      "% explicitly preserved feeder-data edit",
    );
    expect(existsSync(path.join(exported, "cover-letter", "build", "main.pdf"))).toBe(true);
    expect(existsSync(path.join(exported, "cv", "build", "main.pdf"))).toBe(true);
  });

  it("rejects wrong document kinds before creating destination output", async () => {
    const root = workspace();
    const exportRoot = temporary("aaaat-combined-invalid-");
    installFakeLatexmk();
    const { cv, coverLetter } = pair(root);

    await expect(
      exportCombinedDocumentProject(
        root,
        { cvDocumentId: coverLetter.id, coverLetterDocumentId: cv.id },
        exportRoot,
      ),
    ).rejects.toThrow("selected CV document is not a CV");
    expect(readdirSync(exportRoot)).toEqual([]);
  });

  it("removes staged packet output when combined rendering fails", async () => {
    const root = workspace();
    const exportRoot = temporary("aaaat-combined-failure-");
    installFakeLatexmk();
    const { cv, coverLetter } = pair(root);
    process.env.AAAAT_TEST_COMBINED_FAIL = "1";

    await expect(
      exportCombinedDocumentProject(
        root,
        { cvDocumentId: cv.id, coverLetterDocumentId: coverLetter.id },
        exportRoot,
      ),
    ).rejects.toThrow("could not render the combined application packet");
    expect(readdirSync(exportRoot)).toEqual([]);
  });
});
