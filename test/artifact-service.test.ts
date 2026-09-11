// @vitest-environment node

import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  captureApplicationArtifact,
  captureCombinedApplicationArtifact,
  listApplicationArtifacts,
  openApplicationArtifact,
} from "../src/main/artifact-service";
import {
  createCandidature,
  setCandidatureDocuments,
} from "../src/main/candidature-service";
import {
  createDocument,
  regenerateDocument,
  removeDocument,
  renderDocument,
  updateDocument,
} from "../src/main/document-service";
import { addProfileItem, createProfileVariant } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];
const originalPath = process.env.PATH;

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-artifact-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function installFakeLatexmk(): void {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-artifact-latex-"));
  roots.push(root);
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");\nconst path = require("node:path");\nif (process.env.AAAAT_TEST_FAIL_COMBINED === "1" && process.cwd().includes(".aaaat-combined-stage-")) process.exit(1);\nfs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });\nfs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), process.env.AAAAT_TEST_PDF || "pdf-one");\n`,
    "utf8",
  );
  const executable = path.join(root, "latexmk");
  writeFileSync(executable, `#!/usr/bin/env node\nrequire(${JSON.stringify(script)});\n`, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(path.join(root, "latexmk.cmd"), `@node "${script}" %*\r\n`, "utf8");
  process.env.PATH = `${root}${path.delimiter}${originalPath ?? ""}`;
}

afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.AAAAT_TEST_PDF;
  delete process.env.AAAAT_TEST_FAIL_COMBINED;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("application artifact service", () => {
  it("retains and opens the exact user-owned PDF by authoritative artifact ID", async () => {
    const root = workspace();
    installFakeLatexmk();
    addProfileItem(root, {
      kind: "summary",
      title: "Profile",
      description: "Original profile evidence.",
    });
    const profile = createProfileVariant(root, {
      name: "Application focus",
      focus: "Example role",
      targetTags: [],
      preferredLanguage: "en",
    });
    const variant = profile.variants[0];
    if (!variant) throw new Error("Expected profile variant");

    const document = createDocument(root, {
      kind: "cv",
      title: "Submitted CV",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    appendFileSync(document.sourcePath, "\n% submitted blueprint edit\n", "utf8");
    appendFileSync(
      path.join(document.projectPath, "aaaat.sty"),
      "\n% submitted package edit\n",
      "utf8",
    );

    const candidature = createCandidature(root, { values: [] });
    setCandidatureDocuments(root, {
      candidatureId: candidature.id,
      documentIds: [document.id],
    });

    process.env.AAAAT_TEST_PDF = "pdf-one";
    const retained = await captureApplicationArtifact(root, {
      candidatureId: candidature.id,
      documentId: document.id,
    });
    const retainedData = readFileSync(path.join(retained.projectPath, "data.tex"), "utf8");
    expect(retained).toMatchObject({
      candidatureId: candidature.id,
      kind: "cv",
      cvDocumentId: document.id,
      coverLetterDocumentId: null,
    });
    expect(readFileSync(path.join(retained.projectPath, "main.tex"), "utf8")).toContain(
      "% submitted blueprint edit",
    );
    expect(readFileSync(path.join(retained.projectPath, "aaaat.sty"), "utf8")).toContain(
      "% submitted package edit",
    );
    expect(readFileSync(retained.artifactPath, "utf8")).toBe("pdf-one");
    expect(listApplicationArtifacts(root, candidature.id)).toEqual([retained]);

    const openPath = vi.fn(async () => "");
    await expect(openApplicationArtifact(root, retained.id, openPath)).resolves.toEqual({ opened: true });
    expect(openPath).toHaveBeenCalledWith(retained.artifactPath);
    await expect(
      openApplicationArtifact(root, retained.id, async () => "platform failure"),
    ).rejects.toThrow("AAAAT could not open the retained application PDF.");
    await expect(
      openApplicationArtifact(root, "00000000-0000-4000-8000-000000000999", openPath),
    ).rejects.toThrow("The retained application artifact no longer exists.");

    updateDocument(root, {
      id: document.id,
      title: "Later edited CV",
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    regenerateDocument(root, document.id);
    process.env.AAAAT_TEST_PDF = "pdf-two";
    await renderDocument(root, document.id);

    expect(readFileSync(path.join(retained.projectPath, "data.tex"), "utf8")).toBe(retainedData);
    expect(readFileSync(retained.artifactPath, "utf8")).toBe("pdf-one");
    expect(readFileSync(document.artifactPath, "utf8")).toBe("pdf-two");

    removeDocument(root, document.id);
    expect(listApplicationArtifacts(root, candidature.id)).toEqual([
      expect.objectContaining({
        id: retained.id,
        title: "Submitted CV",
        cvDocumentId: document.id,
        coverLetterDocumentId: null,
        projectPath: retained.projectPath,
        sourcePath: retained.sourcePath,
        artifactPath: retained.artifactPath,
      }),
    ]);
    expect(readFileSync(retained.artifactPath, "utf8")).toBe("pdf-one");

    unlinkSync(retained.artifactPath);
    await expect(openApplicationArtifact(root, retained.id, openPath)).rejects.toThrow(
      "The retained application PDF is missing.",
    );
  });

  it("retains one exact combined packet with both associated contributors", async () => {
    const root = workspace();
    installFakeLatexmk();
    addProfileItem(root, {
      kind: "summary",
      title: "Profile",
      description: "Combined packet profile.",
    });
    const cv = createDocument(root, {
      kind: "cv",
      title: "Platform CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    const coverLetter = createDocument(root, {
      kind: "cover_letter",
      title: "Platform letter",
      variantId: null,
      engine: "pdflatex",
      recipient: "Hiring team",
      subject: "Application",
      bodyParagraphs: ["Hello"],
      closing: "Regards",
    });
    const candidature = createCandidature(root, { values: [] });
    setCandidatureDocuments(root, {
      candidatureId: candidature.id,
      documentIds: [cv.id, coverLetter.id],
    });

    process.env.AAAAT_TEST_PDF = "combined-pdf";
    const retained = await captureCombinedApplicationArtifact(root, {
      candidatureId: candidature.id,
      cvDocumentId: cv.id,
      coverLetterDocumentId: coverLetter.id,
    });

    expect(retained).toMatchObject({
      candidatureId: candidature.id,
      kind: "combined",
      cvDocumentId: cv.id,
      coverLetterDocumentId: coverLetter.id,
      title: "Combined: Platform letter + Platform CV",
    });
    expect(readFileSync(retained.artifactPath, "utf8")).toBe("combined-pdf");
    expect(existsSync(path.join(retained.projectPath, "cover-letter", "build", "main.pdf"))).toBe(true);
    expect(existsSync(path.join(retained.projectPath, "cv", "build", "main.pdf"))).toBe(true);
    const combinedSource = readFileSync(retained.sourcePath, "utf8");
    expect(combinedSource.indexOf("cover-letter/build/main.pdf")).toBeLessThan(
      combinedSource.indexOf("cv/build/main.pdf"),
    );
    expect(listApplicationArtifacts(root, candidature.id)).toEqual([retained]);
  });

  it("requires both combined contributors to belong to the candidature and cleans failed production", async () => {
    const root = workspace();
    installFakeLatexmk();
    const cv = createDocument(root, {
      kind: "cv",
      title: "CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    const coverLetter = createDocument(root, {
      kind: "cover_letter",
      title: "Letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: ["Hello"],
    });
    const candidature = createCandidature(root, { values: [] });
    setCandidatureDocuments(root, {
      candidatureId: candidature.id,
      documentIds: [cv.id],
    });

    await expect(
      captureCombinedApplicationArtifact(root, {
        candidatureId: candidature.id,
        cvDocumentId: cv.id,
        coverLetterDocumentId: coverLetter.id,
      }),
    ).rejects.toThrow("Associate the working document with this candidature before retaining it.");
    expect(listApplicationArtifacts(root, candidature.id)).toEqual([]);

    setCandidatureDocuments(root, {
      candidatureId: candidature.id,
      documentIds: [cv.id, coverLetter.id],
    });
    process.env.AAAAT_TEST_FAIL_COMBINED = "1";
    await expect(
      captureCombinedApplicationArtifact(root, {
        candidatureId: candidature.id,
        cvDocumentId: cv.id,
        coverLetterDocumentId: coverLetter.id,
      }),
    ).rejects.toThrow("AAAAT could not render the combined application packet.");
    expect(listApplicationArtifacts(root, candidature.id)).toEqual([]);
    const artifactsRoot = path.join(root, "artifacts");
    expect(existsSync(artifactsRoot) ? readdirSync(artifactsRoot) : []).toEqual([]);
  });
});
