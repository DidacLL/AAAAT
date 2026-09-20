// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applicationDocumentsCreateToolName,
  candidatureCreateToolName,
  candidatureSourceAddToolName,
  careerContextReadToolName,
  configuratorAiConnectionSaveToolName,
  configuratorAiOperationDefaultToolName,
  configuratorAiOperationValidateToolName,
  configuratorStatusReadToolName,
  createAaaatMcpServer,
  installerRenderingSelfTestToolName,
  installerStatusReadToolName,
  isMcpInvocation,
  mcpWorkspaceFromInvocation,
  opportunityResearchContextReadToolName,
} from "../src/main/mcp-server";
import { saveNamedAiConnection } from "../src/main/ai-connection-service";
import { listCandidatures, listCandidatureSources } from "../src/main/candidature-service";
import { listDocumentCollections } from "../src/main/document-domain-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-mcp-"));
  roots.push(root);
  createOrOpenWorkspace(root);
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
  vi.unstubAllGlobals();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("bounded MCP server", () => {
  it("exposes the current bounded product intentions without generic machine authority", async () => {
    const connection = await connectedClient(workspace());
    try {
      const tools = await connection.client.listTools();
      const names = tools.tools.map((tool) => tool.name);
      expect(names).toEqual([
        candidatureCreateToolName,
        applicationDocumentsCreateToolName,
        opportunityResearchContextReadToolName,
        candidatureSourceAddToolName,
        careerContextReadToolName,
        installerStatusReadToolName,
        installerRenderingSelfTestToolName,
        configuratorStatusReadToolName,
        configuratorAiConnectionSaveToolName,
        configuratorAiOperationValidateToolName,
        configuratorAiOperationDefaultToolName,
      ]);
      expect(names).not.toEqual(expect.arrayContaining(["database_query", "filesystem_read", "shell_exec"]));
    } finally {
      await connection.close();
    }
  });

  it("creates an application from one retained Source without returning local IDs", async () => {
    const root = workspace();
    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: candidatureCreateToolName,
        arguments: {
          source: {
            kind: "job_posting",
            title: "Platform vacancy",
            url: "https://example.invalid/jobs/platform",
            sourceText: "Raw retained vacancy text.",
          },
        },
      });
      expect(JSON.parse(textResult(result))).toEqual({
        ok: true,
        capability: "candidature.create",
        created: true,
      });
      const candidature = listCandidatures(root)[0];
      if (!candidature) throw new Error("application fixture missing");
      expect(listCandidatureSources(root, candidature.id)).toEqual([
        expect.objectContaining({ sourceText: "Raw retained vacancy text." }),
      ]);
      expect(textResult(result)).not.toContain(candidature.id);
    } finally {
      await connection.close();
    }
  });

  it("creates useful local application documents without invoking configured AAAAT AI or disclosing local authority", async () => {
    const root = workspace();
    saveNamedAiConnection(root, {
      name: "Configured AI",
      endpoint: "http://127.0.0.1:9/v1",
      model: "configured-test",
    });
    const fetchSpy = vi.fn(async () => {
      throw new Error("External application-material creation must not call an AI provider.");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const connection = await connectedClient(root);
    try {
      const sourceText = "Role: Platform Engineer\nBuild reliable platform services.";
      const result = await connection.client.callTool({
        name: applicationDocumentsCreateToolName,
        arguments: {
          sourceText,
          outputs: ["cv", "cover_letter"],
        },
      });
      const text = textResult(result);
      expect(JSON.parse(text)).toEqual({
        created: true,
        cv: { created: true },
        coverLetter: { created: true },
      });
      expect(fetchSpy).not.toHaveBeenCalled();

      const candidature = listCandidatures(root)[0];
      if (!candidature) throw new Error("application fixture missing");
      expect(candidature.values).toEqual([]);
      expect(listCandidatureSources(root, candidature.id)).toEqual([
        expect.objectContaining({ sourceText }),
      ]);
      const documents = listDocumentCollections(root);
      expect(documents.workingCvs).toEqual([
        expect.objectContaining({ candidatureId: candidature.id }),
      ]);
      expect(documents.letters).toEqual([
        expect.objectContaining({
          candidatureId: candidature.id,
          recipient: "Hiring team",
          subject: "Application for Platform Engineer",
          closing: "Kind regards",
        }),
      ]);
      expect(documents.letters[0]?.bodyParagraphs.length).toBeGreaterThan(0);
      expect(text).not.toContain(candidature.id);
      expect(text).not.toContain(root);
      expect(text).not.toContain("Platform Engineer");
    } finally {
      await connection.close();
    }
  });

  it("accepts only the explicit MCP workspace invocation shape", () => {
    expect(isMcpInvocation(["aaaat", "--mcp", "--workspace", "/tmp/workspace"])).toBe(true);
    expect(mcpWorkspaceFromInvocation(["aaaat", "--mcp", "--workspace", "/tmp/workspace"])).toBe("/tmp/workspace");
    expect(() => mcpWorkspaceFromInvocation(["aaaat", "--mcp"])).toThrow("Invalid MCP invocation");
  });
});
