import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { app } from "electron";

import type { OptionalToolsChoice, OptionalToolsStatus } from "../shared/optional-tools-contracts";
import { basicTexMac, graniteModel, llamaCpuArchives, miktexMac, miktexWindows } from "./optional-tool-assets";
import { installedPdfLatexExecutable, installedToolsDirectory } from "./installed-tool-paths";
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

export function prepareInstalledAiConnection(rootPath: string): void {
  if (!installedGraniteFiles()) return;
  const offered = withWorkspaceDatabase(rootPath, database => database.prepare("SELECT value FROM workspace_metadata WHERE key = 'setup.local-ai-offered'").get());
  if (offered) return;
  if (listAiConnections(rootPath).length === 0) saveNamedAiConnection(rootPath, localGraniteConnection);
  withWorkspaceDatabase(rootPath, database => database.prepare("INSERT INTO workspace_metadata(key, value) VALUES ('setup.local-ai-offered', 'true')").run());
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
  const root = installedToolsDirectory();
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
    pdfReady: installedPdfLatexExecutable() !== "pdflatex" && !existsSync(path.join(root, "pdf-install-pending")),
    pdfLabel: process.arch === "arm64" && process.platform !== "win32" ? process.platform === "darwin" ? "BasicTeX" : "TeX Live" : "MiKTeX",
    error,
  };
}

export async function dismissOptionalTools(): Promise<void> {
  const root = installedToolsDirectory();
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
  const file = await downloadTool(path.join(installedToolsDirectory(), "downloads"), source, signal, (received, total) => {
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
  } else {
    await run("tar", ["-xzf", downloaded, "-C", directory]);
  }
  await obtain(graniteModel, "Downloading Granite 4.1 3B · about 2 GB…", signal);
  message = "Checking local AI…";
  const executable = await findExecutable(directory, process.platform === "win32" ? "llama-server.exe" : "llama-server");
  await run(executable, ["--version"], 10_000);
  writeFileSync(path.join(installedToolsDirectory(), "granite-installed.json"), JSON.stringify({ executable: path.relative(directory, executable), runtime: "b11429", modelSha256: graniteModel.hash }) + "\n");
  startLocalAiWithApp();
}

const texLivePackages = "babel babel-english babel-catalan babel-spanish babel-french babel-german babel-italian babel-portuges geometry hyperref xcolor enumitem titlesec parskip microtype lm psnfss ec cm-super";
const miktexPdfPackages = ["babel", "babel-english", "babel-catalan", "babel-german", "babel-spanish", "babel-french", "babel-italian", "babel-portuges", "hyperref", "ec", "cm-super"];

async function installWindowsPdf(signal: AbortSignal): Promise<void> {
  const installer = await obtain(miktexWindows, "Downloading MiKTeX…", signal);
  const root = installedToolsDirectory();
  message = "Installing MiKTeX…";
  await run(installer, ["--private", "--unattended", `--user-install=${path.join(root, "miktex")}`, `--user-config=${path.join(root, "miktex-config")}`, `--user-data=${path.join(root, "miktex-data")}`]);
  const initexmf = path.join(root, "miktex", "miktex", "bin", "x64", "initexmf.exe");
  await run(initexmf, ["--set-config-value", "[MPM]AutoInstall=1"]);
}

async function installMacPdf(signal: AbortSignal): Promise<void> {
  const root = installedToolsDirectory();
  if (process.arch === "arm64") {
    const installer = await obtain(basicTexMac, "Downloading BasicTeX…", signal);
    message = "Installing BasicTeX · approve the macOS request…";
    const script = path.join(root, "install-basictex.applescript");
    await writeFile(script, `on run argv\n do shell script "/usr/sbin/installer -pkg " & quoted form of item 1 of argv & " -target / && /Library/TeX/texbin/tlmgr update --self && /Library/TeX/texbin/tlmgr install ${texLivePackages}" with administrator privileges\nend run\n`);
    await run("osascript", [script, installer]);
  } else {
    const image = await obtain(miktexMac, "Downloading MiKTeX…", signal);
    const mount = path.join(root, "miktex-image");
    await mkdir(mount, { recursive: true });
    message = "Installing MiKTeX…";
    // The user's explicit install selection covers MiKTeX's published copying
    // conditions; its DMG otherwise waits for an interactive stdin answer.
    await run("hdiutil", ["attach", image, "-nobrowse", "-readonly", "-mountpoint", mount], undefined, "yes\n");
    try {
      const destination = path.join(root, "MiKTeX Console.app");
      await run("ditto", [path.join(mount, "MiKTeX Console.app"), destination]);
      const setup = await findExecutable(destination, "miktexsetup");
      await run(setup, ["--shared=no", "finish"]);
      const initexmf = await findExecutable(destination, "initexmf");
      await run(initexmf, ["--set-config-value", "[MPM]AutoInstall=1"]);
      message = "Preparing MiKTeX packages…";
      // The official macOS DMG is MiKTeX 22.1; its packaged CLI is mpm.
      const packageManager = await findExecutable(destination, "mpm");
      await run(packageManager, ["--update-db"]);
      await run(packageManager, ["--update"]);
      for (const packageId of miktexPdfPackages) await run(packageManager, [`--install=${packageId}`]);
      await run(initexmf, ["--dump=pdflatex"]);
    } finally { await run("hdiutil", ["detach", mount]); }
  }
}

function linuxDistribution(): { family: "ubuntu" | "debian"; suite: string } {
  const release = readFileSync("/etc/os-release", "utf8");
  const values = Object.fromEntries(release.split("\n").filter(line => line.includes("=")).map(line => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, "")];
  }));
  const suite = values.UBUNTU_CODENAME ?? values.VERSION_CODENAME ?? "";
  if (["jammy", "noble", "resolute"].includes(suite)) return { family: "ubuntu", suite };
  if (["bullseye", "bookworm", "trixie"].includes(suite)) return { family: "debian", suite };
  throw new Error("Automatic PDF setup supports current Ubuntu, Linux Mint and Debian releases. An existing pdfLaTeX installation can still be used.");
}

