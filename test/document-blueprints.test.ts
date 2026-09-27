// @vitest-environment node

import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  BLUEPRINT_DIRECTORY_NAME,
  BUILTIN_BLUEPRINT_ID,
  listAvailableBlueprints,
  resolveBlueprintSource,
} from "../src/main/document-blueprints";

const roots: string[] = [];

function temporaryUserData(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-blueprints-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("application Blueprint discovery", () => {
  it("creates the dedicated directory and exposes stable IDs/names without paths", () => {
    const userData = temporaryUserData();
    const first = listAvailableBlueprints(userData);

    expect(first).toEqual([{ id: BUILTIN_BLUEPRINT_ID, name: "AAAAT Default" }]);
    const directory = path.join(userData, BLUEPRINT_DIRECTORY_NAME);
    expect(existsSync(directory)).toBe(true);

    const customSource = "\\documentclass{article}\n% custom blueprint marker\n";
    writeFileSync(path.join(directory, "Compact CV.tex"), customSource, "utf8");
    mkdirSync(path.join(directory, "ignored.tex"));
    writeFileSync(path.join(directory, "notes.txt"), "not a Blueprint", "utf8");

    const discovered = listAvailableBlueprints(userData);
    expect(discovered).toHaveLength(2);
    expect(discovered[1]).toMatchObject({ name: "Compact CV" });
    expect(discovered[1]?.id).toBe("user:Compact%20CV.tex");
    expect(JSON.stringify(discovered)).not.toContain(userData);
    expect(resolveBlueprintSource(userData, discovered[1]?.id ?? "")).toBe(customSource);
    expect(listAvailableBlueprints(userData)).toEqual(discovered);
  });

  it("does not turn renderer-supplied IDs into arbitrary filesystem paths", () => {
    const userData = temporaryUserData();
    listAvailableBlueprints(userData);
    expect(() => resolveBlueprintSource(userData, "user:..%2Foutside.tex")).toThrow(
      "no longer available",
    );
  });
});
