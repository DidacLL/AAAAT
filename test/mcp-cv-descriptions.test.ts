// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import { updateCvDescriptor } from "../src/main/cv-descriptor-service";
import { createDocument } from "../src/main/document-service";
import {
  createAaaatMcpServer,
  cvDescriptionsReadToolName,
} from "../src/main/mcp-server";
import { createOrOpenWorkspace } from "../src/main/workspace";
import { externalCvDescriptionsSchema } from "../src/shared/external-assistant-contracts";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-mcp-cv-description-"));
  createOrOpenWorkspace(root);
  roots.push(root);
  return root;
}

function createCv(root: string, title: string, bodyParagraphs: string[] = []) {
  return createDocument(root, {
    kind: "cv",
    title,
    variantId: null,
    engine: "pdflatex",
    bodyParagraphs,
  });
}

async function connectedClient(root: string): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAaaatMcpServer(root);
  const client = new Client({ name: "aaaat-mcp-cv-description-test", version: "1.0.0" });
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
    throw new Error("MCP CV-description result is not text content.");
  }
  return first.text;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("external CV-description MCP operation", () => {
  it("returns only explicit descriptors under response-local labels", async () => {
    const root = workspace();
    const first = createCv(root, "MCP-PRIVATE-CV-TITLE-ONE", ["MCP-PRIVATE-CV-CONTENT-ONE"]);
    const second = createCv(root, "MCP-PRIVATE-CV-TITLE-TWO", ["MCP-PRIVATE-CV-CONTENT-TWO"]);
    createCv(root, "MCP-BLANK-CV-TITLE", ["MCP-BLANK-CV-CONTENT"]);
    createDocument(root, {
      kind: "cover_letter",
      title: "MCP-PRIVATE-LETTER-TITLE",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: ["MCP-PRIVATE-LETTER-CONTENT"],
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
    updateCvDescriptor(root, {
      documentId: first.id,
      tags: ["platform", "leadership"],
      notes: "Strong staff-level platform evidence.",
    });
    updateCvDescriptor(root, {
      documentId: second.id,
      tags: ["backend"],
      notes: null,
    });

    const connection = await connectedClient(root);
    try {
      const tools = await connection.client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain(cvDescriptionsReadToolName);

      const result = await connection.client.callTool({
        name: cvDescriptionsReadToolName,
        arguments: {},
      });
      expect(result.isError).not.toBe(true);
      const text = textResult(result.content);
      const parsed = externalCvDescriptionsSchema.parse(JSON.parse(text));
      expect(parsed.cvs.map((cv) => cv.label)).toEqual(["CV 1", "CV 2"]);
      expect(parsed.cvs).toEqual(
        expect.arrayContaining([
          {
            label: expect.stringMatching(/^CV [12]$/),
            tags: ["platform", "leadership"],
            notes: "Strong staff-level platform evidence.",
          },
          {
            label: expect.stringMatching(/^CV [12]$/),
            tags: ["backend"],
          },
        ]),
      );
      expect(text).not.toContain(first.id);
      expect(text).not.toContain(second.id);
      expect(text).not.toContain(root);
      expect(text).not.toContain("MCP-PRIVATE-CV-TITLE");
      expect(text).not.toContain("MCP-PRIVATE-CV-CONTENT");
      expect(text).not.toContain("MCP-BLANK-CV");
      expect(text).not.toContain("MCP-PRIVATE-LETTER");
      expect(text).not.toContain("MCP-PRIVATE-CANDIDATURE");
      expect(text).not.toContain("MCP-PRIVATE-SOURCE-TEXT");

      const broader = await connection.client.callTool({
        name: cvDescriptionsReadToolName,
        arguments: { includeContent: true },
      });
      expect(broader.isError).toBe(true);
    } finally {
      await connection.close();
    }
  });

  it("fails closed when a stored descriptor is malformed", async () => {
    const root = workspace();
    const cv = createCv(root, "Malformed CV");
    const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
    try {
      database.prepare("UPDATE documents SET ai_tags_json = ? WHERE id = ?").run("bad-json", cv.id);
    } finally {
      database.close();
    }

    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({
        name: cvDescriptionsReadToolName,
        arguments: {},
      });
      expect(result.isError).toBe(true);
    } finally {
      await connection.close();
    }
  });
});
