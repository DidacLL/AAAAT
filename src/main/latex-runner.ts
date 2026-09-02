import { spawn, type ChildProcess } from "node:child_process";

import type { DocumentEngine } from "../shared/contracts";

export class LatexRunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LatexRunnerError";
  }
}

function waitForExit(child: ChildProcess, timeoutMs = 2_000): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const onExit = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      child.removeListener("exit", onExit);
      reject(new LatexRunnerError("TeX rendering timed out and could not be terminated."));
    }, timeoutMs);
    child.once("exit", onExit);
  });
}

async function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = waitForExit(child);

  if (process.platform === "win32") {
    let treeKillFailed = false;
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
        treeKillFailed = true;
        child.kill();
        done();
      });
      killer.once("close", (code) => {
        if (code !== 0) {
          treeKillFailed = true;
          child.kill();
        }
        done();
      });
    });
    await exited;
    if (treeKillFailed) {
      throw new LatexRunnerError(
        "TeX rendering timed out and the Windows process tree could not be terminated reliably.",
      );
    }
    return;
  }

  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
  await exited;
}

export async function runLatexmk(
  projectPath: string,
  engine: DocumentEngine,
  timeoutMs = 30_000,
): Promise<void> {
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
    let timingOut = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      timingOut = true;
      void terminateProcessTree(child)
        .then(() => finish(new LatexRunnerError("TeX rendering timed out.")))
        .catch((error: unknown) =>
          finish(
            error instanceof Error
              ? error
              : new LatexRunnerError("TeX rendering timed out and could not be terminated."),
          ),
        );
    }, timeoutMs);

    child.once("error", (error) => {
      if (timingOut) return;
      finish(
        new LatexRunnerError(
          `TeX rendering could not start. Install latexmk and ${engine}. ${error.message}`,
        ),
      );
    });
    child.once("exit", (code) => {
      if (timingOut) return;
      if (code === 0) finish();
      else finish(new LatexRunnerError(`TeX rendering failed with exit code ${code ?? "unknown"}.`));
    });
  });
}