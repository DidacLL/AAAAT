// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  addCandidatureSource,
  createCandidature,
  getCandidature,
  listCandidatureSources,
  listCandidatures,
  removeCandidatureSource,
  setCandidatureTags,
  updateCandidature,
  updateCandidatureSource,
} from "../src/main/candidature-service";
import { createTag } from "../src/main/tag-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-candidature-service-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("candidature service", () => {
  it("retains raw Sources independently from application information", () => {
    const root = workspace();
    const candidature = createCandidature(root, {
      source: {
        kind: "job_posting",
        title: "Original vacancy",
        url: "https://example.invalid/jobs/platform",
        sourceText: "Raw offer body retained exactly.",
      },
      values: [],
    });
    expect(candidature).not.toHaveProperty("label");

    const first = listCandidatureSources(root, candidature.id)[0];
    if (!first) throw new Error("source fixture missing");
    expect(first).toMatchObject({
      kind: "job_posting",
      title: "Original vacancy",
      sourceText: "Raw offer body retained exactly.",
    });

    const added = addCandidatureSource(root, {
      candidatureId: candidature.id,
      kind: "recruiter_message",
      title: "Recruiter follow-up",
      url: "",
      sourceText: "Additional retained evidence.",
    });
    expect(added).toHaveLength(2);

    const updated = updateCandidatureSource(root, {
      candidatureId: candidature.id,
      id: added[1]!.id,
      kind: "recruiter_message",
      title: "Recruiter clarification",
      url: "",
      sourceText: "Updated retained evidence.",
    });
    expect(updated[1]).toMatchObject({
      title: "Recruiter clarification",
      sourceText: "Updated retained evidence.",
    });

    expect(
      removeCandidatureSource(root, {
        candidatureId: candidature.id,
        sourceId: first.id,
      }),
    ).toHaveLength(1);
    expect(getCandidature(root, candidature.id).sourceSearchText).toContain("Updated retained evidence.");
  });

  it("stores only shared Tag associations on applications", () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    const tag = createTag(root, {
      name: "Platform engineering",
      aliases: ["Platform"],
      definition: "Engineering and operating shared application infrastructure.",
      notes: "Reusable glossary entry",
    });

    const tagged = setCandidatureTags(root, {
      candidatureId: candidature.id,
      tagIds: [tag.id],
    });
    expect(tagged.tagIds).toEqual([tag.id]);
    expect(Object.keys(tagged)).not.toContain("documentIds");

    const untagged = setCandidatureTags(root, {
      candidatureId: candidature.id,
      tagIds: [],
    });
    expect(untagged.tagIds).toEqual([]);
  });

  it("archives without introducing document associations", () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    const archived = updateCandidature(root, { id: candidature.id, archived: true });

    expect(archived.archived).toBe(true);
    expect(Object.keys(archived)).not.toContain("documentIds");
    expect(listCandidatures(root)).toEqual([expect.objectContaining({ id: candidature.id, archived: true })]);
  });
});
