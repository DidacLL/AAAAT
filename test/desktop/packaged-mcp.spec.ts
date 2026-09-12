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

function initializeWorkspaceFixture(root: string): void {
  const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
  const now = "2026-09-03T00:00:00.000Z";
  try {
    database.exec(readFileSync(path.resolve("src/main/schema.sql"), "utf8"));
    const metadata = database.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)");
    metadata.run("workspace.product", "AAAAT");
    metadata.run("workspace.initialized_at", now);
  } finally {
    database.close();
  }
}

function textContent(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Packaged MCP result is not text content.");
  }
  return content.text;
}

test("packaged executable exposes source-only candidature creation over MCP stdio", async () => {
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
    const names = tools.tools.map((tool) => tool.name);
    expect(names).toContain("candidature_create");
    expect(names).not.toContain("candidature_fields_list");

    const result = await client.callTool({
      name: "candidature_create",
      arguments: {
        source: {
          kind: "other",
          title: "packaged MCP smoke",
          url: "",
          sourceText: "private packaged MCP source",
        },
      },
    });
    expect(result.isError).not.toBe(true);
    const content = textContent(result);
    expect(JSON.parse(content)).toEqual({
      ok: true,
      capability: "candidature.create",
      created: true,
    });
    expect(content).not.toContain(root);
    expect(content).not.toContain("private packaged MCP source");

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

test("packaged executable keeps opportunity research read and Source return task-scoped", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-packaged-research-"));
  initializeWorkspaceFixture(root);
  const transport = new StdioClientTransport({
    command: packagedExecutable(),
    args: ["--mcp", "--workspace", root],
    env: childEnvironment(),
  });
  const client = new Client({ name: "aaaat-packaged-research-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);
    expect(names).toContain("opportunity_research_context_read");
    expect(names).toContain("candidature_source_add");
    expect(names).not.toContain("candidature_list");
    expect(names).not.toContain("candidature_get");
    expect(names).not.toContain("candidature_search");

    const created = await client.callTool({
      name: "candidature_create",
      arguments: {
        source: {
          kind: "job_posting",
          title: "private original Source",
          url: "",
          sourceText: "private original Source text",
        },
      },
    });
    expect(created.isError).not.toBe(true);

    const beforeSelection = await client.callTool({
      name: "opportunity_research_context_read",
      arguments: {},
    });
    expect(JSON.parse(textContent(beforeSelection))).toBeNull();

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
    let candidatureId: string;
    try {
      const candidature = database.prepare("SELECT id FROM candidatures LIMIT 1").get() as {
        id: string;
      };
      candidatureId = candidature.id;
      const organisation = database
        .prepare("SELECT id FROM candidature_fields WHERE system_key = ?")
        .get("candidature.organization") as { id: string };
      const notes = database
        .prepare("SELECT id FROM candidature_fields WHERE system_key = ?")
        .get("candidature.notes") as { id: string };
      const now = new Date().toISOString();
      const insertValue = database.prepare(
        `INSERT INTO candidature_field_values(
           candidature_id, field_id, value_json, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)`,
      );
      insertValue.run(candidatureId, organisation.id, JSON.stringify("Example Corp"), now, now);
      insertValue.run(candidatureId, notes.id, JSON.stringify("PRIVATE LOCAL NOTE"), now, now);
      database
        .prepare("UPDATE candidatures SET opportunity_research_selected = 1 WHERE id = ?")
        .run(candidatureId);
    } finally {
      database.close();
    }

    const selected = await client.callTool({
      name: "opportunity_research_context_read",
      arguments: {},
    });
    expect(selected.isError).not.toBe(true);
    const selectedText = textContent(selected);
    expect(JSON.parse(selectedText)).toEqual({
      information: [{ label: "Organisation", value: "Example Corp" }],
    });
    expect(selectedText).not.toContain(candidatureId);
    expect(selectedText).not.toContain("PRIVATE LOCAL NOTE");
    expect(selectedText).not.toContain("private original Source");
    expect(selectedText).not.toContain(root);

    const selectorAttempt = await client.callTool({
      name: "opportunity_research_context_read",
      arguments: { candidatureId },
    });
    expect(selectorAttempt.isError).toBe(true);

    const retained = await client.callTool({
      name: "candidature_source_add",
      arguments: {
        source: {
          kind: "conversation",
          title: "External research",
          url: "https://example.invalid/research",
          sourceText: "Useful findings returned by the external assistant.",
        },
      },
    });
    expect(retained.isError).not.toBe(true);
    expect(JSON.parse(textContent(retained))).toEqual({ retained: true });

    const reopened = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        reopened
          .prepare(
            "SELECT title, source_text AS sourceText FROM candidature_sources WHERE candidature_id = ? ORDER BY created_at, id",
          )
          .all(candidatureId),
      ).toEqual([
        { title: "private original Source", sourceText: "private original Source text" },
        {
          title: "External research",
          sourceText: "Useful findings returned by the external assistant.",
        },
      ]);
    } finally {
      reopened.close();
    }
  } finally {
    await client.close().catch(() => undefined);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
