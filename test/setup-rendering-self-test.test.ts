// @vitest-environment node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { environmentSnapshotMock, runLatexmkMock } = vi.hoisted(() => ({
  environmentSnapshotMock: vi.fn(),
  runLatexmkMock: vi.fn(),
}));

vi.mock("../src/main/setup-environment-service", () => ({
  getSetupEnvironmentSnapshot: environmentSnapshotMock,
}));

vi.mock("../src/main/latex-runner", () => ({
  runLatexmk: runLatexmkMock,
}));

import { runRenderingSelfTest } from "../src/main/setup-assistant-service";

describe("rendering self-test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a temporary TeX project, renders a PDF, and removes the project", async () => {
    environmentSnapshotMock.mockResolvedValue({
      tex: { documentRenderingReady: true },
    });

    let projectPath = "";
    runLatexmkMock.mockImplementation(async (candidatePath: string) => {
      projectPath = candidatePath;
      expect(existsSync(path.join(candidatePath, "main.tex"))).toBe(true);
      mkdirSync(path.join(candidatePath, "build"), { recursive: true });
      writeFileSync(path.join(candidatePath, "build", "main.pdf"), "pdf");
    });

    await expect(runRenderingSelfTest("/workspace")).resolves.toEqual({ passed: true });

    expect(runLatexmkMock).toHaveBeenCalledTimes(1);
    expect(projectPath).not.toBe("");
    expect(existsSync(projectPath)).toBe(false);
  });

  it("does not claim a self-test passed when rendering tools are unavailable", async () => {
    environmentSnapshotMock.mockResolvedValue({
      tex: { documentRenderingReady: false },
    });

    await expect(runRenderingSelfTest("/workspace")).rejects.toThrow(
      /latexmk and pdflatex are available/i,
    );
    expect(runLatexmkMock).not.toHaveBeenCalled();
  });
});
