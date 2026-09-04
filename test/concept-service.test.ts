// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCandidature,
  listCandidatures,
  setCandidatureConcepts,
} from "../src/main/candidature-service";
import { createConcept, listConcepts, updateConcept } from "../src/main/concept-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-concept-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("shared candidature concepts", () => {
  it("persists one editable concept and associates it with multiple sparse candidatures", () => {
    const root = temporaryWorkspace();
    try {
      const first = createCandidature(root, { values: [] });
      const second = createCandidature(root, { values: [] });
      const created = createConcept(root, {
        name: "TypeScript",
        definition: "Typed JavaScript",
        aliases: ["TS"],
      });

      expect(
        setCandidatureConcepts(root, {
          candidatureId: first.id,
          conceptIds: [created.id],
        }).conceptIds,
      ).toEqual([created.id]);
      expect(
        setCandidatureConcepts(root, {
          candidatureId: second.id,
          conceptIds: [created.id],
        }).conceptIds,
      ).toEqual([created.id]);

      const updated = updateConcept(root, {
        id: created.id,
        name: "TypeScript",
        definition: "Typed superset of JavaScript",
        aliases: ["TS", "Type Script"],
      });
      openWorkspace(root);

      expect(listConcepts(root)).toEqual([updated]);
      expect(listCandidatures(root).map((record) => record.conceptIds)).toEqual([
        [created.id],
        [created.id],
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects missing concept associations without replacing existing ones", () => {
    const root = temporaryWorkspace();
    try {
      const candidature = createCandidature(root, { values: [] });
      const concept = createConcept(root, {
        name: "PostgreSQL",
        definition: "Relational database",
        aliases: ["Postgres"],
      });
      setCandidatureConcepts(root, {
        candidatureId: candidature.id,
        conceptIds: [concept.id],
      });

      expect(() =>
        setCandidatureConcepts(root, {
          candidatureId: candidature.id,
          conceptIds: ["00000000-0000-4000-8000-000000009999"],
        }),
      ).toThrow("An associated concept no longer exists.");
      expect(listCandidatures(root)[0]?.conceptIds).toEqual([concept.id]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
