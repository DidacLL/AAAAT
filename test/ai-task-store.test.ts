import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelAiTask,
  clearAllAiTasks,
  getAiTask,
  startAiTask,
} from "../src/renderer/ai-task-store";
import {
  clearAiReachabilityEvidence,
  getAiReachabilityEvidence,
  recordAiReachabilityEvidence,
} from "../src/renderer/ai-reachability-store";
import { AI_EXCHANGE_DIAGNOSTIC_MARKER } from "../src/shared/ai-diagnostics";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function diagnosticError(failureKind = "operation_incompatible"): Error {
  const exchange = {
    id: "00000000-0000-4000-8000-000000000d11",
    operation: "opportunity_review",
    endpoint: "http://localhost:8080/v1",
    model: "small-local-model",
    systemInstruction: "Return the requested JSON object.",
    userPayload: "{\"role\":\"Validation Engineer\"}",
    rawModelResponse: "I cannot return that schema.",
    validationError: "Expected object, received string.",
    failureKind,
    structuredOutputMode: "json_schema",
  };
  return new Error(
    `Error invoking remote method 'aaaat:test': AiProviderError: The endpoint is reachable, but this operation is incompatible.\n${AI_EXCHANGE_DIAGNOSTIC_MARKER}${btoa(JSON.stringify(exchange))}`,
  );
}

const successfulExchange = {
  operation: "job_extraction" as const,
  endpoint: "http://localhost:8080/v1",
  model: "small-local-model",
  systemInstruction: "Return candidature fields.",
  userPayload: "Offer text",
  rawModelResponse: "{}",
  structuredOutputMode: "json_schema" as const,
  providerValidationError: "",
};

function installConnectionLookup(): void {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      aiConnections: {
        list: vi.fn(async () => [
          {
            id: "00000000-0000-4000-8000-000000000d12",
            name: "Local model",
            endpoint: successfulExchange.endpoint,
            model: successfulExchange.model,
            isDefault: true,
            validatedOperations: ["job_extraction"],
            defaultForOperations: ["job_extraction"],
          },
        ]),
      },
    },
  });
}

describe("renderer AI task state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllAiTasks();
    clearAiReachabilityEvidence();
  });

  afterEach(() => {
    clearAllAiTasks();
    clearAiReachabilityEvidence();
    vi.useRealTimers();
  });

  it("acknowledges immediately, remains working independently of a component, and completes", async () => {
    const pending = deferred<string>();
    startAiTask("slow-local", async (updateDetail) => {
      updateDetail("Generating with local model…");
      return pending.promise;
    });

    expect(getAiTask<string>("slow-local")).toMatchObject({ status: "queued" });

    await vi.runOnlyPendingTimersAsync();
    expect(getAiTask<string>("slow-local")).toMatchObject({
      status: "working",
      detail: "Generating with local model…",
    });

    pending.resolve("done");
    await flush();
    expect(getAiTask<string>("slow-local")).toMatchObject({
      status: "completed",
      result: "done",
    });
  });

  it("cancels a working task, aborts its runner signal, and ignores a late result", async () => {
    const pending = deferred<string>();
    const runnerSignals: AbortSignal[] = [];
    startAiTask("slow-local", async (_updateDetail, runnerSignal) => {
      runnerSignals.push(runnerSignal);
      return pending.promise;
    });

    await vi.runOnlyPendingTimersAsync();
    expect(getAiTask("slow-local")).toMatchObject({ status: "working" });
    expect(runnerSignals[0]?.aborted).toBe(false);

    cancelAiTask("slow-local");
    expect(runnerSignals[0]?.aborted).toBe(true);
    expect(getAiTask("slow-local")).toMatchObject({ status: "cancelled", detail: "Cancelled" });

    pending.resolve("too late");
    await flush();
    expect(getAiTask("slow-local")).toMatchObject({ status: "cancelled" });
    expect(getAiTask("slow-local")?.result).toBeUndefined();
  });

  it("keeps AI-created fields applied and inside completed task scope", async () => {
    startAiTask(
      "bulk",
      async () => ({
        proposals: [
          { fieldId: "missing", value: "filled" },
          { fieldId: "new-field", value: "found" },
        ],
        appliedFieldIds: ["new-field"],
      }),
      "Fill missing information",
      undefined,
      ["missing"],
    );

    await vi.runOnlyPendingTimersAsync();
    await flush();

    expect(getAiTask("bulk")).toMatchObject({
      status: "completed",
      handledFieldIds: ["new-field"],
      appliedFieldIds: ["new-field"],
    });
    expect(getAiTask("bulk")?.scopeFieldIds).toEqual(["missing", "new-field"]);
  });

  it("keeps an actionable failure available for retry", async () => {
    startAiTask("failed-local", async () => {
      throw new Error("Local provider stopped responding.");
    });
    await vi.runOnlyPendingTimersAsync();
    await flush();

    expect(getAiTask("failed-local")).toMatchObject({
      status: "failed",
      error: "Local provider stopped responding.",
    });

    startAiTask("failed-local", async () => "recovered");
    expect(getAiTask("failed-local")).toMatchObject({ status: "queued" });
    await vi.runOnlyPendingTimersAsync();
    await flush();
    expect(getAiTask("failed-local")).toMatchObject({
      status: "completed",
      result: "recovered",
    });
  });

  it("separates the readable failure from the exact AI exchange diagnostic", async () => {
    startAiTask("diagnostic", async () => {
      throw diagnosticError();
    });
    await vi.runOnlyPendingTimersAsync();
    await flush();

    expect(getAiTask("diagnostic")).toMatchObject({
      status: "failed",
      error: "The endpoint is reachable, but this operation is incompatible.",
      exchange: {
        operation: "opportunity_review",
        endpoint: "http://localhost:8080/v1",
        model: "small-local-model",
        rawModelResponse: "I cannot return that schema.",
        validationError: "Expected object, received string.",
        failureKind: "operation_incompatible",
      },
    });
  });

  it("uses a successful real AI exchange as current reachability evidence for its connection", async () => {
    installConnectionLookup();
    startAiTask("successful-request", async () => ({
      proposals: [],
      exchange: successfulExchange,
    }));

    await vi.runOnlyPendingTimersAsync();
    await flush();
    await flush();

    expect(getAiTask("successful-request")).toMatchObject({ status: "completed" });
    expect(getAiReachabilityEvidence().has("Local model")).toBe(true);
  });

  it("invalidates current reachability evidence on a later provider-level request failure only", async () => {
    installConnectionLookup();
    recordAiReachabilityEvidence("Local model", true);

    startAiTask("provider-failure", async () => {
      throw diagnosticError("connection_unreachable");
    });
    await vi.runOnlyPendingTimersAsync();
    await flush();
    await flush();
    expect(getAiReachabilityEvidence().has("Local model")).toBe(false);

    recordAiReachabilityEvidence("Local model", true);
    startAiTask("application-failure", async () => {
      throw new Error("AAAAT could not retain the generated value.");
    });
    await vi.runOnlyPendingTimersAsync();
    await flush();
    expect(getAiReachabilityEvidence().has("Local model")).toBe(true);
  });
});
