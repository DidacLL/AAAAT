// @vitest-environment node

import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPdfLatex } from "../src/main/latex-runner";

const roots: string[] = [];
const originalPath = process.env.PATH;

function fakePdfLatex(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-latex-runner-"));
  roots.push(root);
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");\nconst path = require("node:path");\nconst mode = process.env.AAAAT_FAKE_LATEX_MODE || "success";\nconst finish = () => {\n  fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });\n  fs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), "pdf");\n  if (process.env.AAAAT_FAKE_LATEX_SENTINEL) fs.writeFileSync(process.env.AAAAT_FAKE_LATEX_SENTINEL, "done");\n};\nif (process.env.AAAAT_FAKE_LATEX_ARGS) fs.writeFileSync(process.env.AAAAT_FAKE_LATEX_ARGS, JSON.stringify(process.argv.slice(2)));\nif (mode === "fail") process.exit(2);\nif (mode === "slow") setTimeout(() => { finish(); process.exit(0); }, 120);\nelse if (mode === "timeout") setTimeout(() => { finish(); process.exit(0); }, 500);\nelse { finish(); process.exit(0); }\n`,
    "utf8",
  );
  const posix = path.join(root, "pdflatex");
  writeFileSync(posix, `#!/usr/bin/env node\nrequire(${JSON.stringify(script)});\n`, "utf8");
  chmodSync(posix, 0o755);
  writeFileSync(path.join(root, "pdflatex.cmd"), `@node "${script}" %*\r\n`, "utf8");
  process.env.PATH = `${root}${path.delimiter}${originalPath ?? ""}`;
  return root;
}

afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.AAAAT_FAKE_LATEX_MODE;
  delete process.env.AAAAT_FAKE_LATEX_SENTINEL;
  delete process.env.AAAAT_FAKE_LATEX_ARGS;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("latex runner", () => {
  it("invokes pdflatex with the bounded noninteractive production arguments", async () => {
    const project = fakePdfLatex();
    const capturedArgs = path.join(project, "args.json");
    process.env.AAAAT_FAKE_LATEX_ARGS = capturedArgs;

    await expect(runPdfLatex(project, 1_000)).resolves.toBeUndefined();

    expect(JSON.parse(readFileSync(capturedArgs, "utf8"))).toEqual([
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory=build",
      "main.tex",
    ]);
    expect(existsSync(path.join(project, "build", "main.pdf"))).toBe(true);
  });

  it("keeps the event loop responsive", async () => {
    const project = fakePdfLatex();
    process.env.AAAAT_FAKE_LATEX_MODE = "slow";

    let timerRan = false;
    const render = runPdfLatex(project, 1_000);
    setTimeout(() => {
      timerRan = true;
    }, 10);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(timerRan).toBe(true);
    await expect(render).resolves.toBeUndefined();
  });

  it("terminates a timed-out child before it can continue work", async () => {
    const project = fakePdfLatex();
    const sentinel = path.join(project, "late-work.txt");
    process.env.AAAAT_FAKE_LATEX_MODE = "timeout";
    process.env.AAAAT_FAKE_LATEX_SENTINEL = sentinel;

    await expect(runPdfLatex(project, 40)).rejects.toThrow("timed out");
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(existsSync(sentinel)).toBe(false);
  });

  it("reports the non-zero pdflatex exit code", async () => {
    const project = fakePdfLatex();
    process.env.AAAAT_FAKE_LATEX_MODE = "fail";
    await expect(runPdfLatex(project, 1_000)).rejects.toThrow(
      "exit code 2",
    );
  });

  const missingCommandIt = process.platform === "win32" ? it.skip : it;
  missingCommandIt("keeps a missing pdflatex error actionable", async () => {
    const project = mkdtempSync(path.join(tmpdir(), "aaaat-missing-latex-"));
    roots.push(project);
    process.env.PATH = project;

    await expect(runPdfLatex(project, 1_000)).rejects.toThrow(
      "Install pdflatex or a compatible TeX distribution",
    );
  });
});
