// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import { updateCareerContext } from "../src/main/career-context-service";
import {
  careerContextReadToolName,
  createAaaatMcpServer,
} from "../src/main/mcp-server";
import { createOrOpenWorkspace } from "../src/main/workspace";
import { externalCareerContextSchema } from "../src/shared/external-assistant-contracts";

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-mcp-context-"));
  createOrOpenWorkspace(root);
  return root;
}

async function connectedClient(root: string): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAaaatMcpServer(root);
  const client = new Client({ name: "aaaat-mcp-context-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function textResult(content: readonly unknown[]): string {
  const first = content[0] as { type?: string; text?: string } | undefined;
  if (!first || first.type !== "text" || typeof first.text !== "string") {
    throw new Error("MCP career-context result is not text content.");
  }
  return first.text;
}

describe("external career-context MCP operation", () => {
  it("returns only non-empty user-written Career Context without local metadata or mutation", async () => {
    const root = temporaryWorkspace();
    updateCareerContext(root, {
      careerDirection: "Move toward staff-level platform engineering.",
      objectives: "",
      constraints: "No relocation outside Spain.",
      targetRoles: "Staff Platform Engineer",
      targetMarketsLocations: "Madrid; remote EU",
      workPreferences: "   ",
      applicationWritingPreferences: "Concise, evidence-led applications.",
    });
    createCandidature(root, {
      source: {
        kind: "recruiter_message",
        title: "MCP-PRIVATE-CANDIDATURE",
        url: "",
        sourceText: "MCP-PRIVATE-SOURCE-TEXT",
      },
      values: [],
    });

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    const activityBefore = database
      .prepare("SELECT COUNT(*) AS count FROM career_context_activity")
      .get() as { count: number };
    database.close();

    const connection = await connectedClient(root);
    try {
      const tools = await connection.client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain(careerContextReadToolName);

      const result = await connection.client.callTool({
        name: careerContextReadToolName,
        arguments: {},
      });
      expect(result.isError).not.toBe(true);
      const text = textResult(result.content);
      expect(externalCareerContextSchema.parse(JSON.parse(text))).toEqual({
        careerDirection: "Move toward staff-level platform engineering.",
        constraints: "No relocation outside Spain.",
        targetRoles: "Staff Platform Engineer",
        targetMarketsLocations: "Madrid; remote EU",
        applicationWritingPreferences: "Concise, evidence-led applications.",
      });
      expect(text).not.toContain(root);
      expect(text).not.toContain("workspace.sqlite");
      expect(text).not.toContain("MCP-PRIVATE-CANDIDATURE");
      expect(text).not.toContain("MCP-PRIVATE-SOURCE-TEXT");

      const invalidInput = await connection.client.callTool({
        name: careerContextReadToolName,
        arguments: { includeProfile: true },
      });
      expect(invalidInput.isError).toBe(true);
    } finally {
      await connection.close();
    }

    const afterDatabase = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        afterDatabase
          .prepare("SELECT COUNT(*) AS count FROM career_context_activity")
          .get(),
      ).toEqual(activityBefore);
    } finally {
      afterDatabase.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed when stored Career Context violates the authoritative schema", async () => {
    const root = temporaryWorkspace();
    const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
    try {
      database
        .prepare("UPDATE career_context SET career_direction = ? WHERE id = 1")
        .run("x".repeat(10001));
    } finally {
      database.close();
    }

    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: careerContextReadToolName,
        arguments: {},
      });
      expect(result.isError).toBe(true);
    } finally {
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
