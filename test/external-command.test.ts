// @vitest-environment node

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Readable, Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createCandidatureField } from "../src/main/candidature-field-service";
import { listCandidatures } from "../src/main/candidature-service";
import {
  executeExternalCommand,
  externalCommandMaxInputBytes,
  runExternalCommandProcess,
} from "../src/main/external-command";
import { createOrOpenWorkspace } from "../src/main/workspace";

function commandArgs(root: string, capability = "candidature.create"): string[] {
  return ["aaaat", "--external-command", capability, "--workspace", root];
}

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-command-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("bounded external candidature command", () => {
  it("creates sparse runtime information through the normal candidature mutation and returns no private authority", () => {
    const root = temporaryWorkspace();
    try {
      const field = createCandidatureField(root, {
        label: "Minimum flight hours",
        description: "Minimum total flight hours requested.",
        valueType: "number",
        cardinality: "one",
        choices: [],
        enabled: true,
      });
      const input = {
        source: {
          kind: "job_posting" as const,
          title: "Pilot vacancy",
          url: "https://example.invalid/job",
          sourceText: "Private source material",
        },
        values: [{ fieldId: field.definition.id, value: 1500 }],
      };
      const result = executeExternalCommand(commandArgs(root), JSON.stringify(input));

      expect(result).toEqual({
        exitCode: 0,
        response: {
          ok: true,
          capability: "candidature.create",
          created: true,
        },
      });
      const encodedResponse = JSON.stringify(result.response);
      expect(encodedResponse).not.toContain(root);
      expect(encodedResponse).not.toContain("Pilot vacancy");
      expect(encodedResponse).not.toContain("Private source material");

      const created = listCandidatures(root)[0];
      if (!created) throw new Error("Created candidature fixture is missing.");
      expect(created.values).toEqual([
        expect.objectContaining({ fieldId: field.definition.id, value: 1500 }),
      ]);

      const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
      try {
        expect(
          database
            .prepare("SELECT action FROM candidature_activity WHERE candidature_id = ?")
            .all(created.id),
        ).toEqual([{ action: "candidature.created" }]);
      } finally {
        database.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects malformed, invalid, oversized, and unsupported input without mutation", () => {
    const root = temporaryWorkspace();
    try {
      const valid = JSON.stringify({ values: [] });
      const cases = [
        executeExternalCommand(commandArgs(root), "{"),
        executeExternalCommand(
          commandArgs(root),
          JSON.stringify({ values: [{ fieldId: "not-a-uuid", value: 1 }] }),
        ),
        executeExternalCommand(commandArgs(root), "x".repeat(externalCommandMaxInputBytes + 1)),
        executeExternalCommand(commandArgs(root, "candidature.update"), valid),
        executeExternalCommand(["aaaat", "--external-command", "candidature.create"], valid),
      ];

      expect(cases.map((result) => result.response)).toEqual([
        { ok: false, error: "invalid-json" },
        { ok: false, error: "invalid-input" },
        { ok: false, error: "input-too-large" },
        { ok: false, error: "unsupported-capability" },
        { ok: false, error: "invalid-invocation" },
      ]);
      expect(cases.every((result) => result.exitCode === 2)).toBe(true);
      expect(listCandidatures(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("bounds stdin before mutation", async () => {
    const root = temporaryWorkspace();
    let output = "";
    const stdout = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });

    try {
      const exitCode = await runExternalCommandProcess(
        commandArgs(root),
        Readable.from(["x".repeat(externalCommandMaxInputBytes + 1)]),
        stdout,
      );

      expect(exitCode).toBe(2);
      expect(output).toBe('{"ok":false,"error":"input-too-large"}\n');
      expect(listCandidatures(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not initialize a missing workspace as a side effect", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-command-uninitialized-"));
    try {
      const result = executeExternalCommand(commandArgs(root), JSON.stringify({ values: [] }));
      expect(result).toEqual({
        exitCode: 2,
        response: { ok: false, error: "command-failed" },
      });
      expect(existsSync(path.join(root, "workspace.sqlite"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
