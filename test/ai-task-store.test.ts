import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
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
