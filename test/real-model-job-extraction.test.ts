// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { saveNamedAiConnection } from "../src/main/ai-connection-service";
import { listCandidatureFields } from "../src/main/candidature-field-service";
import { extractJobWithPartialOutcomes } from "../src/main/robust-job-extraction";
import { createOrOpenWorkspace } from "../src/main/workspace";

const endpoint = "http://127.0.0.1:11434/v1";
const model = "qwen2.5:0.5b-instruct";
const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-real-model-extraction-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

interface CapturedRequest {
  readonly url: string;
  readonly method: string;
  readonly body: string;
  readonly headers: Headers;
}

function errorDetails(reason: unknown): unknown {
  if (!(reason instanceof Error)) return { value: String(reason) };
  const error = reason as Error & { code?: string; cause?: unknown };
  return {
    name: error.name,
    message: error.message,
    ...(error.code ? { code: error.code } : {}),
    ...(error.cause !== undefined ? { cause: errorDetails(error.cause) } : {}),
  };
}

async function nodeHttpControl(request: CapturedRequest): Promise<{
  readonly statusCode: number;
  readonly raw: string;
  readonly elapsedMs: number;
}> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());
  headers["content-length"] = String(Buffer.byteLength(request.body));

  return new Promise((resolve, reject) => {
    const outgoing = httpRequest(
      url,
      { method: request.method, headers },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            raw: Buffer.concat(chunks).toString("utf8"),
            elapsedMs: Date.now() - startedAt,
          });
        });
      },
    );
    outgoing.on("error", reject);
    outgoing.end(request.body);
  });
}

const realModelDescribe = process.env.AAAAT_REAL_MODEL === "1" ? describe : describe.skip;

realModelDescribe("real constrained-model job extraction", () => {
  it("isolates the ordinary four-field request transport boundary", async () => {
    const root = workspace();
    const connections = saveNamedAiConnection(root, {
      name: "Real-model evidence",
      endpoint,
      model,
    });
    const configured = connections.find((connection) => connection.isDefault);
    expect(configured).toMatchObject({ endpoint, model });

    const sourceText = [
      "Northstar Robotics is hiring a Platform Engineer in Barcelona.",
      "The compensation is EUR 52000 per year.",
      "This is a permanent position working on robotics infrastructure.",
    ].join(" ");

    const ordinaryLabels = ["Organisation", "Role", "Location", "Compensation"];
    const ordinaryFields = listCandidatureFields(root).filter((field) =>
      ordinaryLabels.includes(field.definition.label),
    );
    expect(ordinaryFields.map((field) => field.definition.label)).toEqual(ordinaryLabels);

    const originalFetch = globalThis.fetch;
    let capturedRequest: CapturedRequest | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";
      capturedRequest = {
        url: String(input),
        method: init?.method ?? "GET",
        body,
        headers: new Headers(init?.headers),
      };
      const startedAt = Date.now();
      try {
        return await originalFetch(input, init);
      } catch (reason) {
        console.log("AAAAT_DIRECT_FETCH_FAILURE");
        console.log(JSON.stringify({ elapsedMs: Date.now() - startedAt, error: errorDetails(reason) }, null, 2));
        throw reason;
      }
    }) as typeof fetch;

    try {
      await extractJobWithPartialOutcomes(
        root,
        {
          sourceTitle: "Platform Engineer at Northstar Robotics",
          sourceUrl: "",
          sourceText,
        },
        undefined,
        ordinaryFields.map((field) => field.definition.id),
      );
      throw new Error("Expected the unchanged production path to reproduce the broad-request transport failure.");
    } catch (reason) {
      if (!capturedRequest) throw reason;
      const control = await nodeHttpControl(capturedRequest);
      console.log("AAAAT_NODE_HTTP_CONTROL");
      console.log(JSON.stringify(control, null, 2));
      throw reason;
    } finally {
      globalThis.fetch = originalFetch;
    }
  }, 1_080_000);
});
