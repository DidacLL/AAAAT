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

import {
  configureDocumentItem,
  createDocument,
  exportDocumentProject,
  getDocument,
  regenerateDocument,
  removeDocument,
  renderDocument,
  reorderDocument,
  resolveDocument,
  updateDocument,
} from "../src/main/document-service";
import {
  addProfileItem,
  createProfileVariant,
  getProfile,
} from "../src/main/profile-service";
import { createOrOpenWorkspace, withWorkspaceDatabase } from "../src/main/workspace";

const roots: string[] = [];
const originalPath = process.env.PATH;

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-document-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function installSlowLatexmk(): void {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-document-latex-"));
  roots.push(root);
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");\nconst path = require("node:path");\nsetTimeout(() => {\n  fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });\n  fs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), "pdf");\n  process.exit(0);\n}, 150);\n`,
    "utf8",
  );
  const executable = path.join(root, "latexmk");
  writeFileSync(executable, `#!/usr/bin/env node\nrequire(${JSON.stringify(script)});\n`, "utf8");
  chmodSync(executable, 0o755);
  process.env.PATH = `${root}${path.delimiter}${originalPath ?? ""}`;
}

afterEach(() => {
  process.env.PATH = originalPath;
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function seeded(root: string) {
  addProfileItem(root, {
    kind: "summary",
    title: "General profile",
    description: "I build reliable local-first software.",
  });
  addProfileItem(root, {
    kind: "experience",
    title: "Platform Engineer",
    subtitle: "Example Corp",
    description: "Built portable developer tooling.",
    startDate: "2024",
    endDate: "2026",
  });
  addProfileItem(root, {
    kind: "skill",
    title: "TypeScript",
  });
  const profile = createProfileVariant(root, {
    name: "Platform focus",
    focus: "Platform engineering",
    targetTags: ["platform"],
    preferredLanguage: "en",
  });
  const variant = profile.variants[0];
  if (!variant) throw new Error("Expected seeded variant");
  return { profile, variant };
}

describe("manual document service", () => {
  it("specializes a CV without mutating canonical profile or selected variant", () => {
    const root = workspace();
    const { variant } = seeded(root);
    const before = getProfile(root);
    const document = createDocument(root, {
      kind: "cv",
      title: "Platform CV",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    const base = before.items;
    const summary = base.find((item) => item.kind === "summary");
    const experience = base.find((item) => item.kind === "experience");
    const skill = base.find((item) => item.kind === "skill");
    if (!summary || !experience || !skill) throw new Error("Expected profile items");

    configureDocumentItem(root, {
      documentId: document.id,
      itemId: summary.id,
      included: true,
      contentPatch: { title: "Platform systems profile" },
    });
    configureDocumentItem(root, {
      documentId: document.id,
      itemId: skill.id,
      included: false,
      contentPatch: null,
    });
    reorderDocument(root, {
      documentId: document.id,
      itemIds: [experience.id, summary.id, skill.id],
    });

    const resolved = resolveDocument(root, document.id);
    expect(resolved.items.map((item) => item.id)).toEqual([experience.id, summary.id]);
    expect(resolved.items[1]?.title).toBe("Platform systems profile");
    expect(getProfile(root)).toEqual(before);

    expect(existsSync(document.sourcePath)).toBe(true);
    expect(existsSync(path.join(document.projectPath, "content.tex"))).toBe(true);
    expect(existsSync(path.join(document.projectPath, "aaaat.sty"))).toBe(true);
    for (const file of ["main.tex", "content.tex", "aaaat.sty"]) {
      expect(readFileSync(path.join(document.projectPath, file), "utf8")).not.toContain(root);
    }
  });

  it("keeps cover-letter content structured and preserves direct source edits", () => {
    const root = workspace();
    const exportRoot = mkdtempSync(path.join(tmpdir(), "aaaat-export-"));
    roots.push(exportRoot);
    const { variant } = seeded(root);
    let document = createDocument(root, {
      kind: "cover_letter",
      title: "Platform cover letter",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
      recipient: "Hiring team",
      subject: "Platform role",
    });

    expect(document.bodyParagraphs).toEqual([]);
    const summary = resolveDocument(root, document.id).items.find(
      (item) => item.kind === "summary",
    );
    if (!summary) throw new Error("Expected summary item");
    configureDocumentItem(root, {
      documentId: document.id,
      itemId: summary.id,
      included: true,
      contentPatch: { description: "Focused derived cover-letter paragraph." },
    });
    document = regenerateDocument(root, document.id);
    expect(document.bodyParagraphs).toEqual([]);
    expect(readFileSync(path.join(document.projectPath, "content.tex"), "utf8")).toContain(
      "Focused derived cover-letter paragraph.",
    );

    document = updateDocument(root, {
      id: document.id,
      title: document.title,
      language: "en",
      engine: "pdflatex",
      recipient: "Hiring manager",
      subject: "Platform Engineer",
      bodyParagraphs: ["A deliberately edited manual paragraph."],
      closing: "Regards",
    });
    regenerateDocument(root, document.id);
    expect(readFileSync(path.join(document.projectPath, "content.tex"), "utf8")).toContain(
      "A deliberately edited manual paragraph.",
    );

    appendFileSync(document.sourcePath, "\n% direct user edit\n", "utf8");
    const exportedPath = exportDocumentProject(root, document.id, exportRoot);
    expect(getDocument(root, document.id).mode).toBe("manual");
    expect(readFileSync(path.join(exportedPath, "main.tex"), "utf8")).toContain(
      "% direct user edit",
    );

    const managed = regenerateDocument(root, document.id);
    expect(managed.mode).toBe("managed");
    expect(readFileSync(managed.sourcePath, "utf8")).not.toContain("% direct user edit");
  });

  it("owns the project for the full render operation", async () => {
    const root = workspace();
    const exportRoot = mkdtempSync(path.join(tmpdir(), "aaaat-render-export-"));
    roots.push(exportRoot);
    installSlowLatexmk();
    const { variant } = seeded(root);
    const document = createDocument(root, {
      kind: "cv",
      title: "Render-locked CV",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
    });

    const rendering = renderDocument(root, document.id, 1_000);
    await new Promise((resolve) => setTimeout(resolve, 25));

    await expect(renderDocument(root, document.id, 1_000)).rejects.toThrow(
      "already rendering",
    );
    expect(() => regenerateDocument(root, document.id)).toThrow("currently rendering");
    expect(() => exportDocumentProject(root, document.id, exportRoot)).toThrow(
      "currently rendering",
    );
    expect(() => removeDocument(root, document.id)).toThrow("currently rendering");
    await expect(rendering).resolves.toMatchObject({ id: document.id });
    expect(existsSync(document.artifactPath)).toBe(true);
  });

  it("restores a staged project when document deletion fails", () => {
    const root = workspace();
    const { variant } = seeded(root);
    const document = createDocument(root, {
      kind: "cv",
      title: "Deletion-safe CV",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
    });

    withWorkspaceDatabase(root, (database) => {
      database.exec(`
        CREATE TRIGGER reject_document_delete
        BEFORE DELETE ON documents
        BEGIN
          SELECT RAISE(ABORT, 'blocked deletion');
        END;
      `);
    });

    expect(() => removeDocument(root, document.id)).toThrow();
    expect(getDocument(root, document.id).id).toBe(document.id);
    expect(existsSync(document.sourcePath)).toBe(true);
    expect(
      readdirSync(path.dirname(document.projectPath)).some((entry) =>
        entry.startsWith(`.aaaat-delete-${document.id}-`),
      ),
    ).toBe(false);
  });

  const permissionIt = process.platform === "win32" ? it.skip : it;
  permissionIt("keeps the previous managed source when replacement cannot commit", () => {
    const root = workspace();
    const { variant } = seeded(root);
    const document = createDocument(root, {
      kind: "cv",
      title: "Replacement-safe CV",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    const files = ["main.tex", "content.tex", "aaaat.sty"];
    const before = new Map(
      files.map((file) => [file, readFileSync(path.join(document.projectPath, file), "utf8")]),
    );

    chmodSync(document.projectPath, 0o500);
    try {
      expect(() => regenerateDocument(root, document.id)).toThrow(
        "could not safely replace",
      );
    } finally {
      chmodSync(document.projectPath, 0o700);
    }

    for (const file of files) {
      expect(readFileSync(path.join(document.projectPath, file), "utf8")).toBe(before.get(file));
    }
  });

  it("rejects conflicting document ordering before authoritative state changes", () => {
    const root = workspace();
    const { variant } = seeded(root);
    const document = createDocument(root, {
      kind: "cv",
      title: "Safe CV",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    const before = getDocument(root, document.id);
    const first = resolveDocument(root, document.id).items[0];
    if (!first) throw new Error("Expected document item");

    expect(() =>
      reorderDocument(root, {
        documentId: document.id,
        itemIds: [first.id, first.id],
      }),
    ).toThrow("Document ordering must contain every selected profile item exactly once.");
    expect(getDocument(root, document.id)).toEqual(before);
  });
});