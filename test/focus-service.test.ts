// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  defaultFocusMaterialPreferences,
  getFocusMaterialPreferences,
  updateFocusMaterialPreferences,
} from "../src/main/focus-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

describe("Focus material preferences", () => {
  it("defaults to available structural material and persists explicit choices", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-focus-"));
    try {
      createOrOpenWorkspace(root);
      expect(getFocusMaterialPreferences(root)).toEqual(defaultFocusMaterialPreferences);

      const saved = updateFocusMaterialPreferences(root, {
        sources: true,
        concepts: false,
        todos: true,
        documents: false,
      });
      expect(saved).toEqual({
        sources: true,
        concepts: false,
        todos: true,
        documents: false,
      });

      openWorkspace(root);
      expect(getFocusMaterialPreferences(root)).toEqual(saved);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
