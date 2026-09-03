// @vitest-environment node

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createOrOpenWorkspace } from "../src/main/workspace";
import {
  activateVscodeMcpSetup,
  parseVscodeMcpSetupInvocation,
  proposeVscodeMcpSetup,
} from "../src/main/vscode-mcp-setup";

const roots: string[] = [];

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-vscode-setup-"));
  const workspace = path.join(root, "workspace");
  const project = path.join(root, "project");
  const executable = path.join(root, process.platform === "win32" ? "aaaat.exe" : "aaaat");
  mkdirSync(workspace);
  mkdirSync(project);
  writeFileSync(executable, "fixture", "utf8");
  createOrOpenWorkspace(workspace);
  roots.push(root);
  return { workspace, project, executable };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("VS Code MCP setup", () => {
  it("writes a portable proposed manifest without machine paths or secrets", () => {
    const { workspace, project, executable } = fixture();
    const manifest = proposeVscodeMcpSetup(workspace, project);
    expect(manifest).toMatchObject({
      version: 1,
      kind: "aaaat.host-integration",
      host: "vscode",
      state: "proposed",
      transport: "stdio",
      capabilityNames: ["candidature.create"],
      toolNames: ["candidature_create"],
      recipeId: "vscode.mcp",
    });
    const text = readFileSync(path.join(workspace, "integrations", "vscode-mcp.json"), "utf8");
    expect(text).not.toContain(workspace);
    expect(text).not.toContain(project);
    expect(text).not.toContain(executable);
    expect(text).not.toMatch(/token|password|secret/i);
  });

  it("validates connection before writing the exact VS Code stdio entry", async () => {
    const { workspace, project, executable } = fixture();
    proposeVscodeMcpSetup(workspace, project);
    const verify = vi.fn(async () => undefined);
    const state = await activateVscodeMcpSetup(
      { workspacePath: workspace, projectPath: project, executablePath: executable },
      verify,
    );
    expect(state).toBe("configured");
    expect(verify).toHaveBeenCalledTimes(1);
    expect(JSON.parse(readFileSync(path.join(project, ".vscode", "mcp.json"), "utf8"))).toEqual({
      servers: {
        aaaat: {
          type: "stdio",
          command: executable,
          args: ["--mcp", "--workspace", workspace],
        },
      },
    });
  });

  it("accepts an existing compatible entry and refuses a conflicting one", async () => {
    const { workspace, project, executable } = fixture();
    proposeVscodeMcpSetup(workspace, project);
    const vscode = path.join(project, ".vscode");
    mkdirSync(vscode);
    const configPath = path.join(vscode, "mcp.json");
    const compatible = {
      servers: {
        aaaat: {
          type: "stdio",
          command: executable,
          args: ["--mcp", "--workspace", workspace],
        },
      },
    };
    writeFileSync(configPath, JSON.stringify(compatible, null, 2) + "\n", "utf8");
    const verify = vi.fn(async () => undefined);
    await expect(
      activateVscodeMcpSetup(
        { workspacePath: workspace, projectPath: project, executablePath: executable },
        verify,
      ),
    ).resolves.toBe("already-configured");

    const conflicting = { servers: { aaaat: { type: "stdio", command: "other", args: [] } } };
    writeFileSync(configPath, JSON.stringify(conflicting, null, 2) + "\n", "utf8");
    await expect(
      activateVscodeMcpSetup(
        { workspacePath: workspace, projectPath: project, executablePath: executable },
        verify,
      ),
    ).rejects.toThrow("conflicting AAAAT");
    expect(JSON.parse(readFileSync(configPath, "utf8"))).toEqual(conflicting);
  });

  it("requires the exact bounded setup invocation", () => {
    expect(
      parseVscodeMcpSetupInvocation([
        "aaaat",
        "--vscode-mcp-setup",
        "--workspace",
        "workspace",
        "--project",
        "project",
        "--activate",
      ]),
    ).toEqual({ workspacePath: "workspace", projectPath: "project", activate: true });
    expect(() =>
      parseVscodeMcpSetupInvocation([
        "aaaat",
        "--vscode-mcp-setup",
        "--workspace",
        "workspace",
        "--project",
        "project",
        "--activate",
        "--activate",
      ]),
    ).toThrow("Invalid VS Code setup invocation.");
  });
});
