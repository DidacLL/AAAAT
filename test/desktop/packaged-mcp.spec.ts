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

function childEnvironment(executable: string, workspace: string): Record<string, string> {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  if (process.platform === "win32") {
    environment.AAAAT_MCP_EXE = executable;
    environment.AAAAT_MCP_WORKSPACE = workspace;
  }
  return environment;
}

function transportParameters(executable: string, workspace: string) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        '"%AAAAT_MCP_EXE%" --mcp --workspace "%AAAAT_MCP_WORKSPACE%"',
      ],
      env: childEnvironment(executable, workspace),
    };
  }
  return {
    command: executable,
    args: ["--mcp", "--workspace", workspace],
    env: childEnvironment(executable, workspace),
  };
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
  initializeWorkspaceFixture(root);
  const executable = packagedExecutable();
  const transport = new StdioClientTransport(transportParameters(executable, root));
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
