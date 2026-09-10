// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import {
  createCandidatureField,
  listCandidatureFields,
  setCandidatureFieldValue,
  updateCandidatureFieldPreferences,
} from "../src/main/candidature-field-service";
import {
  addSourceToSelectedOpportunityResearchCandidature,
  getCandidatureOpportunityResearchAccess,
  selectedOpportunityResearchContext,
  updateCandidatureOpportunityResearchAccess,
} from "../src/main/candidature-opportunity-research-access-service";
import {
  createCandidature,
  listCandidatureSources,
  updateCandidature,
} from "../src/main/candidature-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-opportunity-research-"));
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

describe("external opportunity-research task access", () => {
  it("selects at most one active candidature and revokes the task selection on archive", () => {
    const root = workspace();
    const first = createCandidature(root, { values: [] });
    const second = createCandidature(root, { values: [] });

    expect(getCandidatureOpportunityResearchAccess(root, first.id)).toEqual({
      candidatureId: first.id,
      allowed: false,
    });
    expect(
      updateCandidatureOpportunityResearchAccess(root, {
        candidatureId: first.id,
        allowed: true,
      }),
    ).toEqual({ candidatureId: first.id, allowed: true });
    expect(
      updateCandidatureOpportunityResearchAccess(root, {
        candidatureId: first.id,
        allowed: true,
      }),
    ).toEqual({ candidatureId: first.id, allowed: true });

    updateCandidatureOpportunityResearchAccess(root, {
      candidatureId: second.id,
      allowed: true,
    });
    expect(getCandidatureOpportunityResearchAccess(root, first.id).allowed).toBe(false);
    expect(getCandidatureOpportunityResearchAccess(root, second.id).allowed).toBe(true);

    updateCandidature(root, { id: second.id, archived: true });
    expect(getCandidatureOpportunityResearchAccess(root, second.id).allowed).toBe(false);
    expect(selectedOpportunityResearchContext(root)).toBeNull();
    expect(() =>
      updateCandidatureOpportunityResearchAccess(root, {
        candidatureId: second.id,
        allowed: true,
      }),
    ).toThrow("Archived candidatures cannot be selected for external opportunity research.");

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        database
          .prepare(
            "SELECT action FROM candidature_activity WHERE candidature_id = ? AND action LIKE 'candidature.opportunity-research-access.%' ORDER BY id",
          )
          .all(first.id),
      ).toEqual([
        { action: "candidature.opportunity-research-access.allow" },
        { action: "candidature.opportunity-research-access.revoke" },
      ]);
      expect(
        database
          .prepare(
            "SELECT action FROM candidature_activity WHERE candidature_id = ? AND action LIKE 'candidature.opportunity-research-access.%' ORDER BY id",
          )
          .all(second.id),
      ).toEqual([
        { action: "candidature.opportunity-research-access.allow" },
        { action: "candidature.opportunity-research-access.revoke" },
      ]);
    } finally {
      database.close();
    }
  });

  it("projects flexible task context through existing AI privacy preferences without leaking local corpus data", () => {
    const root = workspace();
    const candidature = createCandidature(root, {
      source: {
        kind: "job_posting",
        title: "SOURCE SECRET TITLE",
        url: "https://source-secret.invalid/private",
        sourceText: "SOURCE SECRET BODY",
      },
      values: [],
    });
    const other = createCandidature(root, {
      source: {
        kind: "other",
        title: "OTHER APPLICATION SECRET",
        url: "",
        sourceText: "OTHER CORPUS SECRET",
      },
      values: [],
    });

    const organisation = fieldBySystemKey(root, "candidature.organization");
    const notes = fieldBySystemKey(root, "candidature.notes");
    const compensation = fieldBySystemKey(root, "candidature.compensation");
    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: organisation.definition.id,
      value: "Example Corp",
    });
    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: notes.definition.id,
      value: "PRIVATE NOTES",
    });
    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: compensation.definition.id,
      value: "€90k",
    });
    updateCandidatureFieldPreferences(root, {
      ...compensation.preferences,
      aiContextMode: "token",
    });

    const custom = createCandidatureField(root, {
      label: "Remote policy",
      description: "Research-relevant custom information",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...custom.preferences,
      aiContextMode: "expose",
    });
    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: custom.definition.id,
      value: "EU remote",
    });

    const choiceId = crypto.randomUUID();
    const choice = createCandidatureField(root, {
      label: "Contract type",
      description: "",
      valueType: "choice",
      cardinality: "one",
      choices: [{ id: choiceId, label: "Permanent" }],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...choice.preferences,
      aiContextMode: "expose",
    });
    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: choice.definition.id,
      value: choiceId,
    });

    updateCandidatureOpportunityResearchAccess(root, {
      candidatureId: candidature.id,
      allowed: true,
    });
    const context = selectedOpportunityResearchContext(root);
    expect(context).not.toBeNull();
    const json = JSON.stringify(context);
    expect(json).toContain("Example Corp");
    expect(json).toContain("Remote policy");
    expect(json).toContain("EU remote");
    expect(json).toContain("Contract type");
    expect(json).toContain("Permanent");
    expect(json).not.toContain(choiceId);
    expect(json).not.toContain("PRIVATE NOTES");
    expect(json).not.toContain("€90k");
    expect(json).toMatch(/AAAT_PRIVATE_/);
    expect(json).not.toContain("SOURCE SECRET TITLE");
    expect(json).not.toContain("source-secret.invalid");
    expect(json).not.toContain("SOURCE SECRET BODY");
    expect(json).not.toContain("OTHER APPLICATION SECRET");
    expect(json).not.toContain("OTHER CORPUS SECRET");
    expect(json).not.toContain(candidature.id);
    expect(json).not.toContain(other.id);
    expect(json).not.toContain(root);
  });

  it("retains only a validated Source on the task-selected candidature and no-ops without selection", () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    const source = {
      source: {
        kind: "conversation" as const,
        title: "External research",
        url: "https://example.invalid/research",
        sourceText: "Useful findings returned by the external assistant.",
      },
    };

    expect(addSourceToSelectedOpportunityResearchCandidature(root, source)).toBe(false);
    expect(listCandidatureSources(root, candidature.id)).toEqual([]);

    updateCandidatureOpportunityResearchAccess(root, {
      candidatureId: candidature.id,
      allowed: true,
    });
    expect(addSourceToSelectedOpportunityResearchCandidature(root, source)).toBe(true);
    expect(listCandidatureSources(root, candidature.id)).toEqual([
      expect.objectContaining(source.source),
    ]);
    expect(() =>
      addSourceToSelectedOpportunityResearchCandidature(root, {
        source: { kind: "other", title: " ", url: "", sourceText: "\n" },
      }),
    ).toThrow();
  });

  it("enforces the single-active-selection invariant directly in SQLite", () => {
    const root = workspace();
    const first = createCandidature(root, { values: [] });
    const second = createCandidature(root, { values: [] });
    const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
    try {
      database
        .prepare("UPDATE candidatures SET opportunity_research_selected = 1 WHERE id = ?")
        .run(first.id);
      expect(() =>
        database
          .prepare("UPDATE candidatures SET opportunity_research_selected = 1 WHERE id = ?")
          .run(second.id),
      ).toThrow();
      expect(() =>
        database
          .prepare("UPDATE candidatures SET archived = 1 WHERE id = ?")
          .run(first.id),
      ).toThrow();
    } finally {
      database.close();
    }
  });
});
