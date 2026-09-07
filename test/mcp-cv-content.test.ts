// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import { updateCvContentAccess } from "../src/main/cv-content-access-service";
import { updateCvDescriptor } from "../src/main/cv-descriptor-service";
import {
  configureDocumentItem,
  createDocument,
  reorderDocument,
} from "../src/main/document-service";
import { createAaaatMcpServer, cvContentReadToolName } from "../src/main/mcp-server";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";
import { externalCvContentSchema } from "../src/shared/external-assistant-contracts";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-mcp-cv-content-"));
  createOrOpenWorkspace(root);
  roots.push(root);
  return root;
}

async function connectedClient(root: string): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAaaatMcpServer(root);
  const client = new Client({ name: "aaaat-mcp-cv-content-test", version: "1.0.0" });
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
    throw new Error("MCP CV-content result is not text content.");
  }
  return first.text;
}

function activityCount(root: string): number {
  const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
  try {
    return (
      database.prepare("SELECT COUNT(*) AS count FROM document_activity").get() as { count: number }
    ).count;
  } finally {
    database.close();
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("external CV-content MCP operation", () => {
  it("returns null without local permission and rejects all document selectors", async () => {
    const root = workspace();
    const connection = await connectedClient(root);
    try {
      const tools = await connection.client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain(cvContentReadToolName);

      const result = await connection.client.callTool({ name: cvContentReadToolName, arguments: {} });
      expect(result.isError).not.toBe(true);
      expect(JSON.parse(textResult(result.content))).toBeNull();

      const selectedByCaller = await connection.client.callTool({
        name: cvContentReadToolName,
        arguments: { documentId: "00000000-0000-4000-8000-000000000001" },
      });
      expect(selectedByCaller.isError).toBe(true);
    } finally {
      await connection.close();
    }
  });

  it("returns only the selected CV's effective ordered and overridden content without local metadata", async () => {
    const root = workspace();
    addProfileItem(root, {
      kind: "summary",
      title: "Original summary",
      description: "MCP-EFFECTIVE-SUMMARY-DESCRIPTION",
    });
    addProfileItem(root, {
      kind: "experience",
      title: "MCP-EFFECTIVE-EXPERIENCE",
      subtitle: "Example Corp",
      description: "MCP-EFFECTIVE-EXPERIENCE-DESCRIPTION",
      startDate: "2024",
      endDate: "2026",
      url: "https://example.test/experience",
    });
    const profile = addProfileItem(root, { kind: "skill", title: "MCP-EXCLUDED-SKILL" });
    const summary = profile.items.find((item) => item.kind === "summary");
    const experience = profile.items.find((item) => item.kind === "experience");
    const skill = profile.items.find((item) => item.kind === "skill");
    if (!summary || !experience || !skill) throw new Error("Expected profile items");

    const cv = createDocument(root, {
      kind: "cv",
      title: "MCP-PRIVATE-DOCUMENT-TITLE",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    configureDocumentItem(root, {
      documentId: cv.id,
      itemId: summary.id,
      included: true,
      contentPatch: { title: "MCP-OVERRIDDEN-SUMMARY" },
    });
    configureDocumentItem(root, {
      documentId: cv.id,
      itemId: skill.id,
      included: false,
      contentPatch: null,
    });
    reorderDocument(root, {
      documentId: cv.id,
      itemIds: [experience.id, summary.id, skill.id],
    });
    updateCvDescriptor(root, {
      documentId: cv.id,
      tags: ["MCP-PRIVATE-DESCRIPTOR-TAG"],
      notes: "MCP-PRIVATE-DESCRIPTOR-NOTE",
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
    updateCvContentAccess(root, { documentId: cv.id, allowed: true });
    const before = activityCount(root);

    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({ name: cvContentReadToolName, arguments: {} });
      expect(result.isError).not.toBe(true);
      const text = textResult(result.content);
      const parsed = externalCvContentSchema.parse(JSON.parse(text));
      expect(parsed).toEqual({
        items: [
          {
            kind: "experience",
            title: "MCP-EFFECTIVE-EXPERIENCE",
            subtitle: "Example Corp",
            description: "MCP-EFFECTIVE-EXPERIENCE-DESCRIPTION",
            startDate: "2024",
            endDate: "2026",
            url: "https://example.test/experience",
          },
          {
            kind: "summary",
            title: "MCP-OVERRIDDEN-SUMMARY",
            description: "MCP-EFFECTIVE-SUMMARY-DESCRIPTION",
          },
        ],
      });
      expect(text).not.toContain(cv.id);
      expect(text).not.toContain(summary.id);
      expect(text).not.toContain(experience.id);
      expect(text).not.toContain(skill.id);
      expect(text).not.toContain(root);
      expect(text).not.toContain("MCP-PRIVATE-DOCUMENT-TITLE");
      expect(text).not.toContain("MCP-EXCLUDED-SKILL");
      expect(text).not.toContain("MCP-PRIVATE-DESCRIPTOR");
      expect(text).not.toContain("MCP-PRIVATE-CANDIDATURE");
      expect(text).not.toContain("MCP-PRIVATE-SOURCE-TEXT");
      expect(text).not.toMatch(/sortOrder|documentId|variantId|projectPath|sourcePath|artifactPath/);
      expect(activityCount(root)).toBe(before);
    } finally {
      await connection.close();
    }
  });

  it("fails closed when selected effective content exceeds the external contract", async () => {
    const root = workspace();
    for (let index = 0; index < 201; index += 1) {
      addProfileItem(root, { kind: "skill", title: `Skill ${index}` });
    }
    const cv = createDocument(root, {
      kind: "cv",
      title: "Oversized private CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    updateCvContentAccess(root, { documentId: cv.id, allowed: true });

    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({ name: cvContentReadToolName, arguments: {} });
      expect(result.isError).toBe(true);
    } finally {
      await connection.close();
    }
  });
});
