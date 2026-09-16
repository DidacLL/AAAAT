import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "../src/main/demo-workspace";
import { listCandidatures, listCandidatureSources } from "../src/main/candidature-service";
import { listDocumentCollections } from "../src/main/document-domain-service";
import { getProfile } from "../src/main/profile-service";
import { listCandidatureFields } from "../src/main/candidature-field-service";
import { resetWorkspace, workspaceIsDemo } from "../src/main/workspace";

describe("demo workspace and reset", () => {
  it("creates a clearly marked realistic demo and resets only that workspace to a clean state", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-demo-"));
    createDemoWorkspace(root);
    expect(workspaceIsDemo(root)).toBe(true);
    const candidatures = listCandidatures(root);
    expect(candidatures).toHaveLength(128);
    const rawSources = candidatures.flatMap((candidature) =>
      listCandidatureSources(root, candidature.id).map((source) => source.sourceText),
    );
    expect(rawSources.some((source) => source.includes("<main>"))).toBe(true);
    expect(rawSources.some((source) => source.includes("<article>"))).toBe(true);
    expect(getProfile(root).items.length).toBeGreaterThanOrEqual(4);
    const documents = listDocumentCollections(root);
    expect(documents.workingCvs).toHaveLength(1);
    expect(documents.letters).toHaveLength(1);
    expect(documents.workingCvs[0]?.candidatureId).toBe(candidatures[0]?.id);
    expect(documents.letters[0]?.candidatureId).toBe(candidatures[0]?.id);
    expect(listCandidatureFields(root).some((field) => field.definition.label === "Languages")).toBe(true);

    resetWorkspace(root);
    expect(workspaceIsDemo(root)).toBe(false);
    expect(listCandidatures(root)).toHaveLength(0);
    expect(getProfile(root).items).toHaveLength(0);
    const resetDocuments = listDocumentCollections(root);
    expect(resetDocuments.workingCvs).toHaveLength(0);
    expect(resetDocuments.letters).toHaveLength(0);
  }, 10_000);
});
