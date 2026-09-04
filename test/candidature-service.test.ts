// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  clearCandidatureFieldValue,
  createCandidatureField,
  filterCandidatures,
  listCandidatureFields,
  setCandidatureFieldValue,
  updateCandidatureField,
  updateCandidatureFieldPreferences,
} from "../src/main/candidature-field-service";
import {
  addCandidatureSource,
  createCandidature,
  listCandidatureSources,
  listCandidatures,
  removeCandidatureSource,
  setCandidatureDocuments,
  updateCandidature,
  updateCandidatureSource,
} from "../src/main/candidature-service";
import { createDocument, removeDocument } from "../src/main/document-service";
import { createProfileVariant } from "../src/main/profile-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-candidature-"));
  createOrOpenWorkspace(root);
  return root;
}

function fieldBySystemKey(root: string, systemKey: string) {
  const field = listCandidatureFields(root).find(
    (candidate) => candidate.definition.systemKey === systemKey,
  );
  if (!field) throw new Error(`Missing seed field ${systemKey}`);
  return field;
}

describe("candidature information service", () => {
  it("supports completely sparse and Source-only candidatures and keeps archive independent", () => {
    const root = temporaryWorkspace();
    try {
      const sparse = createCandidature(root, { values: [] });
      expect(sparse.values).toEqual([]);
      expect(sparse.archived).toBe(false);
      expect(sparse.label).toMatch(/^Candidature · /);

      const sourceOnly = createCandidature(root, {
        source: {
          kind: "job_posting",
          title: "Regional airline pilot role",
          url: "https://example.invalid/pilot",
          sourceText: "A320 experience preferred.",
        },
        values: [],
      });
      expect(sourceOnly.values).toEqual([]);
      expect(sourceOnly.label).toBe("Regional airline pilot role");
      expect(listCandidatureSources(root, sourceOnly.id)).toEqual([
        expect.objectContaining({
          candidatureId: sourceOnly.id,
          kind: "job_posting",
          title: "Regional airline pilot role",
        }),
      ]);

      const archived = updateCandidature(root, { id: sparse.id, archived: true });
      expect(archived.archived).toBe(true);
      expect(archived.values).toEqual([]);

      openWorkspace(root);
      expect(listCandidatures(root).find((candidate) => candidate.id === sparse.id)?.archived).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("adds a runtime field to old candidatures without backfilling, then keeps identity and filters stable across rename", () => {
    const root = temporaryWorkspace();
    try {
      const first = createCandidature(root, { values: [] });
      const second = createCandidature(root, { values: [] });
      const hours = createCandidatureField(root, {
        label: "Minimum flight hours",
        description: "Minimum total flight hours requested by the opportunity.",
        valueType: "number",
        cardinality: "one",
        choices: [],
        enabled: true,
      });

      expect(listCandidatures(root).every((candidate) => candidate.values.length === 0)).toBe(true);

      setCandidatureFieldValue(root, {
        candidatureId: first.id,
        fieldId: hours.definition.id,
        value: 1500,
      });
      expect(
        listCandidatures(root).find((candidate) => candidate.id === first.id)?.values,
      ).toEqual([
        expect.objectContaining({ fieldId: hours.definition.id, value: 1500 }),
      ]);
      expect(
        listCandidatures(root).find((candidate) => candidate.id === second.id)?.values,
      ).toEqual([]);

      expect(
        filterCandidatures(root, {
          fieldId: hours.definition.id,
          operator: "greater_than_or_equal",
          value: 1000,
        }),
      ).toEqual([first.id]);
      expect(
        filterCandidatures(root, {
          fieldId: hours.definition.id,
          operator: "is_not_set",
        }),
      ).toEqual([second.id]);

      const renamed = updateCandidatureField(root, {
        id: hours.definition.id,
        label: "Minimum total hours",
        description: hours.definition.description,
        valueType: hours.definition.valueType,
        cardinality: hours.definition.cardinality,
        choices: hours.definition.choices,
        enabled: true,
      });
      expect(renamed.definition.id).toBe(hours.definition.id);
      expect(renamed.definition.label).toBe("Minimum total hours");
      expect(
        filterCandidatures(root, {
          fieldId: hours.definition.id,
          operator: "equals",
          value: 1500,
        }),
      ).toEqual([first.id]);

      const configured = updateCandidatureFieldPreferences(root, {
        ...renamed.preferences,
        focusVisible: true,
        focusOrder: 4,
        focusProminence: "wide",
        identityOrder: null,
        aiDiscovery: true,
        aiContextMode: "expose",
      });
      expect(configured.preferences).toMatchObject({
        focusVisible: true,
        focusOrder: 4,
        focusProminence: "wide",
        aiDiscovery: true,
        aiContextMode: "expose",
      });

      clearCandidatureFieldValue(root, first.id, hours.definition.id);
      expect(
        listCandidatures(root).find((candidate) => candidate.id === first.id)?.values,
      ).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("filters many-choice fields with set semantics for any and all", () => {
    const root = temporaryWorkspace();
    try {
      const remoteId = "00000000-0000-4000-8000-000000000701";
      const hybridId = "00000000-0000-4000-8000-000000000702";
      const onsiteId = "00000000-0000-4000-8000-000000000703";
      const modes = createCandidatureField(root, {
        label: "Work modes",
        description: "Supported work modes.",
        valueType: "choice",
        cardinality: "many",
        choices: [
          { id: remoteId, label: "Remote" },
          { id: hybridId, label: "Hybrid" },
          { id: onsiteId, label: "On-site" },
        ],
        enabled: true,
      });
      const first = createCandidature(root, { values: [] });
      const second = createCandidature(root, { values: [] });
      const third = createCandidature(root, { values: [] });
      setCandidatureFieldValue(root, {
        candidatureId: first.id,
        fieldId: modes.definition.id,
        value: [remoteId, hybridId],
      });
      setCandidatureFieldValue(root, {
        candidatureId: second.id,
        fieldId: modes.definition.id,
        value: [remoteId],
      });
      setCandidatureFieldValue(root, {
        candidatureId: third.id,
        fieldId: modes.definition.id,
        value: [onsiteId],
      });

      expect(
        new Set(
          filterCandidatures(root, {
            fieldId: modes.definition.id,
            operator: "contains_any",
            value: [hybridId, onsiteId],
          }),
        ),
      ).toEqual(new Set([first.id, third.id]));
      expect(
        filterCandidatures(root, {
          fieldId: modes.definition.id,
          operator: "contains_all",
          value: [remoteId, hybridId],
        }),
      ).toEqual([first.id]);
      expect(
        new Set(
          filterCandidatures(root, {
            fieldId: modes.definition.id,
            operator: "contains_all",
            value: [remoteId, remoteId],
          }),
        ),
      ).toEqual(new Set([first.id, second.id]));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses explicit Sources as retained evidence with independent lifecycle", () => {
    const root = temporaryWorkspace();
    try {
      const candidature = createCandidature(root, { values: [] });
      const sources = addCandidatureSource(root, {
        candidatureId: candidature.id,
        kind: "recruiter_message",
        title: "Initial recruiter message",
        url: "",
        sourceText: "Would you consider the role?",
      });
      const first = sources[0];
      expect(first).toBeDefined();
      if (!first) return;

      updateCandidatureSource(root, {
        id: first.id,
        candidatureId: first.candidatureId,
        kind: first.kind,
        title: "Recruiter follow-up",
        url: first.url,
        sourceText: "The role includes a simulator assessment.",
      });
      expect(listCandidatureSources(root, candidature.id)[0]).toMatchObject({
        id: first.id,
        title: "Recruiter follow-up",
        sourceText: "The role includes a simulator assessment.",
      });

      removeCandidatureSource(root, {
        candidatureId: candidature.id,
        sourceId: first.id,
      });
      expect(listCandidatureSources(root, candidature.id)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps existing document associations durable while candidature information evolves independently", () => {
    const root = temporaryWorkspace();
    try {
      const candidature = createCandidature(root, { values: [] });
      const profile = createProfileVariant(root, {
        name: "General",
        focus: "",
        targetTags: [],
      });
      const variant = profile.variants[0];
      expect(variant).toBeDefined();
      if (!variant) return;

      const document = createDocument(root, {
        kind: "cv",
        title: "General CV",
        variantId: variant.id,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      expect(
        setCandidatureDocuments(root, {
          candidatureId: candidature.id,
          documentIds: [document.id],
        }).documentIds,
      ).toEqual([document.id]);

      const role = fieldBySystemKey(root, "candidature.role");
      setCandidatureFieldValue(root, {
        candidatureId: candidature.id,
        fieldId: role.definition.id,
        value: "Flight operations analyst",
      });
      expect(listCandidatures(root)[0]?.documentIds).toEqual([document.id]);

      removeDocument(root, document.id);
      expect(listCandidatures(root)[0]?.documentIds).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
