import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { aiOperations } from "../shared/ai-connection-contracts";
import {
  setupEnvironmentSnapshotSchema,
  setupTexCommandStatusSchema,
  type SetupEnvironmentSnapshot,
  type SetupTexCommand,
  type SetupTexCommandStatus,
} from "../shared/setup-environment-contracts";
import {
  getAiConnectionForOperation,
  listAiConnections,
} from "./ai-connection-service";

const probeArguments: Readonly<Record<SetupTexCommand, readonly string[]>> = Object.freeze({
  pdflatex: Object.freeze(["--version"]),
});

const probeTimeoutMs = 3_000;
const maxProbeOutput = 4_096;

type TexProbe = (command: SetupTexCommand) => Promise<SetupTexCommandStatus>;

let sessionTexStatus: Promise<SetupTexCommandStatus> | null = null;

export function initializeSetupEnvironmentSession(): void {
  sessionTexStatus ??= probeSetupTexCommand("pdflatex");
}

function firstOutputLine(output: string): string | null {
  const line = output
    .split(/\r?\n/u)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.length > 0);
  return line ? line.slice(0, 160) : null;
}

export function probeSetupTexCommand(command: SetupTexCommand): Promise<SetupTexCommandStatus> {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, [...probeArguments[command]], {
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch {
      resolve(setupTexCommandStatusSchema.parse({ command, available: false, version: null }));
      return;
    }

    let settled = false;
    let output = "";

    const append = (chunk: Buffer | string) => {
      if (output.length >= maxProbeOutput) return;
      output += String(chunk).slice(0, maxProbeOutput - output.length);
    };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);

    const finish = (available: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(
        setupTexCommandStatusSchema.parse({
          command,
          available,
          version: available ? firstOutputLine(output) : null,
        }),
      );
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(false);
    }, probeTimeoutMs);

    child.once("error", () => finish(false));
    child.once("close", (code) => finish(code === 0));
  });
}

function workspaceReady(rootPath: string): boolean {
  try {
    return (
      statSync(rootPath).isDirectory() &&
      existsSync(path.join(rootPath, "workspace.sqlite")) &&
      statSync(path.join(rootPath, "workspace.sqlite")).isFile()
    );
  } catch {
    return false;
  }
}

function unavailableAiProjection() {
  return {
    configurationReadable: false,
    connectionCount: 0,
    operations: aiOperations.map((operation) => ({
      operation,
      available: false,
      connectionName: null,
    })),
  };
}

function aiProjection(rootPath: string, ready: boolean) {
  if (!ready) return unavailableAiProjection();
  try {
    const connections = listAiConnections(rootPath);
    return {
      configurationReadable: true,
      connectionCount: connections.length,
      operations: aiOperations.map((operation) => {
        const connection = getAiConnectionForOperation(rootPath, operation);
        return {
          operation,
          available: connection !== null,
          connectionName: connection?.name ?? null,
        };
      }),
    };
  } catch {
    return unavailableAiProjection();
  }
}

async function texStatus(probe: TexProbe, refresh: boolean): Promise<SetupTexCommandStatus> {
  if (probe !== probeSetupTexCommand) return probe("pdflatex");
  if (refresh) sessionTexStatus = probe("pdflatex");
  initializeSetupEnvironmentSession();
  return sessionTexStatus!;
}

async function setupEnvironmentSnapshot(
  rootPath: string,
  probe: TexProbe,
  refreshTex: boolean,
): Promise<SetupEnvironmentSnapshot> {
  const ready = workspaceReady(rootPath);
  const pdflatex = await texStatus(probe, refreshTex);

  return setupEnvironmentSnapshotSchema.parse({
    workspaceReady: ready,
    tex: {
      commands: [pdflatex],
      documentRenderingReady: pdflatex.available,
    },
    ai: aiProjection(rootPath, ready),
  });
}

export async function getSetupEnvironmentSnapshot(
  rootPath: string,
  probe: TexProbe = probeSetupTexCommand,
): Promise<SetupEnvironmentSnapshot> {
  return setupEnvironmentSnapshot(rootPath, probe, false);
}

export async function refreshSetupEnvironmentSnapshot(
  rootPath: string,
  probe: TexProbe = probeSetupTexCommand,
): Promise<SetupEnvironmentSnapshot> {
  return setupEnvironmentSnapshot(rootPath, probe, true);
}
