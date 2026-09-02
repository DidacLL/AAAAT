import { spawn, type ChildProcess } from "node:child_process";

import type { DocumentEngine } from "../shared/contracts";

export class LatexRunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LatexRunnerError";
  }
}

const activeProjects = new Set<string>();

async function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null) return;

  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/t", "/f"],
        { stdio: "ignore", windowsHide: true },
      );
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        resolve();
      };
      killer.once("error", () => {
        child.kill();
        done();
      });
      killer.once("close", done);
    });
    return;
  }

  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
}

export async function runLatexmk(
  projectPath: string,
  engine: DocumentEngine,
  timeoutMs = 30_000,
): Promise<void> {
  if (activeProjects.has(projectPath)) {
    throw new LatexRunnerError("This document is already rendering.");
  }
  activeProjects.add(projectPath);

  try {
    const engineFlag = engine === "pdflatex" ? "-pdf" : `-${engine}`;
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "latexmk",
        [
          engineFlag,
          "-interaction=nonstopmode",
          "-halt-on-error",
          "-outdir=build",
          "main.tex",
        ],
        {
          cwd: projectPath,
          stdio: "ignore",
          windowsHide: true,
          detached: process.platform !== "win32",
        },
      );
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      const timer = setTimeout(() => {
        void terminateProcessTree(child).finally(() => {
          finish(new LatexRunnerError("TeX rendering timed out."));
        });
      }, timeoutMs);

      child.once("error", () => {
        finish(new LatexRunnerError("TeX rendering could not start."));
      });
      child.once("exit", (code) => {
        if (code === 0) finish();
        else finish(new LatexRunnerError("TeX rendering failed."));
      });
    });
  } finally {
    activeProjects.delete(projectPath);
  }
}
