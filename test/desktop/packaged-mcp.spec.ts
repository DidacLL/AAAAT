import { readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { expect, test } from "@playwright/test";

import { createOrOpenWorkspace } from "../../src/main/workspace";

function packagedExecutable(): string {
  const packageRoot = path.resolve("out", "AAAAT-" + process.platform + "-" + process.arch);
  if (process.platform === "darwin") {
    const bundle = readdirSync(packageRoot).find((entry) => entry.endsWith(".app"));
    if (!bundle) throw new Error("Packaged macOS application bundle is missing");
    const executableDirectory = path.join(packageRoot, bundle, "Contents", "MacOS");
    const executable = readdirSync(executableDirectory)[0];
    if (!executable) throw new Error("Packaged macOS executable is missing");
    return path.join(executableDirectory, executable);
  }
  return path.join(packageRoot, process.platform === "win32" ? "aaaat.exe" : "aaaat");
}

const candidatureInput = {
  company: "Packaged MCP Corp",
  role: "Packaged protocol proof",
  location: "",
  workMode: "",
  salaryText: "",
  source: "packaged MCP smoke",
  sourceUrl: "",
  sourceText: "private packaged MCP source",
  status: "saved",
  applicationDate: "",
  nextAction: "Review",
  nextActionDate: "",
  notes: "private packaged MCP note",
};

test("packaged executable serves only bounded candidature creation over official MCP stdio", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-mcp-"));
  createOrOpenWorkspace(root);
  const transport = new StdioClientTransport({
    command: packagedExecutable(),
    args: ["--mcp", "--workspace", root],
  });
  const client = new Client({ name: "aaaat-packaged-mcp-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(["candidature_create"]);

    const result = await client.callTool({
      name: "candidature_create",
      arguments: candidatureInput,
    });
    expect(result.isError).not.toBe(true);
    const content = result.content[0];
    expect(content).toMatchObject({ type: "text" });
    if (!content || content.type !== "text") {
      throw new Error("Packaged MCP candidature result is not text content.");
    }
    expect(JSON.parse(content.text)).toEqual({
      ok: true,
      capability: "candidature.create",
      created: true,
    });
    expect(content.text).not.toContain(root);
    expect(content.text).not.toContain("Packaged MCP Corp");
    expect(content.text).not.toContain("private packaged MCP source");
    expect(content.text).not.toContain("private packaged MCP note");

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        database
          .prepare("SELECT company, role, source_text AS sourceText FROM candidatures")
          .all(),
      ).toEqual([
        {
          company: "Packaged MCP Corp",
          role: "Packaged protocol proof",
          sourceText: "private packaged MCP source",
        },
      ]);
      expect(database.prepare("SELECT action FROM candidature_activity").all()).toEqual([
        { action: "candidature.created" },
      ]);
    } finally {
      database.close();
    }
  } finally {
    await client.close().catch(() => undefined);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
