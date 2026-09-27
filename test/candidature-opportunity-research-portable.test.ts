// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createCandidatureOpportunityResearchAccessDesktopApi } from "../src/preload/candidature-opportunity-research-access-api";
import {
  buildOpportunityResearchPortableTask,
  importOpportunityResearchPortableResult,
  maxOpportunityResearchPortableResultBytes,
  updateCandidatureOpportunityResearchAccess,
} from "../src/main/candidature-opportunity-research-access-service";
import {
  listCandidatureFields,
  setCandidatureFieldValue,
  updateCandidatureFieldPreferences,
} from "../src/main/candidature-field-service";
import { createCandidature, listCandidatureSources } from "../src/main/candidature-service";
import { createOrOpenWorkspace } from "../src/main/workspace";
import { candidatureOpportunityResearchAccessChannels } from "../src/shared/candidature-opportunity-research-access-contracts";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-portable-research-"));
  createOrOpenWorkspace(root);
  roots.push(root);
  return root;
}

function fieldBySystemKey(root: string, systemKey: string) {
  const field = listCandidatureFields(root).find(
    (candidate) => candidate.definition.systemKey === systemKey,
  );
  if (!field) throw new Error(`Missing built-in field ${systemKey}`);
  return field;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("portable no-local opportunity research carrier", () => {
  it("exports exactly the selected AI-permitted task projection as readable text", () => {
    const root = workspace();
    const candidature = createCandidature(root, {
      source: {
        kind: "job_posting",
        title: "SOURCE SECRET",
        url: "https://private.invalid/source",
        sourceText: "SOURCE BODY SECRET",
      },
      values: [],
    });
    const role = fieldBySystemKey(root, "candidature.role");
    const notes = fieldBySystemKey(root, "candidature.notes");
    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: role.definition.id,
      value: "Software Engineer",
    });
    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: notes.definition.id,
      value: "PRIVATE NOTES",
    });
    updateCandidatureFieldPreferences(root, {
      ...notes.preferences,
      aiUseAllowed: false,
    });
    updateCandidatureOpportunityResearchAccess(root, {
      candidatureId: candidature.id,
      allowed: true,
    });

    const task = buildOpportunityResearchPortableTask(root);
    expect(task).toContain("# Application research");
    expect(task).toContain("**Role:** Software Engineer");
    expect(task).toContain("Research this opportunity and produce a concise application brief");
    expect(task).toContain("If key details are missing, state them instead of guessing");
    expect(task).not.toContain("selected and permitted");
    expect(task).not.toContain("database identifiers");
    expect(task).not.toContain("workspace paths");
    expect(task).not.toContain("PRIVATE NOTES");
    expect(task).not.toContain("SOURCE SECRET");
    expect(task).not.toContain("SOURCE BODY SECRET");
    expect(task).not.toContain(candidature.id);
    expect(task).not.toContain(root);
  });

  it("fails closed without a selected task candidature", () => {
    const root = workspace();
    createCandidature(root, { values: [] });
    expect(() => buildOpportunityResearchPortableTask(root)).toThrow(
      "Select an application for external opportunity research",
    );
    expect(importOpportunityResearchPortableResult(root, "Useful returned research")).toBe(false);
  });

  it("imports one bounded returned text file as a Source on the locally selected candidature", () => {
    const root = workspace();
    const selected = createCandidature(root, { values: [] });
    const other = createCandidature(root, { values: [] });
    updateCandidatureOpportunityResearchAccess(root, {
      candidatureId: selected.id,
      allowed: true,
    });

    expect(
      importOpportunityResearchPortableResult(
        root,
        "  Useful external analysis with concrete preparation points.  ",
      ),
    ).toBe(true);
    expect(listCandidatureSources(root, selected.id)).toEqual([
      expect.objectContaining({
        kind: "conversation",
        title: "External AI opportunity research",
        url: "",
        sourceText: "Useful external analysis with concrete preparation points.",
      }),
    ]);
    expect(listCandidatureSources(root, other.id)).toEqual([]);
  });

  it("rejects empty and oversized returned files before mutation", () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    updateCandidatureOpportunityResearchAccess(root, {
      candidatureId: candidature.id,
      allowed: true,
    });

    expect(() => importOpportunityResearchPortableResult(root, " \n ")).toThrow(
      "external AI result is empty",
    );
    expect(() =>
      importOpportunityResearchPortableResult(
        root,
        "x".repeat(maxOpportunityResearchPortableResultBytes + 1),
      ),
    ).toThrow("external AI result is too large");
    expect(listCandidatureSources(root, candidature.id)).toEqual([]);
  });

  it("keeps the preload API selector-free for portable export and import", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === candidatureOpportunityResearchAccessChannels.exportTask) return "exported";
      if (channel === candidatureOpportunityResearchAccessChannels.importResult) return "imported";
      throw new Error(`Unexpected channel ${channel}`);
    });
    const api = createCandidatureOpportunityResearchAccessDesktopApi(invoke);

    await expect(api.candidatureOpportunityResearchAccess.exportTask()).resolves.toBe("exported");
    await expect(api.candidatureOpportunityResearchAccess.importResult()).resolves.toBe("imported");
    expect(invoke).toHaveBeenCalledWith(candidatureOpportunityResearchAccessChannels.exportTask);
    expect(invoke).toHaveBeenCalledWith(candidatureOpportunityResearchAccessChannels.importResult);

    const malformed = createCandidatureOpportunityResearchAccessDesktopApi(
      vi.fn(async () => "unexpected"),
    );
    await expect(malformed.candidatureOpportunityResearchAccess.exportTask()).rejects.toThrow();
    await expect(malformed.candidatureOpportunityResearchAccess.importResult()).rejects.toThrow();
  });
});
