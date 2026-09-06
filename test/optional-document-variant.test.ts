// @vitest-environment node

import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  saveNamedAiConnection,
  validateAiConnectionOperation,
} from "../src/main/ai-connection-service";
import type { ModelProvider } from "../src/main/ai-provider";
import { draftCoverLetter, tailorCv } from "../src/main/ai-service";
import { createCandidature } from "../src/main/candidature-service";
import {
  configureDocumentItem,
  createDocument,
  renderDocument,
  resolveDocument,
} from "../src/main/document-service";
import { addProfileItem, getProfile } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];
const originalPath = process.env.PATH;

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-optional-document-variant-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function seedCanonicalProfile(root: string) {
  addProfileItem(root, {
    kind: "summary",
    title: "Canonical summary",
    description: "I build reliable local-first software.",
  });
  const snapshot = addProfileItem(root, {
    kind: "experience",
    title: "Platform Engineer",
    description: "Built portable TypeScript tooling.",
  });
  const summary = snapshot.items.find((item) => item.kind === "summary");
  const experience = snapshot.items.find((item) => item.kind === "experience");
  if (!summary || !experience) throw new Error("canonical profile fixture missing");
  return { summary, experience };
}

function installFakeLatexmk(): void {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-optional-document-latex-"));
  roots.push(root);
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");\nconst path = require("node:path");\nfs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });\nfs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), "pdf");\n`,
    "utf8",
  );
  const executable = path.join(root, "latexmk");
  writeFileSync(executable, `#!/usr/bin/env node\nrequire(${JSON.stringify(script)});\n`, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(path.join(root, "latexmk.cmd"), `@node "${script}" %*\r\n`, "utf8");
  process.env.PATH = `${root}${path.delimiter}${originalPath ?? ""}`;
}

function provider(overrides: Partial<ModelProvider>): ModelProvider {
  return {
    assessFit: vi.fn<ModelProvider["assessFit"]>(),
    extractJob: vi.fn<ModelProvider["extractJob"]>(),
    recommendVariant: vi.fn<ModelProvider["recommendVariant"]>(),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(),
    ...overrides,
  };
}

function validationProvider(): ModelProvider {
  return provider({
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(async () => ({
      recommendations: [
        { itemRef: "aaaat_validation_item", rationale: "Synthetic validation result" },
      ],
    })),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(async () => ({
      recipient: "",
      subject: "Validation",
      bodyParagraphs: ["Synthetic validation result."],
      closing: "",
    })),
  });
}

afterEach(() => {
  process.env.PATH = originalPath;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("optional document profile variants", () => {
  it("creates, specializes and renders a managed CV directly from canonical profile information", async () => {
    const root = workspace();
    const { summary, experience } = seedCanonicalProfile(root);
    const before = getProfile(root);
    expect(before.variants).toEqual([]);

    const document = createDocument(root, {
      kind: "cv",
      title: "Canonical CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(document.variantId).toBeNull();
    expect(resolveDocument(root, document.id).items.map((item) => item.id)).toEqual([
      summary.id,
      experience.id,
    ]);

    configureDocumentItem(root, {
      documentId: document.id,
      itemId: summary.id,
      included: true,
      contentPatch: { title: "Document-specific summary" },
    });
    expect(resolveDocument(root, document.id).items[0]?.title).toBe("Document-specific summary");
    expect(getProfile(root)).toEqual(before);

    installFakeLatexmk();
    const rendered = await renderDocument(root, document.id, 1_000);
    expect(existsSync(rendered.sourcePath)).toBe(true);
    expect(existsSync(rendered.artifactPath)).toBe(true);
  });

  it("uses canonical career evidence for CV and cover-letter AI assistance when no variant exists", async () => {
    const root = workspace();
    seedCanonicalProfile(root);
    const saved = saveNamedAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "local-model",
    });
    const connection = saved[0];
    if (!connection) throw new Error("connection fixture missing");
    await validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation: "cv_tailoring" },
      validationProvider(),
    );
    await validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation: "cover_letter_draft" },
      validationProvider(),
    );
    const candidature = createCandidature(root, { values: [] });
    const cv = createDocument(root, {
      kind: "cv",
      title: "Canonical CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    const cover = createDocument(root, {
      kind: "cover_letter",
      title: "Canonical cover letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });

    const tailor = vi.fn<ModelProvider["tailorCv"]>(async (_connection, context) => {
      expect(JSON.stringify(context)).toContain("Platform Engineer");
      return {
        recommendations: [
          {
            itemRef: context.items.find((item) => item.title === "Platform Engineer")?.itemRef ?? "",
            rationale: "Relevant canonical evidence.",
          },
        ],
      };
    });
    await expect(
      tailorCv(
        root,
        { candidatureId: candidature.id, documentId: cv.id },
        provider({ tailorCv: tailor }),
      ),
    ).resolves.toMatchObject({ recommendations: [{ rationale: "Relevant canonical evidence." }] });

    const draft = vi.fn<ModelProvider["draftCoverLetter"]>(async (_connection, context) => {
      expect(JSON.stringify(context)).toContain("Platform Engineer");
      return {
        recipient: "Hiring team",
        subject: "Application",
        bodyParagraphs: ["Canonical evidence supports this application."],
        closing: "Regards",
      };
    });
    await expect(
      draftCoverLetter(
        root,
        { candidatureId: candidature.id, documentId: cover.id },
        provider({ draftCoverLetter: draft }),
      ),
    ).resolves.toMatchObject({ subject: "Application" });
  });
});
