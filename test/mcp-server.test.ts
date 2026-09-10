// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import {
  listCandidatureFields,
  setCandidatureFieldValue,
} from "../src/main/candidature-field-service";
import { updateCandidatureOpportunityResearchAccess } from "../src/main/candidature-opportunity-research-access-service";
import {
  createCandidature,
  listCandidatures,
  listCandidatureSources,
} from "../src/main/candidature-service";
import {
  candidatureCreateToolName,
  candidatureSourceAddToolName,
  careerContextReadToolName,
  createAaaatMcpServer,
  cvContentReadToolName,
  cvDescriptionsReadToolName,
  cvRenderToolName,
  mcpWorkspaceFromInvocation,
  opportunityResearchContextReadToolName,
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

function textResult(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content[0];
  if (!content || content.type !== "text") {
    throw new Error("MCP result is not text content.");
  }
  return content.text;
}

describe("official MCP candidature server", () => {
  it("exposes exactly the bounded live tool set", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const tools = await connection.client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual([
        candidatureCreateToolName,
        opportunityResearchContextReadToolName,
        candidatureSourceAddToolName,
        careerContextReadToolName,
        cvDescriptionsReadToolName,
        cvContentReadToolName,
        cvRenderToolName,
      ]);
      const names = tools.tools.map((tool) => tool.name);
      expect(names).not.toContain("candidature_list");
      expect(names).not.toContain("candidature_get");
      expect(names).not.toContain("candidature_search");
      expect(names).not.toContain("database_query");
    } finally {
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("exposes source-only candidature creation through the ordinary mutation path", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
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
      const text = textResult(result);
      expect(JSON.parse(text)).toEqual({
        ok: true,
        capability: "candidature.create",
        created: true,
      });
      expect(text).not.toContain(root);
      expect(text).not.toContain("Pilot vacancy");

      const created = listCandidatures(root)[0];
      if (!created) throw new Error("Created candidature fixture is missing.");
      expect(created.values).toEqual([]);

      const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
      try {
        expect(
          database
            .prepare(
              "SELECT kind, title, url, source_text AS sourceText FROM candidature_sources WHERE candidature_id = ?",
            )
            .all(created.id),
        ).toEqual([
          {
            kind: "job_posting",
            title: "Pilot vacancy",
            url: "https://example.invalid/pilot",
            sourceText: "Minimum 1,500 total hours.",
          },
        ]);
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

  it("reads one locally selected task context and retains only a Source back to it", async () => {
    const root = temporaryWorkspace();
    const candidature = createCandidature(root, {
      source: {
        kind: "job_posting",
        title: "PRIVATE SOURCE TITLE",
        url: "https://private-source.invalid",
        sourceText: "PRIVATE SOURCE TEXT",
      },
      values: [],
    });
    const organisation = listCandidatureFields(root).find(
      (field) => field.definition.systemKey === "candidature.organization",
    );
    if (!organisation) throw new Error("Organisation fixture is missing.");
    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: organisation.definition.id,
      value: "Example Corp",
    });

    const connection = await connectedClient(root);
    try {
      const noSelection = await connection.client.callTool({
        name: opportunityResearchContextReadToolName,
        arguments: {},
      });
      expect(JSON.parse(textResult(noSelection))).toBeNull();

      const noSelectionWrite = await connection.client.callTool({
        name: candidatureSourceAddToolName,
        arguments: {
          source: {
            kind: "conversation",
            title: "Should not persist",
            url: "",
            sourceText: "No task selection exists.",
          },
        },
      });
      expect(JSON.parse(textResult(noSelectionWrite))).toBeNull();
      expect(listCandidatureSources(root, candidature.id)).toHaveLength(1);

      updateCandidatureOpportunityResearchAccess(root, {
        candidatureId: candidature.id,
        allowed: true,
      });
      const selected = await connection.client.callTool({
        name: opportunityResearchContextReadToolName,
        arguments: {},
      });
      const selectedText = textResult(selected);
      expect(JSON.parse(selectedText)).toEqual({
        information: [{ label: "Organisation", value: "Example Corp" }],
      });
      expect(selectedText).not.toContain(candidature.id);
      expect(selectedText).not.toContain("PRIVATE SOURCE TITLE");
      expect(selectedText).not.toContain("private-source.invalid");
      expect(selectedText).not.toContain("PRIVATE SOURCE TEXT");
      expect(selectedText).not.toContain(root);

      const retained = await connection.client.callTool({
        name: candidatureSourceAddToolName,
        arguments: {
          source: {
            kind: "conversation",
            title: "External research",
            url: "https://example.invalid/findings",
            sourceText: "Useful external findings.",
          },
        },
      });
      const retainedText = textResult(retained);
      expect(JSON.parse(retainedText)).toEqual({ retained: true });
      expect(retainedText).not.toContain(candidature.id);
      expect(retainedText).not.toContain("Useful external findings.");
      expect(listCandidatureSources(root, candidature.id)).toEqual([
        expect.objectContaining({ title: "PRIVATE SOURCE TITLE" }),
        expect.objectContaining({ title: "External research", sourceText: "Useful external findings." }),
      ]);
    } finally {
      await connection.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects caller selection authority and invalid Source writes", async () => {
    const root = temporaryWorkspace();
    const candidature = createCandidature(root, { values: [] });
    updateCandidatureOpportunityResearchAccess(root, {
      candidatureId: candidature.id,
      allowed: true,
    });
    const connection = await connectedClient(root);
    try {
      const read = await connection.client.callTool({
        name: opportunityResearchContextReadToolName,
        arguments: { candidatureId: candidature.id },
      });
      expect(read.isError).toBe(true);

      const writeWithSelector = await connection.client.callTool({
        name: candidatureSourceAddToolName,
        arguments: {
          candidatureId: candidature.id,
          source: {
            kind: "other",
            title: "Should not persist",
            url: "",
            sourceText: "Selector authority is forbidden.",
          },
        },
      });
      expect(writeWithSelector.isError).toBe(true);

      const emptyWrite = await connection.client.callTool({
        name: candidatureSourceAddToolName,
        arguments: {
          source: { kind: "other", title: " ", url: "\t", sourceText: "\n" },
        },
      });
      expect(emptyWrite.isError).toBe(true);
      expect(listCandidatureSources(root, candidature.id)).toEqual([]);
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

  it("rejects an empty retained Source before mutation", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: {
          source: {
            kind: "other",
            title: "   ",
            url: "\t",
            sourceText: "\n  ",
          },
        },
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
