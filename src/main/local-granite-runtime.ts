import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { localAiStartupInputSchema, type LocalAiStartupInput, type LocalAiStartupSettings } from "../shared/optional-tools-contracts";
import { installedToolsDirectory } from "./installed-tool-paths";

export const localGraniteConnection = Object.freeze({
  name: "Local Granite",
  endpoint: "http://127.0.0.1:47842/v1",
  model: "aaaat-granite-4.1-3b",
});

let server: ChildProcess | null = null;
let starting: Promise<void> | null = null;
let startupError: string | null = null;

export function installedGraniteFiles(): { executable: string; model: string } | null {
  try {
    const root = installedToolsDirectory();
    const saved = JSON.parse(readFileSync(path.join(root, "granite-installed.json"), "utf8")) as { executable?: unknown };
    if (typeof saved.executable !== "string") return null;
    const executable = path.resolve(root, "llama", saved.executable);
    const runtimeRoot = path.resolve(root, "llama") + path.sep;
    const model = path.join(root, "downloads", "granite-4.1-3b-Q4_K_M.gguf");
    return executable.startsWith(runtimeRoot) && existsSync(executable) && existsSync(model) ? { executable, model } : null;
  } catch { return null; }
}

function defaultStartupScript(): string {
  const files = installedGraniteFiles();
  if (!files) return "";
  const quote = (value: string) => process.platform === "win32"
    ? "'" + value.replaceAll("'", "''") + "'"
    : "'" + value.replaceAll("'", "'\\''") + "'";
  return `${process.platform === "win32" ? "&" : "exec"} ${quote(files.executable)} -m ${quote(files.model)} --alias ${localGraniteConnection.model} --host 127.0.0.1 --port 47842 --jinja`;
}

export function localAiStartupSettings(): LocalAiStartupSettings {
  const defaultScript = defaultStartupScript();
  const filename = path.join(installedToolsDirectory(), "local-ai-startup.json");
  let preference: LocalAiStartupInput = { enabled: Boolean(defaultScript), script: defaultScript };
  if (existsSync(filename)) {
    try { preference = localAiStartupInputSchema.parse(JSON.parse(readFileSync(filename, "utf8"))); }
    catch { preference = { enabled: false, script: "" }; startupError = "Could not read the saved startup script. Review it in Settings → AI → Startup."; }
  }
  return { ...preference, defaultScript, shell: process.platform === "win32" ? "PowerShell" : "Shell", error: startupError };
}

export function saveLocalAiStartupSettings(input: LocalAiStartupInput): LocalAiStartupSettings {
  const preference = localAiStartupInputSchema.parse(input);
  if (preference.enabled && !preference.script.trim()) throw new Error("Enter a startup script or turn startup off.");
  const root = installedToolsDirectory();
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, "local-ai-startup.json"), JSON.stringify(preference, null, 2) + "\n");
  startupError = null;
  return localAiStartupSettings();
}

export function startLocalAiWithApp(): void {
  if (server) return;
  const settings = localAiStartupSettings();
  if (!settings.enabled || !settings.script.trim()) return;
  startupError = null;
  const windows = process.platform === "win32";
  const shell = windows ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "/bin/sh";
  const child = spawn(shell, windows ? ["-NoProfile", "-NonInteractive", "-Command", settings.script] : ["-c", settings.script], {
    cwd: installedToolsDirectory(), windowsHide: true, detached: !windows, shell: false, stdio: ["ignore", "pipe", "pipe"],
  });
  server = child;
  let tail = "";
  const append = (chunk: Buffer) => { tail = (tail + chunk.toString()).slice(-4000); };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  child.once("error", reason => {
    if (server === child) server = null;
    startupError = reason.message;
  });
  child.once("exit", code => {
    if (server !== child) return;
    server = null;
    if (code !== 0) startupError = `The startup script stopped (${code ?? "signal"}). ${tail}`;
  });
}

export function stopInstalledGranite(): void {
  const owned = server;
  server = null;
  if (!owned?.pid || owned.exitCode !== null || owned.signalCode !== null) return;
  if (process.platform === "win32") {
    const taskkill = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe");
    const result = spawnSync(taskkill, ["/PID", String(owned.pid), "/T", "/F"], { windowsHide: true, timeout: 3000, stdio: "ignore" });
    if (result.error || result.status !== 0) owned.kill();
  } else {
    try { process.kill(-owned.pid, "SIGTERM"); } catch { owned.kill(); }
  }
}

async function serverReady(): Promise<boolean> {
  try {
    const response = await fetch(`${localGraniteConnection.endpoint}/models`, { signal: AbortSignal.timeout(1000) });
    if (!response.ok) return false;
    const result = await response.json() as { data?: { id?: string }[] };
    return result.data?.some(model => model.id === localGraniteConnection.model) === true;
  } catch { return false; }
}

export async function ensureInstalledGranite(endpoint: string, model: string): Promise<void> {
  if (endpoint !== localGraniteConnection.endpoint || model !== localGraniteConnection.model) return;
  if (await serverReady()) return;
  if (starting) return starting;
  const settings = localAiStartupSettings();
  if (!settings.enabled || !settings.script.trim()) throw new Error("Local AI startup is off. Start your server or enable Settings → AI → Startup.");
  startLocalAiWithApp();
  starting = (async () => {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if (startupError) throw new Error(startupError);
      if (await serverReady()) return;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error("Local Granite did not finish loading. Review Startup in Settings → AI and check available memory.");
  })();
  try { await starting; } finally { starting = null; }
}
