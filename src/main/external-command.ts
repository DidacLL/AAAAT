import type { Readable, Writable } from "node:stream";

import { candidatureInputSchema } from "../shared/contracts";
import { createCandidature } from "./candidature-service";

const externalCommandFlag = "--external-command";
const workspaceFlag = "--workspace";
const candidatureCreateCapability = "candidature.create";

export const externalCommandMaxInputBytes = 512 * 1024;

type ExternalCommandFailureCode =
  | "invalid-invocation"
  | "unsupported-capability"
  | "input-too-large"
  | "invalid-json"
  | "invalid-input"
  | "command-failed";

interface ExternalCommandSuccess {
  readonly ok: true;
  readonly capability: typeof candidatureCreateCapability;
  readonly created: true;
}

interface ExternalCommandFailure {
  readonly ok: false;
  readonly error: ExternalCommandFailureCode;
}

type ExternalCommandResponse = ExternalCommandSuccess | ExternalCommandFailure;

export interface ExternalCommandResult {
  readonly exitCode: 0 | 2;
  readonly response: ExternalCommandResponse;
}

class InputTooLargeError extends Error {}

function failure(error: ExternalCommandFailureCode): ExternalCommandResult {
  return { exitCode: 2, response: { ok: false, error } };
}

function exactlyOne(values: readonly string[], value: string): boolean {
  return values.filter((candidate) => candidate === value).length === 1;
}

function invocationFailure(argv: readonly string[]): ExternalCommandResult | null {
  if (
    !exactlyOne(argv, externalCommandFlag) ||
    !exactlyOne(argv, workspaceFlag)
  ) {
    return failure("invalid-invocation");
  }

  const commandIndex = argv.indexOf(externalCommandFlag);
  const workspaceIndex = argv.indexOf(workspaceFlag);
  const capability = argv[commandIndex + 1];
  const workspacePath = argv[workspaceIndex + 1];
  if (!capability || !workspacePath || workspacePath.startsWith("--")) {
    return failure("invalid-invocation");
  }
  if (capability !== candidatureCreateCapability) {
    return failure("unsupported-capability");
  }
  return null;
}

function workspacePathFrom(argv: readonly string[]): string {
  const workspacePath = argv[argv.indexOf(workspaceFlag) + 1];
  if (!workspacePath) {
    throw new Error("External command invocation was not validated.");
  }
  return workspacePath;
}

export function isExternalCommandInvocation(argv: readonly string[]): boolean {
  return argv.includes(externalCommandFlag);
}

export function executeExternalCommand(
  argv: readonly string[],
  rawInput: string,
): ExternalCommandResult {
  const invalidInvocation = invocationFailure(argv);
  if (invalidInvocation) {
    return invalidInvocation;
  }
  if (Buffer.byteLength(rawInput, "utf8") > externalCommandMaxInputBytes) {
    return failure("input-too-large");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawInput) as unknown;
  } catch {
    return failure("invalid-json");
  }

  const candidature = candidatureInputSchema.safeParse(decoded);
  if (!candidature.success) {
    return failure("invalid-input");
  }

  try {
    createCandidature(workspacePathFrom(argv), candidature.data);
  } catch {
    return failure("command-failed");
  }

  return {
    exitCode: 0,
    response: {
      ok: true,
      capability: candidatureCreateCapability,
      created: true,
    },
  };
}

async function readBoundedInput(input: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of input) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    totalBytes += buffer.length;
    if (totalBytes > externalCommandMaxInputBytes) {
      throw new InputTooLargeError();
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function writeResponse(
  output: Writable,
  result: ExternalCommandResult,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    output.write(JSON.stringify(result.response) + "\n", (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function runExternalCommandProcess(
  argv: readonly string[],
  input: Readable,
  output: Writable,
): Promise<0 | 2> {
  const invalidInvocation = invocationFailure(argv);
  if (invalidInvocation) {
    await writeResponse(output, invalidInvocation);
    return invalidInvocation.exitCode;
  }

  let rawInput: string;
  try {
    rawInput = await readBoundedInput(input);
  } catch (error) {
    const result = failure(error instanceof InputTooLargeError ? "input-too-large" : "command-failed");
    await writeResponse(output, result);
    return result.exitCode;
  }

  const result = executeExternalCommand(argv, rawInput);
  await writeResponse(output, result);
  return result.exitCode;
}
