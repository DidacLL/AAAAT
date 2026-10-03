import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const maxCapturedStreamLength = 16_384;
const maxCapturedLogLength = 24_576;
const maxUserDiagnosticLength = 900;

export interface LatexRunnerDiagnostics {
  readonly stdout: string;
  readonly stderr: string;
  readonly log: string;
}

export class LatexRunnerError extends Error {
  readonly diagnostics: LatexRunnerDiagnostics;
  readonly exitCode: number | null;

  constructor(
    message: string,
    diagnostics: LatexRunnerDiagnostics = { stdout: "", stderr: "", log: "" },
    exitCode: number | null = null,
  ) {
    super(message);
    this.name = "LatexRunnerError";
    this.diagnostics = diagnostics;
    this.exitCode = exitCode;
  }
}

function retainTail(current: string, chunk: Buffer | string, limit: number): string {
  const combined = current + String(chunk);
  return combined.length <= limit ? combined : combined.slice(combined.length - limit);
}

function readBuildLog(projectPath: string, outputBaseName: string): string {
  const logPath = path.join(projectPath, "build", `${outputBaseName}.log`);
  if (!existsSync(logPath)) return "";
  try {
    const log = readFileSync(logPath, "utf8");
    return log.length <= maxCapturedLogLength
      ? log
      : log.slice(log.length - maxCapturedLogLength);
  } catch {
    return "";
  }
}

function conciseLatexReason(diagnostics: LatexRunnerDiagnostics): string | null {
  const lines = [diagnostics.stdout, diagnostics.stderr, diagnostics.log]
    .join("\n")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  const bangIndex = lines.findLastIndex((line) => line.startsWith("!"));
  if (bangIndex >= 0) {
    const selected = [lines[bangIndex]];
    for (let index = bangIndex + 1; index < lines.length && selected.length < 3; index += 1) {
      const line = lines[index];
      if (/^(?:l\.\d+|Type\s+H\s+<return>|See\s+the\s+LaTeX)/iu.test(line)) selected.push(line);
      else if (line.startsWith("!")) break;
    }
    return selected.join(" ").slice(0, maxUserDiagnosticLength);
  }

  const diagnosticLine = [...lines]
    .reverse()
    .find((line) =>
      /(?:LaTeX|Package\s+.+\s+Error|Emergency stop|Fatal error|Undefined control sequence|not found|No pages of output)/iu.test(line),
    );
  if (diagnosticLine) return diagnosticLine.slice(0, maxUserDiagnosticLength);

  const tail = lines.slice(-4).join(" ");
  return tail ? tail.slice(0, maxUserDiagnosticLength) : null;
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

export async function runPdfLatex(
  projectPath: string,
  timeoutMs = 30_000,
  outputBaseName = "main",
  sourceFileName = "main.tex",
): Promise<void> {
  if (!/^[a-z0-9][a-z0-9._-]{0,95}$/iu.test(outputBaseName)) {
    throw new LatexRunnerError("The generated PDF filename is invalid.");
  }
  if (
    path.basename(sourceFileName) !== sourceFileName
    || !/^[a-z0-9][a-z0-9._-]{0,91}\.tex$/iu.test(sourceFileName)
  ) {
    throw new LatexRunnerError("The generated TeX source filename is invalid.");
  }

  mkdirSync(path.join(projectPath, "build"), { recursive: true });
  const pdfLatexArgs = [
    "-interaction=nonstopmode",
    "-halt-on-error",
    "-file-line-error",
    "-output-directory=build",
    `-jobname=${outputBaseName}`,
    sourceFileName,
  ];

  await new Promise<void>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let child: ChildProcess;
    try {
      // pdflatex is an executable on supported Windows TeX distributions. Invoke it
      // directly so cmd.exe quoting/parsing cannot corrupt -jobname or project args.
      child = spawn("pdflatex", pdfLatexArgs, {
        cwd: projectPath,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        detached: process.platform !== "win32",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      reject(new LatexRunnerError(`TeX rendering could not start: ${reason}`));
      return;
    }

    child.stdout?.on("data", (chunk) => {
      stdout = retainTail(stdout, chunk, maxCapturedStreamLength);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = retainTail(stderr, chunk, maxCapturedStreamLength);
    });

    let settled = false;
    let timingOut = false;
    const diagnostics = (): LatexRunnerDiagnostics => ({
      stdout,
      stderr,
      log: readBuildLog(projectPath, outputBaseName),
    });
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
        .then(() =>
          finish(new LatexRunnerError("TeX rendering timed out.", diagnostics())),
        )
        .catch((error: unknown) =>
          finish(
            error instanceof Error
              ? error
              : new LatexRunnerError(
                  "TeX rendering timed out and could not be terminated.",
                  diagnostics(),
                ),
          ),
        );
    }, timeoutMs);

    child.once("error", (error: NodeJS.ErrnoException) => {
      if (timingOut) return;
      const currentDiagnostics = diagnostics();
      if (error.code === "ENOENT") {
        finish(
          new LatexRunnerError(
            "TeX rendering could not start because pdflatex was not found on this session PATH.",
            currentDiagnostics,
          ),
        );
        return;
      }
      finish(
        new LatexRunnerError(
          `TeX rendering could not start: ${error.message}`,
          currentDiagnostics,
        ),
      );
    });
    child.once("close", (code) => {
      if (timingOut) return;
      if (code === 0) {
        finish();
        return;
      }
      const currentDiagnostics = diagnostics();
      const reason = conciseLatexReason(currentDiagnostics);
      finish(
        new LatexRunnerError(
          reason
            ? `TeX could not compile this document. ${reason}`
            : `TeX could not compile this document (exit code ${code ?? "unknown"}).`,
          currentDiagnostics,
          code,
        ),
      );
    });
  });
}
