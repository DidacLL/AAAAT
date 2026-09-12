// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getCareerContextAiDisclosure,
  updateCareerContextAiDisclosure,
} from "../src/main/career-context-ai-disclosure-service";
import { updateCareerContext } from "../src/main/career-context-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const allShared = {
  careerDirection: true,
  objectives: true,
  constraints: true,
  targetRoles: true,
  targetMarketsLocations: true,
  workPreferences: true,
  applicationWritingPreferences: true,
};

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-career-context-ai-disclosure-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("Career preferences external AI disclosure", () => {
  it("defaults every fixed preference to shared and survives ordinary content edits", () => {
    const root = workspace();
    try {
      expect(getCareerContextAiDisclosure(root)).toEqual(allShared);

      const restricted = {
        ...allShared,
        constraints: false,
        targetMarketsLocations: false,
      };
      expect(updateCareerContextAiDisclosure(root, restricted)).toEqual(restricted);

      updateCareerContext(root, {
        careerDirection: "Technical leadership",
        objectives: "Increase scope",
        constraints: "Private family constraint",
        targetRoles: "Staff engineer",
        targetMarketsLocations: "Private location constraint",
        workPreferences: "Small teams",
        applicationWritingPreferences: "Concise applications",
      });

      expect(getCareerContextAiDisclosure(root)).toEqual(restricted);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects partial or non-boolean disclosure snapshots", () => {
    const root = workspace();
    try {
      expect(() =>
        updateCareerContextAiDisclosure(root, {
          ...allShared,
          constraints: "no" as unknown as boolean,
        }),
      ).toThrow();
      expect(() =>
        updateCareerContextAiDisclosure(
          root,
          { careerDirection: true } as typeof allShared,
        ),
      ).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
