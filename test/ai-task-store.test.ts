import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelAiTask,
  clearAllAiTasks,
  getAiTask,
  startAiTask,
} from "../src/renderer/ai-task-store";

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

describe("renderer AI task state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllAiTasks();
  });

  afterEach(() => {
    clearAllAiTasks();
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
    let signal: AbortSignal | null = null;
    startAiTask("slow-local", async (_updateDetail, runnerSignal) => {
      signal = runnerSignal;
      return pending.promise;
    });

    await vi.runOnlyPendingTimersAsync();
    expect(getAiTask("slow-local")).toMatchObject({ status: "working" });

    cancelAiTask("slow-local");
    expect(signal?.aborted).toBe(true);
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
});
