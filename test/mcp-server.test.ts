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
      label: "Work arrangement",
      description: "Requested work arrangement.",
      valueType: "choice",
      cardinality: "one",
      choices: [{ id: "00000000-0000-4000-8000-000000000021", label: "Remote" }],
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
        operationRef: string;
        fields: Array<{ fieldRef: string; label: string; valueType: string; choices: Array<{ choiceRef: string; label: string }> }>;
      };
      expect(parsedCatalogue.fields).toContainEqual(
        expect.objectContaining({
          label: "Work arrangement",
          valueType: "choice",
        }),
      );
      expect(catalogueContent.text).not.toContain(custom.definition.id);
      const field = parsedCatalogue.fields.find((candidate) => candidate.label === "Work arrangement");
      if (!field) throw new Error("MCP field fixture missing.");

      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: {
          operationRef: parsedCatalogue.operationRef,
          source: {
            kind: "job_posting",
            title: "Pilot vacancy",
            url: "https://example.invalid/pilot",
            sourceText: "Minimum 1,500 total hours.",
          },
          values: [{ fieldRef: field.fieldRef, value: field.choices[0]?.choiceRef }],
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
        expect.objectContaining({ fieldId: custom.definition.id, value: "00000000-0000-4000-8000-000000000021" }),
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
        arguments: { source: { kind: "not-a-source-kind" } },
      });
      expect(result.isError).toBe(true);
      expect(listCandidatures(root)).toEqual([]);
    } finally {
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("creates a raw source without first discovering fields", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: {
          source: {
            kind: "job_posting",
            title: "Raw opportunity",
            url: "https://example.invalid/opportunity",
            sourceText: "Keep this source before structuring it.",
          },
          values: [],
        },
      });
      expect(result.isError).not.toBe(true);
      expect(listCandidatures(root)).toHaveLength(1);
    } finally {
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects operation references from another field-list call", async () => {
    const root = temporaryWorkspace();
    const field = createCandidatureField(root, {
      label: "Role", description: "", valueType: "text", cardinality: "one", choices: [], enabled: true,
    });
    const connection = await connectedClient(root);
    try {
      const list = async () => {
        const result = await connection.client.callTool({ name: candidatureFieldsListToolName, arguments: {} });
        const content = result.content[0];
        if (!content || content.type !== "text") throw new Error("MCP list fixture missing.");
        return JSON.parse(content.text) as { operationRef: string; fields: Array<{ fieldRef: string }> };
      };
      const first = await list();
      const second = await list();
      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: { operationRef: second.operationRef, values: [{ fieldRef: first.fields[0]?.fieldRef, value: "Engineer" }] },
      });
      expect(result.isError).toBe(true);
      expect(listCandidatures(root)).toEqual([]);
      expect(field.definition.id).not.toBe(first.fields[0]?.fieldRef);
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
