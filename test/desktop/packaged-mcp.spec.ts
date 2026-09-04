import { createHash } from "node:crypto";
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

function childEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

const migrationFiles = [
  [1, "workspace", "001_workspace.sql"],
  [2, "profile", "002_profile.sql"],
  [3, "documents", "003_documents.sql"],
  [4, "candidatures", "004_candidatures.sql"],
  [5, "concepts", "005_concepts.sql"],
  [6, "activity", "006_activity.sql"],
] as const;

function initializeWorkspaceFixture(root: string): void {
  const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
  const now = "2026-09-03T00:00:00.000Z";
  try {
    database.exec(
      "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;",
    );
    for (const [version, name, file] of migrationFiles) {
      const sql = readFileSync(path.resolve("src/main/migrations", file), "utf8");
      database.exec("BEGIN IMMEDIATE");
      try {
        database.exec(sql);
        database
          .prepare(
            "INSERT INTO schema_migrations(version, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
          )
          .run(version, name, createHash("sha256").update(sql).digest("hex"), now);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
    database
      .prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
      .run("workspace.initialized_at", now);
  } finally {
    database.close();
  }
}

test("packaged executable exposes bounded live-field catalogue and sparse candidature creation over MCP stdio", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-mcp-"));
  initializeWorkspaceFixture(root);
  const transport = new StdioClientTransport({
    command: packagedExecutable(),
    args: ["--mcp", "--workspace", root],
    env: childEnvironment(),
  });
  const client = new Client({ name: "aaaat-packaged-mcp-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["candidature_fields_list", "candidature_create"]),
    );

    const catalogueResult = await client.callTool({
      name: "candidature_fields_list",
      arguments: {},
    });
    expect(catalogueResult.isError).not.toBe(true);
    const catalogueContent = catalogueResult.content[0];
    if (!catalogueContent || catalogueContent.type !== "text") {
      throw new Error("Packaged MCP catalogue result is not text content.");
    }
    const catalogue = JSON.parse(catalogueContent.text) as {
      fields: Array<{ id: string; label: string; valueType: string; cardinality: string }>;
    };
    expect(catalogue.fields.length).toBeGreaterThan(0);
    expect(catalogue.fields[0]).toMatchObject({
      id: expect.any(String),
      label: expect.any(String),
      valueType: expect.any(String),
      cardinality: expect.any(String),
    });

    const result = await client.callTool({
      name: "candidature_create",
      arguments: {
        source: {
          kind: "other",
          title: "packaged MCP smoke",
          url: "",
          sourceText: "private packaged MCP source",
        },
        values: [],
      },
    });
    expect(result.isError).not.toBe(true);
    const content = result.content[0];
    if (!content || content.type !== "text") {
      throw new Error("Packaged MCP candidature result is not text content.");
    }
    expect(JSON.parse(content.text)).toEqual({
      ok: true,
      capability: "candidature.create",
      created: true,
    });
    expect(content.text).not.toContain(root);
    expect(content.text).not.toContain("private packaged MCP source");

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(database.prepare("SELECT COUNT(*) AS count FROM candidatures").get()).toEqual({ count: 1 });
      expect(
        database.prepare("SELECT title, source_text AS sourceText FROM candidature_sources").all(),
      ).toEqual([
        { title: "packaged MCP smoke", sourceText: "private packaged MCP source" },
      ]);
      expect(database.prepare("SELECT COUNT(*) AS count FROM candidature_field_values").get()).toEqual({
        count: 0,
      });
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
