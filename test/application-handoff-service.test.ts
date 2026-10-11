// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { importApplicationHandoffFile } from "../src/main/application-handoff-service";
import { saveNamedAiConnection } from "../src/main/ai-connection-service";
import { listCandidatures, listCandidatureSources } from "../src/main/candidature-service";
import { listDocumentCollections } from "../src/main/document-domain-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-handoff-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function writeHandoff(root: string, name: string, value: unknown): string {
  const filePath = path.join(root, name);
  writeFileSync(filePath, JSON.stringify(value), "utf8");
  return filePath;
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("portable external-AI application handoff", () => {
  it("rejects malformed capsules before mutation and imports a valid capsule into ordinary Source/document state", async () => {
    const root = workspace();
    const invalid = writeHandoff(root, "invalid.json", {
      format: "aaaat-application-handoff",
      version: 1,
      workspacePath: root,
      intention: {
        sourceText: "should never be retained",
        outputs: ["cv"],
      },
    });

    await expect(importApplicationHandoffFile(root, invalid)).rejects.toThrow(
      "application handoff is invalid",
    );
    expect(listCandidatures(root)).toEqual([]);

    const sourceText = "  External conversation opportunity material.\nKeep the original spacing.  ";
    const valid = writeHandoff(root, "valid.json", {
      format: "aaaat-application-handoff",
      version: 1,
      intention: {
        sourceText,
        outputs: ["cv", "cover_letter"],
      },
    });

    const result = await importApplicationHandoffFile(root, valid);
    expect(result).toEqual({
      created: true,
      cv: { created: true },
      coverLetter: { created: true },
    });

    const candidature = listCandidatures(root)[0];
    if (!candidature) throw new Error("application fixture missing");
    expect(listCandidatureSources(root, candidature.id)).toEqual([
      expect.objectContaining({ sourceText }),
    ]);

    const documents = listDocumentCollections(root);
    expect(documents.workingCvs).toEqual([
      expect.objectContaining({ candidatureId: candidature.id }),
    ]);
    expect(documents.letters).toEqual([
      expect.objectContaining({ candidatureId: candidature.id }),
    ]);
    const boundedResult = JSON.stringify(result);
    expect(boundedResult).not.toContain(candidature.id);
    expect(boundedResult).not.toContain(root);
  });

  it("does not invoke configured AAAAT AI while retaining useful local application work", async () => {
    const root = workspace();
    saveNamedAiConnection(root, {
      name: "Configured AI",
      endpoint: "http://127.0.0.1:9/v1",
      model: "configured-test",
    });
    const fetchSpy = vi.fn(async () => {
      throw new Error("External application-material creation must not call an AI provider.");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const sourceText = "Role: Platform Engineer\nBuild reliable platform services.";
    const filePath = writeHandoff(root, "configured-ai.json", {
      format: "aaaat-application-handoff",
      version: 1,
      intention: {
        sourceText,
        outputs: ["cv", "cover_letter"],
      },
    });

    const result = await importApplicationHandoffFile(root, filePath);
    expect(result).toEqual({
      created: true,
      cv: { created: true },
      coverLetter: { created: true },
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    const candidature = listCandidatures(root)[0];
    if (!candidature) throw new Error("application fixture missing");
    expect(candidature.values).toEqual([]);
    expect(listCandidatureSources(root, candidature.id)).toEqual([
      expect.objectContaining({ sourceText }),
    ]);

    const documents = listDocumentCollections(root);
    expect(documents.workingCvs).toHaveLength(1);
    const letter = documents.letters[0];
    expect(letter).toEqual(expect.objectContaining({
      candidatureId: candidature.id,
      recipient: "Hiring team",
      subject: "Application for Platform Engineer",
      closing: "Kind regards",
    }));
    expect(letter?.bodyParagraphs.length).toBeGreaterThan(0);
  });
});
