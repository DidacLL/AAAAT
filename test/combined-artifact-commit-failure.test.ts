// @vitest-environment node

import { chmodSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import {
  captureCombinedApplicationArtifact,
  listApplicationArtifacts,
} from "../src/main/artifact-service";
import { createCandidature, setCandidatureDocuments } from "../src/main/candidature-service";
import { createDocument } from "../src/main/document-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];
const originalPath = process.env.PATH;

function installFakeLatexmk(): void {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-combined-commit-latex-"));
  roots.push(root);
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");\nconst path = require("node:path");\nfs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });\nfs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), "combined-pdf");\n`,
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
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("combined application artifact commit failure", () => {
  it("removes produced retained files when the artifact transaction cannot commit", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-combined-commit-"));
    roots.push(root);
    createOrOpenWorkspace(root);
    installFakeLatexmk();

    const cv = createDocument(root, {
      kind: "cv",
      title: "Commit failure CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    const coverLetter = createDocument(root, {
      kind: "cover_letter",
      title: "Commit failure letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: ["Application"],
    });
    const candidature = createCandidature(root, { values: [] });
    setCandidatureDocuments(root, {
      candidatureId: candidature.id,
      documentIds: [cv.id, coverLetter.id],
    });

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
    try {
      database.exec(`
        CREATE TRIGGER reject_combined_artifact_commit
        BEFORE INSERT ON application_artifacts
        WHEN NEW.kind = 'combined'
        BEGIN
          SELECT RAISE(FAIL, 'forced combined artifact commit failure');
        END;
      `);
    } finally {
      database.close();
    }

    await expect(
      captureCombinedApplicationArtifact(root, {
        candidatureId: candidature.id,
        cvDocumentId: cv.id,
        coverLetterDocumentId: coverLetter.id,
      }),
    ).rejects.toThrow("forced combined artifact commit failure");

    expect(listApplicationArtifacts(root, candidature.id)).toEqual([]);
    const artifactsRoot = path.join(root, "artifacts");
    expect(existsSync(artifactsRoot) ? readdirSync(artifactsRoot) : []).toEqual([]);
  });
});