async function installLinuxPdf(): Promise<void> {
  const root = installedToolsDirectory();
  const distribution = linuxDistribution();
  const script = path.join(root, "install-pdf.sh");
  let commands: string;
  if (process.arch === "arm64") {
    commands = "apt-get update\nDEBIAN_FRONTEND=noninteractive apt-get install -y texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended texlive-lang-european texlive-lang-spanish texlive-lang-french texlive-lang-german texlive-lang-italian texlive-lang-portuguese\n";
  } else {
    const response = await fetch("https://miktex.org/download/key", { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("Could not download the official MiKTeX repository key.");
    const key = path.join(root, "miktex-key.asc");
    await writeFile(key, await response.text());
    commands = `gpg --batch --yes --dearmor -o /usr/share/keyrings/aaaat-miktex.gpg "$1"\nprintf '%s\\n' 'deb [signed-by=/usr/share/keyrings/aaaat-miktex.gpg] https://miktex.org/download/${distribution.family} ${distribution.suite} universe' > /etc/apt/sources.list.d/aaaat-miktex.list\napt-get update\nDEBIAN_FRONTEND=noninteractive apt-get install -y miktex\n`;
  }
  await writeFile(script, `#!/bin/sh\nset -eu\n${commands}`);
  message = `Installing ${process.arch === "arm64" ? "TeX Live" : "MiKTeX"} · approve the system request…`;
  await run("pkexec", ["/bin/sh", script, path.join(root, "miktex-key.asc")]);
  if (process.arch !== "arm64") {
    await run("miktexsetup", ["--shared=no", "finish"]);
    const sibling = path.join(path.dirname(installedPdfLatexExecutable()), "initexmf");
    const initexmf = existsSync(sibling) ? sibling : "initexmf";
    await run(initexmf, ["--set-config-value", "[MPM]AutoInstall=1"]);
    message = "Preparing MiKTeX packages…";
    await run("miktex", ["packages", "update-package-database"]);
    await run("miktex", ["packages", "update"]);
    await run("miktex", ["packages", "install", ...miktexPdfPackages]);
    await run("miktex", ["formats", "build", "pdflatex"]);
  }
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
    const pendingPdf = path.join(installedToolsDirectory(), "pdf-install-pending");
    if (choice.pdf && (installedPdfLatexExecutable() === "pdflatex" || existsSync(pendingPdf))) {
      await writeFile(pendingPdf, "PDF setup is not finished.\n");
      canCancel = false;
      if (process.platform === "win32") await installWindowsPdf(controller.signal);
      else if (process.platform === "darwin") await installMacPdf(controller.signal);
      else if (process.platform === "linux") await installLinuxPdf();
      else throw new Error("PDF setup is not available for this operating system.");
      await run(installedPdfLatexExecutable(), ["--version"], 10_000);
      await unlink(pendingPdf);
    }
    message = "Selected tools are ready.";
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
