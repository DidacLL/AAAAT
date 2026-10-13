import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

let toolsDirectory: string | null = null;
export function initializeInstalledToolPaths(userDataPath: string): void {
  toolsDirectory = path.join(userDataPath, "optional-tools");
}
export function installedToolsDirectory(): string {
  if (!toolsDirectory) throw new Error("AAAAT tool setup is not initialized.");
  return toolsDirectory;
}
export function installedPdfLatexExecutable(): string {
  const executable = process.platform === "win32" ? "pdflatex.exe" : "pdflatex";
  const paths = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  if (toolsDirectory) paths.push(path.join(toolsDirectory, "miktex", "miktex", "bin", "x64"));
  if (process.platform === "win32") {
    if (process.env.LOCALAPPDATA) paths.push(path.join(process.env.LOCALAPPDATA, "Programs", "MiKTeX", "miktex", "bin", "x64"));
    if (process.env.APPDATA) paths.push(path.join(process.env.APPDATA, "MiKTeX", "miktex", "bin", "x64"));
    if (process.env.ProgramFiles) paths.push(path.join(process.env.ProgramFiles, "MiKTeX", "miktex", "bin", "x64"));
  } else {
    paths.push(path.join(os.homedir(), "bin"), "/Library/TeX/texbin", "/usr/local/bin", "/usr/bin");
  }
  return paths.map(directory => path.join(directory, executable)).find(existsSync) ?? "pdflatex";
}
