import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { installedToolsDirectory } from "./installed-tool-paths";

export const localGraniteConnection = Object.freeze({
  name: "Local Granite",
  endpoint: "http://127.0.0.1:47842/v1",
  model: "aaaat-granite-4.1-3b",
});

let server: ChildProcess | null = null;
let starting: Promise<void> | null = null;

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

export function stopInstalledGranite(): void {
  const owned = server;
  server = null;
  owned?.kill();
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
  const files = installedGraniteFiles();
  if (!files) throw new Error("Local Granite is not installed. Open Settings → AI → Local AI to set it up.");
  starting = (async () => {
    let tail = "";
    let failure: string | null = null;
    const child = spawn(files.executable, [
      "-m", files.model, "--alias", localGraniteConnection.model,
      "--host", "127.0.0.1", "--port", "47842", "--jinja",
    ], { cwd: path.dirname(files.executable), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    server = child;
    const append = (chunk: Buffer) => { tail = (tail + chunk.toString()).slice(-4000); };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    child.once("error", reason => { failure = reason.message; });
    child.once("exit", code => {
      if (server === child) server = null;
      failure = `The local model server stopped (${code ?? "signal"}). ${tail}`;
    });
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if (failure) throw new Error(failure);
      if (await serverReady()) return;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    if (server === child) stopInstalledGranite();
    throw new Error("Local Granite did not finish loading. Check available memory and retry.");
  })();
  try { await starting; } finally { starting = null; }
}
