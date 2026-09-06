// @vitest-environment node

import {
  appendFileSync,
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  captureApplicationArtifact,
  listApplicationArtifacts,
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
    `const fs = require("node:fs");\nconst path = require("node:path");\nfs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });\nfs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), process.env.AAAAT_TEST_PDF || "pdf-one");\n`,
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
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("application artifact service", () => {
  it("retains the effective user-owned project, PDF and origin metadata independently", async () => {
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
    expect(readFileSync(path.join(retained.projectPath, "main.tex"), "utf8")).toContain(
      "% submitted blueprint edit",
    );
    expect(readFileSync(path.join(retained.projectPath, "aaaat.sty"), "utf8")).toContain(
      "% submitted package edit",
    );
    expect(readFileSync(retained.artifactPath, "utf8")).toBe("pdf-one");
    expect(listApplicationArtifacts(root, candidature.id)).toEqual([retained]);

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
        documentId: document.id,
        projectPath: retained.projectPath,
        sourcePath: retained.sourcePath,
        artifactPath: retained.artifactPath,
      }),
    ]);
    expect(readFileSync(retained.artifactPath, "utf8")).toBe("pdf-one");
  });
});
