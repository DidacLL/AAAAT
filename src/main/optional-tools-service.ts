import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { app, shell } from "electron";

import type { OptionalToolsChoice, OptionalToolsStatus } from "../shared/optional-tools-contracts";
import { basicTexMac, graniteModel, llamaCpuArchives, miktexMac, miktexWindows, visualCppWindows } from "./optional-tool-assets";
import { installedToolsDirectory, toolDownloadsDirectory, toolLocations, toolSettingsDirectory } from "./installed-tool-paths";
import { probeSetupTexCommand } from "./setup-environment-service";
import { installedGraniteFiles, localGraniteConnection, startLocalAiWithApp } from "./local-granite-runtime";
import { listAiConnections, saveNamedAiConnection } from "./ai-connection-service";
import { downloadTool } from "./tool-download";
import { withWorkspaceDatabase } from "./workspace";

let installController: AbortController | null = null;
let canCancel = false;
let message = "";
let downloadedBytes = 0;
let totalBytes = 0;
let error: string | null = null;

export function prepareInstalledAiConnection(rootPath: string, explicitInstall = false): void {
  if (!installedGraniteFiles()) return;
  const offered = withWorkspaceDatabase(rootPath, database => database.prepare("SELECT value FROM workspace_metadata WHERE key = 'setup.local-ai-offered'").get());
  if (offered && !explicitInstall) return;
  const connections = listAiConnections(rootPath);
  const existing = connections.some(connection => connection.endpoint === localGraniteConnection.endpoint && connection.model === localGraniteConnection.model);
  if (!existing && (explicitInstall || connections.length === 0)) {
    let name: string = localGraniteConnection.name;
    for (let suffix = 2; connections.some(connection => connection.name.toLocaleLowerCase() === name.toLocaleLowerCase()); suffix++) name = `${localGraniteConnection.name} ${suffix}`;
    saveNamedAiConnection(rootPath, { ...localGraniteConnection, name });
  }
  withWorkspaceDatabase(rootPath, database => database.prepare("INSERT OR REPLACE INTO workspace_metadata(key, value) VALUES ('setup.local-ai-offered', 'true')").run());
}

function run(command: string, args: string[], timeout?: number, input?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let tail = "";
    const child = spawn(command, args, { windowsHide: true, shell: false, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
    if (input !== undefined) child.stdin?.end(input);
    const timer = timeout === undefined ? undefined : setTimeout(() => {
      child.kill();
      reject(new Error("Tool setup took too long. You can retry from Settings."));
    }, timeout);
    const append = (chunk: Buffer) => { tail = (tail + chunk.toString()).slice(-4000); };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    child.once("error", reason => { clearTimeout(timer); reject(reason); });
    child.once("close", code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(tail.trim() || "Installation was canceled or could not finish. You can retry from Settings."));
    });
  });
}

export async function optionalToolsStatus(): Promise<OptionalToolsStatus> {
  const root = toolSettingsDirectory();
  return {
    packaged: app.isPackaged,
    offered: existsSync(path.join(root, "setup-offered")),
    busy: installController !== null,
    canCancel,
    message,
    downloadedBytes,
    totalBytes,
    localAiReady: installedGraniteFiles() !== null,
    localAiSupported: Boolean(llamaCpuArchives[`${process.platform}-${process.arch}`]),
    pdfReady: (await probeSetupTexCommand("pdflatex")).available,
    pdfLabel: process.platform === "linux" ? "TeX Live" : process.platform === "darwin" && process.arch === "arm64" ? "BasicTeX" : "MiKTeX",
    error,
    locations: toolLocations(),
  };
}

export async function dismissOptionalTools(): Promise<void> {
  const root = toolSettingsDirectory();
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "setup-offered"), "User continued from optional setup.\n");
}

export function cancelOptionalTools(): void {
  if (canCancel) installController?.abort();
}

async function obtain(source: Parameters<typeof downloadTool>[1], label: string, signal: AbortSignal): Promise<string> {
  message = label;
  downloadedBytes = 0;
  totalBytes = 0;
  canCancel = true;
  const file = await downloadTool(toolDownloadsDirectory(), source, signal, (received, total) => {
    downloadedBytes = received;
    totalBytes = total;
  });
  signal.throwIfAborted();
  canCancel = false;
  return file;
}

async function findExecutable(directory: string, filename: string): Promise<string> {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if ((item.isFile() || item.isSymbolicLink()) && item.name === filename && existsSync(path.join(directory, item.name))) return path.join(directory, item.name);
    if (item.isDirectory()) {
      try { return await findExecutable(path.join(directory, item.name), filename); } catch { /* Continue through the fixed archive. */ }
    }
  }
  throw new Error(`The official archive did not contain ${filename}.`);
}

