// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { listCandidatures } from "../src/main/candidature-service";
import {
  candidatureCreateToolName,
  createAaaatMcpServer,
  mcpWorkspaceFromInvocation,
} from "../src/main/mcp-server";
import { createOrOpenWorkspace } from "../src/main/workspace";

const candidatureInput = {
  company: "MCP Example Corp",
  role: "Protocol engineer",
  location: "Madrid",
  workMode: "Hybrid",
  salaryText: "",
  source: "MCP fixture",
  sourceUrl: "https://example.invalid/mcp",
  sourceText: "Private MCP source material",
  status: "saved" as const,
  applicationDate: "",
  notes: "Private MCP note",
};

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-mcp-"));
  createOrOpenWorkspace(root);
  return root;
}

async function connectedClient(root: string): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAaaatMcpServer(root);
  const client = new Client({ name: "aaaat-mcp-test", version: "1.0.0" });
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

describe("official MCP candidature server", () => {
  it("advertises only the bounded create tool and commits through normal activity", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const tools = await connection.client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual([candidatureCreateToolName]);

      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: candidatureInput,
      });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      expect(content).toMatchObject({ type: "text" });
      if (!content || content.type !== "text") {
        throw new Error("MCP candidature result is not text content.");
      }
      expect(JSON.parse(content.text)).toEqual({
        ok: true,
        capability: "candidature.create",
        created: true,
      });
      expect(content.text).not.toContain(root);
      expect(content.text).not.toContain("MCP Example Corp");
      expect(content.text).not.toContain("Private MCP source material");
      expect(content.text).not.toContain("Private MCP note");

      const candidatures = listCandidatures(root);
      expect(candidatures).toHaveLength(1);
      const created = candidatures[0];
      expect(created).toBeDefined();
      if (!created) throw new Error("Created MCP candidature fixture is missing.");
      expect(created).toMatchObject(candidatureInput);

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
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects schema-invalid calls before mutation", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: { company: "Incomplete" },
      });
      expect(result.isError).toBe(true);
      expect(listCandidatures(root)).toEqual([]);
    } finally {
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects missing workspaces and malformed process invocation without creating state", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-mcp-missing-"));
    try {
      expect(() => createAaaatMcpServer(root)).toThrow();
      expect(() => mcpWorkspaceFromInvocation(["aaaat", "--mcp"])).toThrow(
        "Invalid MCP invocation.",
      );
      expect(() =>
        mcpWorkspaceFromInvocation([
          "aaaat",
          "--mcp",
          "--workspace",
          root,
          "--workspace",
          root,
        ]),
      ).toThrow("Invalid MCP invocation.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
