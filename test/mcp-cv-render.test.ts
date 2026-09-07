// @vitest-environment node

import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";

import {
  updateCvContentAccess,
  updateCvRenderAccess,
} from "../src/main/cv-content-access-service";
import { createDocument } from "../src/main/document-service";
import { createAaaatMcpServer, cvRenderToolName } from "../src/main/mcp-server";
import { createOrOpenWorkspace } from "../src/main/workspace";
import { externalCvRenderResultSchema } from "../src/shared/external-assistant-contracts";

const roots: string[] = [];
const originalPath = process.env.PATH;

function temporary(prefix: string): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function workspace(): string {
  const root = temporary("aaaat-mcp-cv-render-");
  createOrOpenWorkspace(root);
  return root;
}

function installFakeLatexmk(): void {
  const root = temporary("aaaat-mcp-cv-render-latex-");
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");\nconst path = require("node:path");\nconst cwd = process.cwd();\nfs.mkdirSync(path.join(cwd, "build"), { recursive: true });\nfs.writeFileSync(path.join(cwd, "build", "main.pdf"), "pdf");\n`,
    "utf8",
  );
  const executable = path.join(root, "latexmk");
  writeFileSync(executable, `#!/usr/bin/env node\nrequire(${JSON.stringify(script)});\n`, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(path.join(root, "latexmk.cmd"), `@node "${script}" %*\r\n`, "utf8");
  process.env.PATH = `${root}${path.delimiter}${originalPath ?? ""}`;
}

function createCv(root: string) {
  return createDocument(root, {
    kind: "cv",
    title: "MCP-PRIVATE-RENDER-TITLE",
    variantId: null,
    engine: "pdflatex",
    bodyParagraphs: [],
  });
}

async function connectedClient(root: string) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAaaatMcpServer(root);
  const client = new Client({ name: "aaaat-mcp-cv-render-test", version: "1.0.0" });
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
    throw new Error("MCP CV-render result is not text content.");
  }
  return first.text;
}

afterEach(() => {
  process.env.PATH = originalPath;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("external CV render MCP operation", () => {
  it("returns null without separate render authorization and rejects selector input", async () => {
    const root = workspace();
    const cv = createCv(root);
    updateCvContentAccess(root, { documentId: cv.id, allowed: true });
    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({ name: cvRenderToolName, arguments: {} });
      expect(externalCvRenderResultSchema.parse(JSON.parse(textResult(result.content)))).toBeNull();
      expect(existsSync(cv.artifactPath)).toBe(false);

      const broader = await connection.client.callTool({
        name: cvRenderToolName,
        arguments: { documentId: cv.id, outputPath: root },
      });
      expect(broader.isError).toBe(true);
      expect(existsSync(cv.artifactPath)).toBe(false);
    } finally {
      await connection.close();
    }
  });

  it("renders only the locally authorized CV through the normal document service and returns acknowledgement only", async () => {
    const root = workspace();
    installFakeLatexmk();
    const cv = createCv(root);
    updateCvContentAccess(root, { documentId: cv.id, allowed: true });
    updateCvRenderAccess(root, { documentId: cv.id, allowed: true });

    const connection = await connectedClient(root);
    try {
      const result = await connection.client.callTool({ name: cvRenderToolName, arguments: {} });
      expect(result.isError).not.toBe(true);
      const text = textResult(result.content);
      expect(externalCvRenderResultSchema.parse(JSON.parse(text))).toEqual({ rendered: true });
      expect(existsSync(cv.artifactPath)).toBe(true);
      expect(text).not.toContain(cv.id);
      expect(text).not.toContain(cv.title);
      expect(text).not.toContain(root);
      expect(text).not.toContain("latexmk");
    } finally {
      await connection.close();
    }
  });
});
