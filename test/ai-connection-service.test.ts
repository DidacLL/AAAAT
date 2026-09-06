// @vitest-environment node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getDefaultAiConnection,
  listAiConnections,
  removeAiConnection,
  requireDefaultAiConnection,
  saveNamedAiConnection,
  setDefaultAiConnection,
} from "../src/main/ai-connection-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-connections-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("named local AI connections", () => {
  it("keeps several stable named connections with one explicit nullable default", () => {
    const root = workspace();
    expect(listAiConnections(root)).toEqual([]);

    const firstSave = saveNamedAiConnection(root, {
      name: "Fast local",
      endpoint: "http://localhost:11434/v1",
      model: "fast-model",
    });
    expect(firstSave).toHaveLength(1);
    expect(firstSave[0]).toMatchObject({
      name: "Fast local",
      model: "fast-model",
      isDefault: true,
    });
    const first = firstSave[0];
    if (!first) throw new Error("first connection fixture missing");

    const secondSave = saveNamedAiConnection(root, {
      name: "Deep local",
      endpoint: "http://127.0.0.1:1234/v1",
      model: "deep-model",
    });
    const second = secondSave.find((connection) => connection.name === "Deep local");
    if (!second) throw new Error("second connection fixture missing");
    expect(secondSave.find((connection) => connection.id === first.id)?.isDefault).toBe(true);
    expect(second.isDefault).toBe(false);

    const selected = setDefaultAiConnection(root, second.id);
    expect(selected.find((connection) => connection.id === second.id)?.isDefault).toBe(true);
    expect(getDefaultAiConnection(root)).toEqual({
      name: "Deep local",
      endpoint: "http://127.0.0.1:1234/v1",
      model: "deep-model",
    });

    const edited = saveNamedAiConnection(root, {
      id: first.id,
      name: "Fast local edited",
      endpoint: "http://localhost:11434/v1",
      model: "fast-model-2",
    });
    expect(edited.find((connection) => connection.id === first.id)).toMatchObject({
      name: "Fast local edited",
      model: "fast-model-2",
      isDefault: false,
    });

    const afterRemoval = removeAiConnection(root, second.id);
    expect(afterRemoval).toEqual([
      expect.objectContaining({ id: first.id, name: "Fast local edited", isDefault: false }),
    ]);
    expect(getDefaultAiConnection(root)).toBeNull();
    expect(() => requireDefaultAiConnection(root)).toThrow("Choose a default local AI connection");

    const stored = readFileSync(path.join(root, "ai-connection.json"), "utf8");
    expect(stored).toContain('"version": 2');
    expect(stored).toContain('"connections"');
    expect(stored).toContain('"defaultConnectionId": null');
    expect(stored).not.toMatch(/api.?key|credential|secret/i);
  });

  it("rejects ambiguous names, remote endpoints, and obsolete development config", () => {
    const root = workspace();
    saveNamedAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "model-a",
    });

    expect(() =>
      saveNamedAiConnection(root, {
        name: "local MODEL",
        endpoint: "http://127.0.0.1:11435/v1",
        model: "model-b",
      }),
    ).toThrow("names must be unique");
    expect(() =>
      saveNamedAiConnection(root, {
        name: "Remote",
        endpoint: "https://models.example.test/v1",
        model: "model-c",
      }),
    ).toThrow("loopback endpoint");

    writeFileSync(
      path.join(root, "ai-connection.json"),
      JSON.stringify({
        version: 1,
        name: "Old development config",
        endpoint: "http://localhost:11434/v1",
        model: "old-model",
      }),
      "utf8",
    );
    expect(() => listAiConnections(root)).toThrow("stored AI connection configuration is invalid");
  });
});
