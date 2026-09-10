// @vitest-environment node

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createDocument } from "../src/main/document-service";
import { openDocumentOutput } from "../src/main/document-output-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-document-output-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("document output service", () => {
  it("opens only the current PDF path resolved from a document id", async () => {
    const root = workspace();
    const document = createDocument(root, {
      kind: "cv",
      title: "Result-first CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    mkdirSync(path.dirname(document.artifactPath), { recursive: true });
    writeFileSync(document.artifactPath, "pdf", "utf8");
    const openPath = vi.fn(async () => "");

    await expect(openDocumentOutput(root, document.id, openPath)).resolves.toEqual({ opened: true });
    expect(openPath).toHaveBeenCalledTimes(1);
    expect(openPath).toHaveBeenCalledWith(document.artifactPath);
  });

  it("refuses to invoke the OS opener when the current document has no rendered PDF", async () => {
    const root = workspace();
    const document = createDocument(root, {
      kind: "cover_letter",
      title: "Unrendered letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: ["Hello"],
    });
    const openPath = vi.fn(async () => "");

    await expect(openDocumentOutput(root, document.id, openPath)).rejects.toThrow(
      "Render this document before opening its PDF.",
    );
    expect(openPath).not.toHaveBeenCalled();
  });

  it("fails closed when the OS cannot open the internally resolved PDF", async () => {
    const root = workspace();
    const document = createDocument(root, {
      kind: "cv",
      title: "Blocked output",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    mkdirSync(path.dirname(document.artifactPath), { recursive: true });
    writeFileSync(document.artifactPath, "pdf", "utf8");
    const openPath = vi.fn(async () => "no application available");

    await expect(openDocumentOutput(root, document.id, openPath)).rejects.toThrow(
      "AAAAT could not open the rendered PDF.",
    );
    expect(openPath).toHaveBeenCalledWith(document.artifactPath);
  });
});
