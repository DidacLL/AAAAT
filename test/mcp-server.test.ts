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
  it("exposes source-only candidature creation through the ordinary mutation path", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const tools = await connection.client.listTools();
      const names = tools.tools.map((tool) => tool.name);
      expect(names).toContain(candidatureCreateToolName);
      expect(names).not.toContain("candidature_fields_list");

      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: {
          source: {
            kind: "job_posting",
            title: "Pilot vacancy",
            url: "https://example.invalid/pilot",
            sourceText: "Minimum 1,500 total hours.",
          },
        },
      });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (!content || content.type !== "text") {
        throw new Error("MCP candidature result is not text content.");
      }
      expect(JSON.parse(content.text)).toEqual({
        ok: true,
        capability: "candidature.create",
        created: true,
      });
      expect(content.text).not.toContain(root);
      expect(content.text).not.toContain("Pilot vacancy");

      const created = listCandidatures(root)[0];
      if (!created) throw new Error("Created candidature fixture is missing.");
      expect(created.values).toEqual([]);
      expect(created.sources).toEqual([
        expect.objectContaining({
          kind: "job_posting",
          title: "Pilot vacancy",
          url: "https://example.invalid/pilot",
          sourceText: "Minimum 1,500 total hours.",
        }),
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
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects the removed structured creation contract before mutation", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: {
          operationRef: "aaaat_mcp_stale",
          source: {
            kind: "job_posting",
            title: "Should not persist",
            url: "",
            sourceText: "Structured input is no longer an MCP capability.",
          },
          values: [{ fieldRef: "aaaat_field_stale", value: "Engineer" }],
        },
      });
      expect(result.isError).toBe(true);
      expect(listCandidatures(root)).toEqual([]);
    } finally {
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects schema-invalid creation before mutation", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: { source: { kind: "not-a-source-kind" } },
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
