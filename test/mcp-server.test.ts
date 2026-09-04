// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { createCandidatureField } from "../src/main/candidature-field-service";
import { listCandidatures } from "../src/main/candidature-service";
import {
  candidatureCreateToolName,
  candidatureFieldsListToolName,
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
  it("publishes the live bounded field catalogue and creates through the ordinary sparse mutation path", async () => {
    const root = temporaryWorkspace();
    const custom = createCandidatureField(root, {
      label: "Minimum flight hours",
      description: "Minimum total flight hours requested.",
      valueType: "number",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const connection = await connectedClient(root);
    try {
      const tools = await connection.client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([candidatureFieldsListToolName, candidatureCreateToolName]),
      );

      const catalogue = await connection.client.callTool({
        name: candidatureFieldsListToolName,
        arguments: {},
      });
      expect(catalogue.isError).not.toBe(true);
      const catalogueContent = catalogue.content[0];
      if (!catalogueContent || catalogueContent.type !== "text") {
        throw new Error("MCP catalogue result is not text content.");
      }
      const parsedCatalogue = JSON.parse(catalogueContent.text) as {
        fields: Array<{ id: string; label: string; valueType: string }>;
      };
      expect(parsedCatalogue.fields).toContainEqual(
        expect.objectContaining({
          id: custom.definition.id,
          label: "Minimum flight hours",
          valueType: "number",
        }),
      );

      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: {
          source: {
            kind: "job_posting",
            title: "Pilot vacancy",
            url: "https://example.invalid/pilot",
            sourceText: "Minimum 1,500 total hours.",
          },
          values: [{ fieldId: custom.definition.id, value: 1500 }],
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
      expect(created.values).toEqual([
        expect.objectContaining({ fieldId: custom.definition.id, value: 1500 }),
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

  it("rejects schema-invalid creation before mutation", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: { values: [{ fieldId: "not-a-uuid", value: 1 }] },
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
