import { useSyncExternalStore } from "react";

export type AiTaskStatus = "queued" | "working" | "completed" | "failed";

export interface AiTaskSnapshot<T = unknown> {
  readonly key: string;
  readonly label: string;
  readonly status: AiTaskStatus;
  readonly detail: string | null;
  readonly result?: T;
  readonly error?: string;
}

type TaskRunner<T> = (updateDetail: (detail: string) => void) => Promise<T>;

const tasks = new Map<string, AiTaskSnapshot>();
const listeners = new Set<() => void>();
let taskListSnapshot: readonly AiTaskSnapshot[] = [];

function emit(): void {
  taskListSnapshot = Array.from(tasks.values());
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function taskError(reason: unknown): string {
  return reason instanceof Error && reason.message.trim()
    ? reason.message
    : "AAAAT could not complete this AI task.";
}

export function getAiTask<T>(key: string): AiTaskSnapshot<T> | null {
  return (tasks.get(key) as AiTaskSnapshot<T> | undefined) ?? null;
}

export function useAiTask<T>(key: string): AiTaskSnapshot<T> | null {
  return useSyncExternalStore(
    subscribe,
    () => getAiTask<T>(key),
    () => getAiTask<T>(key),
  );
}

export function useAiTasks(): readonly AiTaskSnapshot[] {
  return useSyncExternalStore(
    subscribe,
    () => taskListSnapshot,
    () => taskListSnapshot,
  );
}

export function startAiTask<T>(
  key: string,
  runner: TaskRunner<T>,
  label = "AI task",
): void {
  const current = tasks.get(key);
  if (current?.status === "queued" || current?.status === "working") return;

  tasks.set(key, { key, label, status: "queued", detail: "Queued" });
  emit();

  setTimeout(() => {
    const queued = tasks.get(key);
    if (queued?.status !== "queued") return;

    tasks.set(key, { ...queued, status: "working", detail: "Working…" });
    emit();

    const updateDetail = (detail: string) => {
      const active = tasks.get(key);
      if (active?.status !== "working") return;
      tasks.set(key, { ...active, detail });
      emit();
    };

    void runner(updateDetail)
      .then((result) => {
        const active = tasks.get(key);
        tasks.set(key, {
          key,
          label: active?.label ?? label,
          status: "completed",
          detail: "Completed",
          result,
        });
        emit();
      })
      .catch((reason: unknown) => {
        const active = tasks.get(key);
        tasks.set(key, {
          key,
          label: active?.label ?? label,
          status: "failed",
          detail: "Failed",
          error: taskError(reason),
        });
        emit();
      });
  }, 0);
}

export function clearAiTask(key: string): void {
  if (!tasks.delete(key)) return;
  emit();
}

export function clearAllAiTasks(): void {
  if (tasks.size === 0) return;
  tasks.clear();
  emit();
}
