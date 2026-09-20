import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { expect, test } from "@playwright/test";

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

function initializeWorkspaceFixture(root: string): void {
  const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
  const schemaSql = readFileSync(path.resolve("src/main/schema.sql"), "utf8");
  try {
    database.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
    try {
      database.exec(schemaSql);
      database
        .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
        .run("workspace.initialized_at", "2026-09-15T00:00:00.000Z");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }
}

function textContent(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content[0];
  if (!content || content.type !== "text") throw new Error("Packaged MCP result is not text content.");
  return content.text;
}

test("packaged host-neutral application intention creates complete manual document work without exposing IDs", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-application-intent-"));
  initializeWorkspaceFixture(root);
  const transport = new StdioClientTransport({
    command: packagedExecutable(),
    args: ["--mcp", "--workspace", root],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  });
  const client = new Client({ name: "aaaat-packaged-application-intent", version: "1.0.0" });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("application_documents_create");

    const result = await client.callTool({
      name: "application_documents_create",
      arguments: {
        sourceText: "Packaged intent offer: platform engineer working on reliable distributed systems.",
        outputs: ["cv", "cover_letter"],
      },
    });
    expect(result.isError).not.toBe(true);
    const text = textContent(result);
    expect(JSON.parse(text)).toEqual({
      created: true,
      cv: { created: true, aiPrepared: false },
      coverLetter: { created: true, aiPrepared: false },
    });
    expect(text).not.toContain(root);
    expect(text).not.toContain("platform engineer");

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(database.prepare("SELECT COUNT(*) AS count FROM candidatures").get()).toEqual({ count: 1 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM working_cvs WHERE candidature_id = (SELECT id FROM candidatures)").get()).toEqual({ count: 1 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM cover_letters WHERE candidature_id = (SELECT id FROM candidatures)").get()).toEqual({ count: 1 });
      expect(database.prepare("SELECT source_text AS sourceText FROM candidature_sources").get()).toEqual({
        sourceText: "Packaged intent offer: platform engineer working on reliable distributed systems.",
      });
    } finally {
      database.close();
    }
  } finally {
    await client.close().catch(() => undefined);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
