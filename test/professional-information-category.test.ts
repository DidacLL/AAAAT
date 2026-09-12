// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { addProfileItem, getProfile } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-professional-information-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("reusable professional information categories", () => {
  it("retains a legitimate category that is not one of AAAAT's suggestions", () => {
    const root = workspace();

    const created = addProfileItem(root, {
      kind: "publication",
      title: "Distributed systems paper",
      description: "Reusable professional evidence that should not require a schema feature.",
    });

    expect(created.items).toHaveLength(1);
    expect(created.items[0]).toMatchObject({
      kind: "publication",
      title: "Distributed systems paper",
    });
    expect(getProfile(root).items[0]?.kind).toBe("publication");
  });
});
