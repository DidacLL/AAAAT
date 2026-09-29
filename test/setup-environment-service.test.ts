// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { saveNamedAiConnection } from "../src/main/ai-connection-service";
import { getSetupEnvironmentSnapshot } from "../src/main/setup-environment-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-setup-environment-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("setup environment service", () => {
  it("reports rendering ready from pdflatex alone and configured AI routes without synthetic validation", async () => {
    const root = workspace();
    saveNamedAiConnection(root, {
      name: "Local fit model",
      endpoint: "http://localhost:11434/v1",
      model: "fit-model",
    });
    const probed: string[] = [];
    const snapshot = await getSetupEnvironmentSnapshot(root, async (command) => {
      probed.push(command);
      return {
        command,
        available: true,
        version: "pdfTeX 3.141592653",
      };
    });

    expect(probed).toEqual(["pdflatex"]);
    expect(snapshot.workspaceReady).toBe(true);
    expect(snapshot.tex).toEqual({
      commands: [{ command: "pdflatex", available: true, version: "pdfTeX 3.141592653" }],
      documentRenderingReady: true,
    });
    expect(snapshot.ai).toMatchObject({ configurationReadable: true, connectionCount: 1 });
    expect(snapshot.ai.operations).toContainEqual({
      operation: "opportunity_review",
      available: true,
      connectionName: "Local fit model",
    });
    expect(snapshot.ai.operations).toContainEqual({
      operation: "cv_tailoring",
      available: true,
      connectionName: "Local fit model",
    });
  });

  it("reports rendering unavailable when pdflatex is missing", async () => {
    const root = workspace();
    const snapshot = await getSetupEnvironmentSnapshot(root, async (command) => ({
      command,
      available: false,
      version: null,
    }));

    expect(snapshot.workspaceReady).toBe(true);
    expect(snapshot.tex.documentRenderingReady).toBe(false);
    expect(snapshot.tex.commands).toEqual([
      { command: "pdflatex", available: false, version: null },
    ]);
    expect(snapshot.ai.configurationReadable).toBe(true);
    expect(snapshot.ai.connectionCount).toBe(0);
    expect(snapshot.ai.operations.every((operation) => !operation.available)).toBe(true);
  });
});