async function installLocalAi(signal: AbortSignal): Promise<void> {
  if (installedGraniteFiles()) return;
  const archive = llamaCpuArchives[`${process.platform}-${process.arch}`];
  if (!archive) throw new Error("Local Granite setup is not available for this device.");
  const downloaded = await obtain(archive, "Downloading llama.cpp…", signal);
  const directory = path.join(installedToolsDirectory(), "llama");
  await mkdir(directory, { recursive: true });
  message = "Installing llama.cpp…";
  if (process.platform === "win32") {
    const script = path.join(installedToolsDirectory(), "extract-llama.ps1");
    await writeFile(script, "param([string]$Archive,[string]$Destination)\n$ErrorActionPreference='Stop'\nExpand-Archive -LiteralPath $Archive -DestinationPath $Destination -Force\n");
    const powershell = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    await run(powershell, ["-NoProfile", "-NonInteractive", "-File", script, "-Archive", downloaded, "-Destination", directory]);
    await installWindowsRuntime(signal, await findExecutable(directory, "llama-server.exe"));
  } else {
    await run("tar", ["-xzf", downloaded, "-C", directory]);
  }
  message = "Checking local AI…";
  const executable = await findExecutable(directory, process.platform === "win32" ? "llama-server.exe" : "llama-server");
  await run(executable, ["--version"], 10_000);
  const model = await obtain(graniteModel, "Downloading Granite 4.1 3B · about 2 GB…", signal);
  await mkdir(toolSettingsDirectory(), { recursive: true });
  writeFileSync(path.join(toolSettingsDirectory(), "granite-installed.json"), JSON.stringify({ executable, model }) + "\n");
  startLocalAiWithApp();
}

async function installWindowsRuntime(signal: AbortSignal, executable: string): Promise<void> {
  const system = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32");
  const probe = spawnSync(executable, ["--version"], { windowsHide: true, encoding: "utf8", timeout: 10_000 });
  if (probe.status === 0) return;
  if (probe.error) throw probe.error;
  // Windows loader errors: missing DLL or an unavailable DLL entry point.
  // A working runtime needs no version-based replacement.
  const status = (probe.status ?? 0) >>> 0;
  if (status !== 0xc0000135 && status !== 0xc0000139) {
    throw new Error(probe.stderr?.trim() || probe.stdout?.trim() || "The downloaded llama.cpp runtime could not start on this device.");
  }
  // Microsoft's x64 package also supplies ARM64 binaries on ARM64 Windows.
  const installer = await obtain(visualCppWindows, "Downloading the Microsoft runtime…", signal);
  message = "Microsoft runtime · follow its Windows setup…";
  const script = path.join(installedToolsDirectory(), "install-microsoft-runtime.ps1");
  await writeFile(script, `param([string]$Installer)\n$ErrorActionPreference='Stop'\n$setup = Start-Process -FilePath $Installer -ArgumentList @('/install','/norestart') -Verb RunAs -WindowStyle Normal -Wait -PassThru\nif ($setup.ExitCode -eq 3010) { throw 'Restart Windows to finish the Microsoft runtime, then retry Local AI setup.' }\nif ($setup.ExitCode -ne 0 -and $setup.ExitCode -ne 1638) { throw 'Microsoft runtime setup was canceled or could not finish.' }\n`);
  await run(path.join(system, "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-File", script, "-Installer", installer]);
}

async function installWindowsPdf(signal: AbortSignal): Promise<void> {
  const installer = await obtain(miktexWindows, "Downloading MiKTeX…", signal);
  message = "Follow the MiKTeX installer…";
  await run(installer, []);
}

async function installMacPdf(signal: AbortSignal): Promise<void> {
  const installer = await obtain(process.arch === "arm64" ? basicTexMac : miktexMac, "Downloading PDF tools…", signal);
  message = "Finish installation in the native installer.";
  const problem = await shell.openPath(installer);
  if (problem) throw new Error(problem);
}

async function installLinuxPdf(): Promise<void> {
  message = "Finish TeX Live installation in your system software manager.";
  try { await shell.openExternal("apt:texlive-latex-recommended"); }
  catch { throw new Error("Open your system software manager and install TeX Live, then return to AAAAT."); }
}

export async function installOptionalTools(choice: OptionalToolsChoice): Promise<OptionalToolsStatus> {
  if (installController) throw new Error("Tool setup is already running.");
  const controller = new AbortController();
  installController = controller;
  error = null;
  try {
    await mkdir(installedToolsDirectory(), { recursive: true });
    if (choice.localAi) await installLocalAi(controller.signal);
    controller.signal.throwIfAborted();
    if (choice.pdf && !(await probeSetupTexCommand("pdflatex")).available) {
      canCancel = false;
      if (process.platform === "win32") await installWindowsPdf(controller.signal);
      else if (process.platform === "darwin") await installMacPdf(controller.signal);
      else if (process.platform === "linux") await installLinuxPdf();
      else throw new Error("PDF setup is not available for this operating system.");
    }
    message = choice.pdf && !(await probeSetupTexCommand("pdflatex")).available
      ? "Finish the native PDF setup, then return to AAAAT." : "Selected tools are ready.";
  } catch (reason) {
    error = controller.signal.aborted ? "Download canceled. Completed tools remain available." : reason instanceof Error ? reason.message : "Tool setup could not finish.";
    message = "";
  } finally {
    installController = null;
    canCancel = false;
    downloadedBytes = 0;
    totalBytes = 0;
  }
  return optionalToolsStatus();
}
