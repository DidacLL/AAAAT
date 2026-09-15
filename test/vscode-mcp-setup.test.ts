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

function expectedServerEntry(executable: string, workspace: string) {
  return {
    type: "stdio",
    command: executable,
    args: ["--mcp", "--workspace", workspace],
    ...(process.platform === "win32" ? { env: { ELECTRON_NO_ATTACH_CONSOLE: "1" } } : {}),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("optional VS Code MCP adapter", () => {
  it("writes a portable proposed adapter manifest for the shared bounded capability contract", () => {
    const { workspace, project, executable } = fixture();
    const manifest = proposeVscodeMcpSetup(workspace, project);
    expect(manifest).toMatchObject({
      version: 1,
      kind: "aaaat.host-integration",
      host: "vscode",
      state: "proposed",
      transport: "stdio",
      recipeId: "vscode.mcp",
    });
    expect(manifest.capabilityNames).toEqual([
      "candidature.create",
      "application.documents.create",
      "opportunity_research.context.read",
      "candidature.source.add",
      "career_context.read",
      "cv_descriptions.read",
      "cv_content.read",
      "cv.render",
      "installer.status.read",
      "installer.rendering.self_test",
      "configurator.status.read",
      "configurator.ai_connection.save",
      "configurator.ai_operation.validate",
      "configurator.ai_operation.default",
    ]);
    expect(manifest.toolNames).toEqual([
      "candidature_create",
      "application_documents_create",
      "opportunity_research_context_read",
      "candidature_source_add",
      "career_context_read",
      "cv_descriptions_read",
      "cv_content_read",
      "cv_render",
      "installer_status_read",
      "installer_rendering_self_test",
      "configurator_status_read",
      "configurator_ai_connection_save",
      "configurator_ai_operation_validate",
      "configurator_ai_operation_default",
    ]);
    expect(manifest.privacyDisclosure).toContain("application creation");
    expect(manifest.privacyDisclosure).toContain("installer_rendering_self_test");
    expect(manifest.privacyDisclosure).toContain("configurator AI mutations");
    expect(manifest.privacyDisclosure).toMatch(/No tool exposes generic database, filesystem, process, network/i);
    const text = readFileSync(path.join(workspace, "integrations", "vscode-mcp.json"), "utf8");
    expect(text).not.toContain(workspace);
    expect(text).not.toContain(project);
    expect(text).not.toContain(executable);
    expect(text).not.toMatch(/password|secret/i);
  });

  it("validates the shared MCP connection before writing the exact optional VS Code stdio entry", async () => {
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
      servers: { aaaat: expectedServerEntry(executable, workspace) },
    });
  });

  it("accepts an existing compatible entry and refuses a conflicting one", async () => {
    const { workspace, project, executable } = fixture();
    proposeVscodeMcpSetup(workspace, project);
    const vscode = path.join(project, ".vscode");
    mkdirSync(vscode);
    const configPath = path.join(vscode, "mcp.json");
    const compatible = { servers: { aaaat: expectedServerEntry(executable, workspace) } };
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

  it("keeps host setup explicit and bounded", () => {
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
