// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_AI_DISCOVERY_FIELDS,
  MAX_ENABLED_CANDIDATURE_FIELDS,
  clearCandidatureFieldValue,
  createCandidatureField,
  deleteUnusedCandidatureField,
  listCandidatureFields,
  setCandidatureFieldValue,
  updateCandidatureField,
  updateCandidatureFieldPreferences,
} from "../src/main/candidature-field-service";
import { createCandidature, listCandidatures } from "../src/main/candidature-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-field-guardrails-"));
  createOrOpenWorkspace(root);
  return root;
}

function textField(root: string, label: string) {
  return createCandidatureField(root, {
    label,
    description: "Runtime information field.",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
  });
}

describe("live candidature field guardrails", () => {
  it("enforces the enabled-field bound at the application-service boundary", () => {
    const root = workspace();
    try {
      const initial = listCandidatureFields(root).filter((field) => field.definition.enabled).length;
      for (let index = initial; index < MAX_ENABLED_CANDIDATURE_FIELDS; index += 1) {
        textField(root, `Runtime field ${index}`);
      }
      expect(listCandidatureFields(root).filter((field) => field.definition.enabled)).toHaveLength(
        MAX_ENABLED_CANDIDATURE_FIELDS,
      );
      expect(() => textField(root, "One field too many")).toThrow(
        `at most ${MAX_ENABLED_CANDIDATURE_FIELDS} enabled candidature fields`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("enforces the AI-discovery bound independently from Focus and field enablement", () => {
    const root = workspace();
    try {
      let discoveryCount = listCandidatureFields(root).filter(
        (field) => field.definition.enabled && field.preferences.aiDiscovery,
      ).length;
      while (discoveryCount < MAX_AI_DISCOVERY_FIELDS) {
        const field = textField(root, `Discoverable field ${discoveryCount}`);
        updateCandidatureFieldPreferences(root, {
          ...field.preferences,
          focusVisible: discoveryCount % 2 === 0,
          focusOrder: discoveryCount,
          aiDiscovery: true,
          aiContextMode: "expose",
        });
        discoveryCount += 1;
      }
      const extra = textField(root, "Non-discoverable extra field");
      expect(() =>
        updateCandidatureFieldPreferences(root, {
          ...extra.preferences,
          aiDiscovery: true,
        }),
      ).toThrow(`at most ${MAX_AI_DISCOVERY_FIELDS} AI-discovery candidature fields`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("preserves retained values across harmless metadata changes and rejects unsafe shape changes", () => {
    const root = workspace();
    try {
      const candidature = createCandidature(root, { values: [] });
      const field = textField(root, "Type rating");
      setCandidatureFieldValue(root, {
        candidatureId: candidature.id,
        fieldId: field.definition.id,
        value: "A320",
      });

      updateCandidatureField(root, {
        id: field.definition.id,
        label: "Aircraft type rating",
        description: "Renamed runtime information field.",
        valueType: "text",
        cardinality: "one",
        choices: [],
        enabled: true,
      });
      expect(listCandidatures(root)[0]?.values).toEqual([
        expect.objectContaining({ fieldId: field.definition.id, value: "A320" }),
      ]);

      expect(() =>
        updateCandidatureField(root, {
          id: field.definition.id,
          label: "Aircraft type rating",
          description: "Shape change",
          valueType: "number",
          cardinality: "one",
          choices: [],
          enabled: true,
        }),
      ).toThrow(/retained values/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("retires fields without losing retained data, blocks new writes, and permits explicit clearing", () => {
    const root = workspace();
    try {
      const candidature = createCandidature(root, { values: [] });
      const field = textField(root, "Operational note");
      setCandidatureFieldValue(root, {
        candidatureId: candidature.id,
        fieldId: field.definition.id,
        value: "Retained before retirement",
      });
      updateCandidatureField(root, {
        id: field.definition.id,
        label: field.definition.label,
        description: field.definition.description,
        valueType: field.definition.valueType,
        cardinality: field.definition.cardinality,
        choices: field.definition.choices,
        enabled: false,
      });

      expect(listCandidatures(root)[0]?.values).toEqual([
        expect.objectContaining({ fieldId: field.definition.id, value: "Retained before retirement" }),
      ]);
      expect(() =>
        setCandidatureFieldValue(root, {
          candidatureId: candidature.id,
          fieldId: field.definition.id,
          value: "New write",
        }),
      ).toThrow(/Retired candidature fields/);

      clearCandidatureFieldValue(root, candidature.id, field.definition.id);
      expect(listCandidatures(root)[0]?.values).toEqual([]);
      expect(deleteUnusedCandidatureField(root, field.definition.id).some(
        (candidate) => candidate.definition.id === field.definition.id,
      )).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
