// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";

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
  configuratorStatusReadToolName,
  createAaaatMcpServer,
  cvContentReadToolName,
  cvDescriptionsReadToolName,
  cvRenderToolName,
  installerStatusReadToolName,
  mcpWorkspaceFromInvocation,
  opportunityResearchContextReadToolName,
} from "../src/main/mcp-server";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-mcp-"));
  createOrOpenWorkspace(root);
  roots.push(root);
  return root;
}

async function connectedClient(root: string) {
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
  if (!content || content.type !== "text") throw new Error("MCP result is not text content.");
  return content.text;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("official bounded MCP server", () => {
  it("exposes meaningful task capabilities without generic database/filesystem/shell authority", async () => {
    const connection = await connectedClient(temporaryWorkspace());
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
        installerStatusReadToolName,
        configuratorStatusReadToolName,
      ]);
      const names = tools.tools.map((tool) => tool.name);
      expect(names).not.toContain("candidature_list");
      expect(names).not.toContain("database_query");
      expect(names).not.toContain("filesystem_read");
      expect(names).not.toContain("shell_exec");
    } finally {
      await connection.close();
    }
  });

  it("creates a candidature only from one retained Source and returns no local identifier", async () => {
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
      const text = textResult(result);
      expect(JSON.parse(text)).toEqual({ ok: true, capability: "candidature.create", created: true });
      expect(text).not.toContain(root);
      expect(text).not.toContain("Pilot vacancy");
      expect(listCandidatures(root)).toHaveLength(1);
      expect(listCandidatureSources(root, listCandidatures(root)[0]!.id)[0]).toMatchObject({
        title: "Pilot vacancy",
        sourceText: "Minimum 1,500 total hours.",
      });
    } finally {
      await connection.close();
    }
  });

  it("uses local selection as the authority for bounded opportunity context and Source retention", async () => {
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
    updateCandidatureOpportunityResearchAccess(root, { candidatureId: candidature.id, allowed: true });

    const connection = await connectedClient(root);
    try {
      const selected = await connection.client.callTool({
        name: opportunityResearchContextReadToolName,
        arguments: {},
      });
      const selectedText = textResult(selected);
      expect(JSON.parse(selectedText)).toEqual({
        information: [{ label: "Organisation", value: "Example Corp" }],
      });
      expect(selectedText).not.toContain(candidature.id);
      expect(selectedText).not.toContain("PRIVATE SOURCE TEXT");

      const retained = await connection.client.callTool({
        name: candidatureSourceAddToolName,
        arguments: {
          source: {
            kind: "conversation",
            title: "External research",
            url: "",
            sourceText: "Useful external findings.",
          },
        },
      });
      expect(JSON.parse(textResult(retained))).toEqual({ retained: true });
      expect(listCandidatureSources(root, candidature.id)).toHaveLength(2);

      const rejectedSelector = await connection.client.callTool({
        name: opportunityResearchContextReadToolName,
        arguments: { candidatureId: candidature.id },
      });
      expect(rejectedSelector.isError).toBe(true);
    } finally {
      await connection.close();
    }
  });

  it("exposes installer/configurator status as read-only privacy-minimal state", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const installer = textResult(
        await connection.client.callTool({ name: installerStatusReadToolName, arguments: {} }),
      );
      const installerResult = JSON.parse(installer) as Record<string, unknown>;
      expect(installerResult.workspaceReady).toBe(true);
      expect(installerResult).toHaveProperty("documentRenderingReady");
      expect(installerResult).toHaveProperty("missingTools");
      expect(installer).not.toContain(root);
      expect(installer).not.toMatch(/version|path|commandLine/i);

      const configurator = textResult(
        await connection.client.callTool({ name: configuratorStatusReadToolName, arguments: {} }),
      );
      const configuratorResult = JSON.parse(configurator) as Record<string, unknown>;
      expect(configuratorResult).toMatchObject({
        configurationReadable: true,
        connectionCount: 0,
      });
      expect(configurator).not.toContain(root);
      expect(configurator).not.toMatch(/endpoint|connectionName|credential/i);
    } finally {
      await connection.close();
    }
  });

  it("rejects stale structured candidature authority and malformed process invocation", async () => {
    const root = temporaryWorkspace();
    const connection = await connectedClient(root);
    try {
      const stale = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: {
          operationRef: "stale",
          source: { kind: "job_posting", title: "Should not persist", url: "", sourceText: "stale" },
          values: [{ fieldRef: "stale", value: "Engineer" }],
        },
      });
      expect(stale.isError).toBe(true);
      expect(listCandidatures(root)).toEqual([]);
    } finally {
      await connection.close();
    }

    expect(() => mcpWorkspaceFromInvocation(["aaaat", "--mcp"])).toThrow("Invalid MCP invocation.");
  });
});
