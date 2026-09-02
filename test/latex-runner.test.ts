// @vitest-environment node

import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runLatexmk } from "../src/main/latex-runner";

const roots: string[] = [];
const originalPath = process.env.PATH;

function fakeLatexmk(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-latex-runner-"));
  roots.push(root);
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");\nconst path = require("node:path");\nconst mode = process.env.AAAAT_FAKE_LATEX_MODE || "success";\nconst finish = () => {\n  fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });\n  fs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), "pdf");\n  if (process.env.AAAAT_FAKE_LATEX_SENTINEL) fs.writeFileSync(process.env.AAAAT_FAKE_LATEX_SENTINEL, "done");\n};\nif (mode === "fail") process.exit(2);\nif (mode === "slow") setTimeout(() => { finish(); process.exit(0); }, 120);\nelse if (mode === "timeout") setTimeout(() => { finish(); process.exit(0); }, 500);\nelse { finish(); process.exit(0); }\n`,
    "utf8",
  );
  const posix = path.join(root, "latexmk");
  writeFileSync(posix, `#!/usr/bin/env node\nrequire(${JSON.stringify(script)});\n`, "utf8");
  chmodSync(posix, 0o755);
  writeFileSync(path.join(root, "latexmk.cmd"), `@node "${script}" %*\r\n`, "utf8");
  process.env.PATH = `${root}${path.delimiter}${originalPath ?? ""}`;
  return root;
}

afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.AAAAT_FAKE_LATEX_MODE;
  delete process.env.AAAAT_FAKE_LATEX_SENTINEL;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("latex runner", () => {
  it("keeps the event loop responsive and rejects a duplicate render", async () => {
    const project = fakeLatexmk();
    process.env.AAAAT_FAKE_LATEX_MODE = "slow";

    let timerRan = false;
    const first = runLatexmk(project, "pdflatex", 1_000);
    setTimeout(() => {
      timerRan = true;
    }, 10);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(timerRan).toBe(true);
    await expect(runLatexmk(project, "pdflatex", 1_000)).rejects.toThrow(
      "already rendering",
    );
    await expect(first).resolves.toBeUndefined();
  });

  it("terminates a timed-out child before it can continue work", async () => {
    const project = fakeLatexmk();
    const sentinel = path.join(project, "late-work.txt");
    process.env.AAAAT_FAKE_LATEX_MODE = "timeout";
    process.env.AAAAT_FAKE_LATEX_SENTINEL = sentinel;

    await expect(runLatexmk(project, "pdflatex", 40)).rejects.toThrow("timed out");
    await new Promise((resolve) => setTimeout(resolve, 180));
    expect(existsSync(sentinel)).toBe(false);
  });

  it("reports a non-zero latexmk exit", async () => {
    const project = fakeLatexmk();
    process.env.AAAAT_FAKE_LATEX_MODE = "fail";
    await expect(runLatexmk(project, "pdflatex", 1_000)).rejects.toThrow(
      "TeX rendering failed",
    );
  });
});
