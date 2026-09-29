// @vitest-environment node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { environmentSnapshotMock, runPdfLatexMock } = vi.hoisted(() => ({
  environmentSnapshotMock: vi.fn(),
  runPdfLatexMock: vi.fn(),
}));

vi.mock("../src/main/setup-environment-service", () => ({
  getSetupEnvironmentSnapshot: environmentSnapshotMock,
}));

vi.mock("../src/main/latex-runner", () => ({
  runPdfLatex: runPdfLatexMock,
}));

import { runRenderingSelfTest } from "../src/main/setup-assistant-service";

describe("rendering self-test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a temporary TeX project, delegates to the direct pdflatex runner, verifies the PDF, and removes the project", async () => {
    environmentSnapshotMock.mockResolvedValue({
      tex: { documentRenderingReady: true },
    });

    let projectPath = "";
    runPdfLatexMock.mockImplementation(async (candidatePath: string) => {
      projectPath = candidatePath;
      expect(existsSync(path.join(candidatePath, "main.tex"))).toBe(true);
      mkdirSync(path.join(candidatePath, "build"), { recursive: true });
      writeFileSync(path.join(candidatePath, "build", "main.pdf"), "pdf");
    });

    await expect(runRenderingSelfTest("/workspace")).resolves.toEqual({ passed: true });

    expect(runPdfLatexMock).toHaveBeenCalledTimes(1);
    expect(projectPath).not.toBe("");
    expect(existsSync(projectPath)).toBe(false);
  });

  it("does not claim a self-test passed when pdflatex is unavailable", async () => {
    environmentSnapshotMock.mockResolvedValue({
      tex: { documentRenderingReady: false },
    });

    await expect(runRenderingSelfTest("/workspace")).rejects.toThrow(
      /pdflatex is available/i,
    );
    expect(runPdfLatexMock).not.toHaveBeenCalled();
  });
});
