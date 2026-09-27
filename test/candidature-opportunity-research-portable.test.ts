// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createCandidatureOpportunityResearchAccessDesktopApi } from "../src/preload/candidature-opportunity-research-access-api";
import {
  buildOpportunityResearchPortableTask,
  deleteCandidatureAiTaskTemplate,
  importOpportunityResearchPortableResult,
  listCandidatureAiTaskTemplates,
  maxOpportunityResearchPortableResultBytes,
  requireSelectedOpportunityResearchContext,
  saveCandidatureAiTaskTemplate,
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

describe("portable no-local candidature AI carrier", () => {
  it("combines an editable task instruction with exactly the selected AI-permitted context", () => {
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

    expect(requireSelectedOpportunityResearchContext(root)).toEqual({
      information: [expect.objectContaining({ label: "Role", value: "Software Engineer" })],
    });

    const task = buildOpportunityResearchPortableTask(
      root,
      "Compare this opportunity with the supplied context and return five preparation questions.",
    );
    expect(task).toContain("# Application task");
    expect(task).toContain("**Role:** Software Engineer");
    expect(task).toContain(
      "Compare this opportunity with the supplied context and return five preparation questions.",
    );
    expect(task).not.toContain("selected and permitted");
    expect(task).not.toContain("database identifiers");
    expect(task).not.toContain("workspace paths");
    expect(task).not.toContain("PRIVATE NOTES");
    expect(task).not.toContain("SOURCE SECRET");
    expect(task).not.toContain("SOURCE BODY SECRET");
    expect(task).not.toContain(candidature.id);
    expect(task).not.toContain(root);
  });

  it("persists, updates and deletes user-created candidature AI task templates without a schema change", () => {
    const root = workspace();
    expect(listCandidatureAiTaskTemplates(root)).toEqual([]);

    const created = saveCandidatureAiTaskTemplate(root, {
      name: "My interview review",
      instruction: "Prepare five role-specific questions.",
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(listCandidatureAiTaskTemplates(root)).toEqual([created]);

    const updated = saveCandidatureAiTaskTemplate(root, {
      id: created.id,
      name: "My interview review",
      instruction: "Prepare seven role-specific questions and likely follow-ups.",
    });
    expect(updated.id).toBe(created.id);
    expect(listCandidatureAiTaskTemplates(root)).toEqual([updated]);

    expect(() =>
      saveCandidatureAiTaskTemplate(root, {
        name: "MY INTERVIEW REVIEW",
        instruction: "Duplicate name.",
      }),
    ).toThrow("already uses that name");

    deleteCandidatureAiTaskTemplate(root, created.id);
    expect(listCandidatureAiTaskTemplates(root)).toEqual([]);
  });

  it("fails closed without a selected candidature", () => {
    const root = workspace();
    createCandidature(root, { values: [] });
    expect(() => requireSelectedOpportunityResearchContext(root)).toThrow(
      "Choose Send to my AI",
    );
    expect(() => buildOpportunityResearchPortableTask(root, "Useful task")).toThrow(
      "Choose Send to my AI",
    );
    expect(importOpportunityResearchPortableResult(root, "Useful returned research")).toBe(false);
  });

  it("retains one bounded returned text result as a Source on the locally selected candidature", () => {
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
        title: "External AI result",
        url: "",
        sourceText: "Useful external analysis with concrete preparation points.",
      }),
    ]);
    expect(listCandidatureSources(root, other.id)).toEqual([]);
  });

  it("rejects empty and oversized returned results before mutation", () => {
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

  it("keeps templates and task/result operations bounded at the preload boundary", async () => {
    const instruction = "Prepare useful questions.";
    const template = {
      id: "00000000-0000-4000-8000-000000000654",
      name: "My questions",
      instruction,
    };
    const invoke = vi.fn(async (channel: string) => {
      if (channel === candidatureOpportunityResearchAccessChannels.taskContext) {
        return { information: [{ label: "Role", value: "Software Engineer" }] };
      }
      if (channel === candidatureOpportunityResearchAccessChannels.taskTemplates) return [template];
      if (channel === candidatureOpportunityResearchAccessChannels.taskTemplateSave) return template;
      if (channel === candidatureOpportunityResearchAccessChannels.taskTemplateDelete) return "deleted";
      if (channel === candidatureOpportunityResearchAccessChannels.copyTask) return "copied";
      if (channel === candidatureOpportunityResearchAccessChannels.exportTask) return "exported";
      if (channel === candidatureOpportunityResearchAccessChannels.retainResult) return "retained";
      if (channel === candidatureOpportunityResearchAccessChannels.importResult) return "imported";
      throw new Error(`Unexpected channel ${channel}`);
    });
    const api = createCandidatureOpportunityResearchAccessDesktopApi(invoke);

    await expect(api.candidatureOpportunityResearchAccess.taskContext()).resolves.toEqual({
      information: [{ label: "Role", value: "Software Engineer" }],
    });
    await expect(api.candidatureOpportunityResearchAccess.taskTemplates()).resolves.toEqual([template]);
    await expect(
      api.candidatureOpportunityResearchAccess.saveTaskTemplate({
        name: template.name,
        instruction,
      }),
    ).resolves.toEqual(template);
    await expect(
      api.candidatureOpportunityResearchAccess.deleteTaskTemplate(template.id),
    ).resolves.toBe("deleted");
    await expect(api.candidatureOpportunityResearchAccess.copyTask(instruction)).resolves.toBe("copied");
    await expect(api.candidatureOpportunityResearchAccess.exportTask(instruction)).resolves.toBe("exported");
    await expect(
      api.candidatureOpportunityResearchAccess.retainResult("Useful returned result"),
    ).resolves.toBe("retained");
    await expect(api.candidatureOpportunityResearchAccess.importResult()).resolves.toBe("imported");

    expect(invoke).toHaveBeenCalledWith(candidatureOpportunityResearchAccessChannels.taskContext);
    expect(invoke).toHaveBeenCalledWith(candidatureOpportunityResearchAccessChannels.taskTemplates);
    expect(invoke).toHaveBeenCalledWith(
      candidatureOpportunityResearchAccessChannels.taskTemplateSave,
      { name: template.name, instruction },
    );
    expect(invoke).toHaveBeenCalledWith(
      candidatureOpportunityResearchAccessChannels.taskTemplateDelete,
      template.id,
    );
    expect(invoke).toHaveBeenCalledWith(
      candidatureOpportunityResearchAccessChannels.copyTask,
      instruction,
    );
    expect(invoke).toHaveBeenCalledWith(
      candidatureOpportunityResearchAccessChannels.retainResult,
      "Useful returned result",
    );

    const malformed = createCandidatureOpportunityResearchAccessDesktopApi(
      vi.fn(async () => "unexpected"),
    );
    await expect(malformed.candidatureOpportunityResearchAccess.taskContext()).rejects.toThrow();
    await expect(malformed.candidatureOpportunityResearchAccess.taskTemplates()).rejects.toThrow();
    await expect(malformed.candidatureOpportunityResearchAccess.copyTask(instruction)).rejects.toThrow();
    await expect(malformed.candidatureOpportunityResearchAccess.exportTask(instruction)).rejects.toThrow();
    await expect(
      malformed.candidatureOpportunityResearchAccess.retainResult("Useful returned result"),
    ).rejects.toThrow();
    await expect(malformed.candidatureOpportunityResearchAccess.importResult()).rejects.toThrow();
  });
});
