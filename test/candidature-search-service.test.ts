// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCandidatureField,
  setCandidatureFieldValue,
  updateCandidatureField,
} from "../src/main/candidature-field-service";
import { searchCandidatures } from "../src/main/candidature-search-service";
import {
  addCandidatureSource,
  createCandidature,
  setCandidatureConcepts,
  updateCandidatureSource,
} from "../src/main/candidature-service";
import { createConcept } from "../src/main/concept-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-candidature-search-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("local candidature corpus search", () => {
  it("matches retained field labels and values, Sources, and associated concept aliases", () => {
    const root = temporaryWorkspace();
    try {
      const first = createCandidature(root, {
        source: {
          kind: "job_posting",
          title: "Regional Air",
          url: "https://example.invalid/pilot",
          sourceText: "Initial source text.",
        },
        values: [],
      });
      const second = createCandidature(root, { values: [] });
      const remoteId = "00000000-0000-4000-8000-000000000801";
      const hybridId = "00000000-0000-4000-8000-000000000802";
      const workMode = createCandidatureField(root, {
        label: "Work mode",
        description: "Permitted work arrangement.",
        valueType: "choice",
        cardinality: "one",
        choices: [
          { id: remoteId, label: "Remote first" },
          { id: hybridId, label: "Hybrid" },
        ],
        enabled: true,
      });
      setCandidatureFieldValue(root, {
        candidatureId: first.id,
        fieldId: workMode.definition.id,
        value: remoteId,
      });
      const concept = createConcept(root, {
        name: "Reliability engineering",
        definition: "Reliable systems.",
        aliases: ["unique-sre-alias"],
      });
      setCandidatureConcepts(root, {
        candidatureId: second.id,
        conceptIds: [concept.id],
      });

      expect(searchCandidatures(root, { query: "regional air" })).toEqual([first.id]);
      expect(searchCandidatures(root, { query: "WORK MODE" })).toEqual([first.id]);
      expect(searchCandidatures(root, { query: "REMOTE FIRST" })).toEqual([first.id]);
      expect(searchCandidatures(root, { query: "unique-sre-alias" })).toEqual([second.id]);

      updateCandidatureField(root, {
        id: workMode.definition.id,
        label: workMode.definition.label,
        description: workMode.definition.description,
        valueType: workMode.definition.valueType,
        cardinality: workMode.definition.cardinality,
        choices: workMode.definition.choices,
        enabled: false,
      });
      expect(searchCandidatures(root, { query: "work mode" })).toEqual([first.id]);

      const [source] = addCandidatureSource(root, {
        candidatureId: second.id,
        kind: "recruiter_message",
        title: "Recruiter note",
        url: "",
        sourceText: "late-source-needle",
      });
      if (!source) throw new Error("Expected retained Source");
      expect(searchCandidatures(root, { query: "late-source-needle" })).toEqual([second.id]);

      updateCandidatureSource(root, {
        id: source.id,
        candidatureId: source.candidatureId,
        kind: source.kind,
        title: source.title,
        url: source.url,
        sourceText: "edited-source-needle",
      });
      expect(searchCandidatures(root, { query: "late-source-needle" })).toEqual([]);
      expect(searchCandidatures(root, { query: "edited-source-needle" })).toEqual([second.id]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects blank and oversized queries before reading a corpus", () => {
    const root = temporaryWorkspace();
    try {
      expect(() => searchCandidatures(root, { query: "   " })).toThrow();
      expect(() => searchCandidatures(root, { query: "x".repeat(201) })).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
