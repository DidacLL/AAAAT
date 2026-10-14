import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { toolLocationsSchema, type ToolLocations } from "../shared/optional-tools-contracts";

let settingsDirectory: string | null = null;
export function initializeInstalledToolPaths(userDataPath: string): void {
  settingsDirectory = path.join(userDataPath, "optional-tools");
}
export function toolSettingsDirectory(): string {
  if (!settingsDirectory) throw new Error("AAAAT tool setup is not initialized.");
  return settingsDirectory;
}
export function toolLocations(): ToolLocations {
  const root = toolSettingsDirectory();
  const filename = path.join(root, "locations.json");
  return existsSync(filename) ? toolLocationsSchema.parse(JSON.parse(readFileSync(filename, "utf8"))) : {
    installDirectory: root, downloadDirectory: path.join(root, "downloads"), pdfLatexExecutable: "",
  };
}
export function saveToolLocations(input: ToolLocations): ToolLocations {
  const settings = toolLocationsSchema.parse(input);
  for (const directory of [settings.installDirectory, settings.downloadDirectory]) {
    if (!path.isAbsolute(directory)) throw new Error("Choose an absolute folder path.");
  }
  mkdirSync(toolSettingsDirectory(), { recursive: true });
  writeFileSync(path.join(toolSettingsDirectory(), "locations.json"), JSON.stringify(settings, null, 2) + "\n");
  return settings;
}
export function installedToolsDirectory(): string {
  return toolLocations().installDirectory;
}
export function toolDownloadsDirectory(): string {
  return toolLocations().downloadDirectory;
}
export function installedPdfLatexExecutable(): string {
  const settings = toolLocations();
  if (settings.pdfLatexExecutable.trim()) return settings.pdfLatexExecutable;
  const executable = process.platform === "win32" ? "pdflatex.exe" : "pdflatex";
  const paths = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  paths.push(path.join(settings.installDirectory, "miktex", "miktex", "bin", "x64"));
  if (process.platform === "win32") {
    if (process.env.LOCALAPPDATA) paths.push(path.join(process.env.LOCALAPPDATA, "Programs", "MiKTeX", "miktex", "bin", "x64"));
    if (process.env.APPDATA) paths.push(path.join(process.env.APPDATA, "MiKTeX", "miktex", "bin", "x64"));
    if (process.env.ProgramFiles) paths.push(path.join(process.env.ProgramFiles, "MiKTeX", "miktex", "bin", "x64"));
  } else {
    paths.push(path.join(os.homedir(), "bin"), "/Library/TeX/texbin", "/usr/local/bin", "/usr/bin", "/Applications/MiKTeX Console.app/Contents/bin");
  }
  return paths.map(directory => path.join(directory, executable)).find(existsSync) ?? "pdflatex";
}
