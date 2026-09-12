// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  addProfileItem,
  updateProfileItem,
} from "../src/main/profile-service";
import {
  getProfileItemAiContextPreference,
  updateProfileItemAiContextPreference,
} from "../src/main/profile-ai-context-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-profile-ai-context-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("professional-information AI disclosure preference", () => {
  it("defaults to expose and survives ordinary content edits", () => {
    const root = workspace();
    try {
      const snapshot = addProfileItem(root, {
        kind: "experience",
        title: "Platform Engineer",
        description: "Private infrastructure work",
      });
      const item = snapshot.items[0];
      if (!item) throw new Error("Profile item missing");

      expect(getProfileItemAiContextPreference(root, item.id)).toEqual({
        itemId: item.id,
        aiContextMode: "expose",
      });

      expect(
        updateProfileItemAiContextPreference(root, {
          itemId: item.id,
          aiContextMode: "omit",
        }),
      ).toEqual({ itemId: item.id, aiContextMode: "omit" });

      updateProfileItem(root, {
        id: item.id,
        item: {
          kind: "experience",
          title: "Senior Platform Engineer",
          description: "Private infrastructure work",
        },
      });

      expect(getProfileItemAiContextPreference(root, item.id).aiContextMode).toBe("omit");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid or missing items", () => {
    const root = workspace();
    try {
      expect(() => getProfileItemAiContextPreference(root, "not-a-uuid")).toThrow();
      expect(() =>
        updateProfileItemAiContextPreference(root, {
          itemId: "00000000-0000-4000-8000-000000000999",
          aiContextMode: "token",
        }),
      ).toThrow("The professional-information item no longer exists.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
