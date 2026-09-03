// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  getCareerContext,
  updateCareerContext,
} from "../src/main/career-context-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

function temporaryWorkspace(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "aaaat-career-context-"));
  createOrOpenWorkspace(directory);
  return directory;
}

describe("current career context", () => {
  it("starts empty, persists fictional manual context, and survives reopen", () => {
    const workspace = temporaryWorkspace();
    try {
      expect(getCareerContext(workspace)).toEqual({
        careerDirection: "",
        objectives: "",
        constraints: "",
        targetRoles: "",
        targetMarketsLocations: "",
        workPreferences: "",
        applicationWritingPreferences: "",
      });

      const expected = {
        careerDirection: "Move toward staff-level platform work",
        objectives: "Own platform direction and mentor across teams",
        constraints: "No relocation",
        targetRoles: "Staff Platform Engineer\nSenior Platform Engineer",
        targetMarketsLocations: "Spain / EU remote or hybrid",
        workPreferences: "Backend/platform scope with cross-team ownership",
        applicationWritingPreferences: "Concise evidence-led applications",
      };

      expect(updateCareerContext(workspace, expected)).toEqual(expected);
      expect(openWorkspace(workspace)).toEqual({ rootPath: workspace });
      expect(getCareerContext(workspace)).toEqual(expected);

      const database = new DatabaseSync(path.join(workspace, "workspace.sqlite"), {
        readOnly: true,
      });
      try {
        expect(
          database
            .prepare("SELECT version, name FROM schema_migrations WHERE version = 7")
            .get(),
        ).toEqual({ version: 7, name: "career-context" });
        expect(
          database.prepare("SELECT action FROM career_context_activity").all(),
        ).toEqual([{ action: "career-context.updated" }]);
      } finally {
        database.close();
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
