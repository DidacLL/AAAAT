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
  latexmk: Object.freeze(["-v"]),
  pdflatex: Object.freeze(["--version"]),
});

const probeTimeoutMs = 3_000;
const maxProbeOutput = 4_096;

type TexProbe = (command: SetupTexCommand) => Promise<SetupTexCommandStatus>;

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
    let timer: NodeJS.Timeout | undefined;

    const append = (chunk: Buffer | string) => {
      if (output.length >= maxProbeOutput) return;
      output += String(chunk).slice(0, maxProbeOutput - output.length);
    };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);

    const finish = (available: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(
        setupTexCommandStatusSchema.parse({
          command,
          available,
          version: available ? firstOutputLine(output) : null,
        }),
      );
    };

    timer = setTimeout(() => {
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

export async function getSetupEnvironmentSnapshot(
  rootPath: string,
  probe: TexProbe = probeSetupTexCommand,
): Promise<SetupEnvironmentSnapshot> {
  const ready = workspaceReady(rootPath);
  const [latexmk, pdflatex] = await Promise.all([probe("latexmk"), probe("pdflatex")]);

  return setupEnvironmentSnapshotSchema.parse({
    workspaceReady: ready,
    tex: {
      commands: [latexmk, pdflatex],
      documentRenderingReady: latexmk.available && pdflatex.available,
    },
    ai: aiProjection(rootPath, ready),
  });
}
