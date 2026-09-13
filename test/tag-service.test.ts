// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCandidature,
  listCandidatures,
  setCandidatureTags,
} from "../src/main/candidature-service";
import { createTag, listTags, updateTag } from "../src/main/tag-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-tag-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("shared candidature tags", () => {
  it("persists editable tag notes without erasing them during ordinary tag edits", () => {
    const root = temporaryWorkspace();
    try {
      const first = createCandidature(root, { values: [] });
      const second = createCandidature(root, { values: [] });
      const created = createTag(root, {
        name: "TypeScript",
        definition: "Typed JavaScript",
        notes: "Mention migration ownership from the platform project.",
        aliases: ["TS"],
      });

      expect(
        setCandidatureTags(root, {
          candidatureId: first.id,
          tagIds: [created.id],
        }).tagIds,
      ).toEqual([created.id]);
      expect(
        setCandidatureTags(root, {
          candidatureId: second.id,
          tagIds: [created.id],
        }).tagIds,
      ).toEqual([created.id]);

      const updated = updateTag(root, {
        id: created.id,
        name: "TypeScript",
        definition: "Typed superset of JavaScript",
        aliases: ["TS", "Type Script"],
      });
      openWorkspace(root);

      expect(updated.notes).toBe("Mention migration ownership from the platform project.");
      expect(listTags(root)).toEqual([updated]);
      expect(listCandidatures(root).map((record) => record.tagIds)).toEqual([
        [created.id],
        [created.id],
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects missing tag associations without replacing existing ones", () => {
    const root = temporaryWorkspace();
    try {
      const candidature = createCandidature(root, { values: [] });
      const tag = createTag(root, {
        name: "PostgreSQL",
        definition: "Relational database",
        aliases: ["Postgres"],
      });
      setCandidatureTags(root, {
        candidatureId: candidature.id,
        tagIds: [tag.id],
      });

      expect(() =>
        setCandidatureTags(root, {
          candidatureId: candidature.id,
          tagIds: ["00000000-0000-4000-8000-000000009999"],
        }),
      ).toThrow("An associated tag no longer exists.");
      expect(listCandidatures(root)[0]?.tagIds).toEqual([tag.id]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
