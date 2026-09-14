import { useSyncExternalStore } from "react";

export type AiTaskStatus = "queued" | "working" | "completed" | "failed" | "cancelled";

export interface AiTaskSnapshot<T = unknown> {
  readonly key: string;
  readonly label: string;
  readonly status: AiTaskStatus;
  readonly detail: string | null;
  readonly result?: T;
  readonly error?: string;
  readonly handledFieldIds?: readonly string[];
  readonly appliedFieldIds?: readonly string[];
  readonly scopeFieldIds?: readonly string[];
}

type TaskRunner<T> = (
  updateDetail: (detail: string) => void,
  signal: AbortSignal,
) => Promise<T>;
type CompletionDetail<T> = (result: T) => string;

const tasks = new Map<string, AiTaskSnapshot>();
const controllers = new Map<string, AbortController>();
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
  if (!(reason instanceof Error) || !reason.message.trim()) {
    return "AAAAT could not complete this AI task.";
  }
  return reason.message
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^AiProviderError:\s*/i, "")
    .trim();
}

function proposalFieldIds(result: unknown, scopeFieldIds?: readonly string[]): string[] {
  if (!result || typeof result !== "object" || !("proposals" in result)) return [];
  const proposals = (result as { proposals?: unknown }).proposals;
  if (!Array.isArray(proposals)) return [];
  const scope = scopeFieldIds ? new Set(scopeFieldIds) : null;
  return proposals.flatMap((proposal) => {
    if (!proposal || typeof proposal !== "object" || !("fieldId" in proposal)) return [];
    const fieldId = (proposal as { fieldId?: unknown }).fieldId;
    return typeof fieldId === "string" && (!scope || scope.has(fieldId)) ? [fieldId] : [];
  });
}

function preAppliedFieldIds(result: unknown): string[] {
  if (!result || typeof result !== "object" || !("appliedFieldIds" in result)) return [];
  const values = (result as { appliedFieldIds?: unknown }).appliedFieldIds;
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string");
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
  completionDetail?: CompletionDetail<T>,
  scopeFieldIds?: readonly string[],
): void {
  const current = tasks.get(key);
  if (current?.status === "queued" || current?.status === "working") return;

  const controller = new AbortController();
  controllers.set(key, controller);
  tasks.set(key, {
    key,
    label,
    status: "queued",
    detail: "Queued",
    scopeFieldIds: scopeFieldIds ? [...scopeFieldIds] : undefined,
  });
  emit();

  setTimeout(() => {
    const queued = tasks.get(key);
    if (queued?.status !== "queued" || controller.signal.aborted) return;

    tasks.set(key, { ...queued, status: "working", detail: "Working…" });
    emit();

    const updateDetail = (detail: string) => {
      const active = tasks.get(key);
      if (active?.status !== "working" || controller.signal.aborted) return;
      tasks.set(key, { ...active, detail });
      emit();
    };

    void runner(updateDetail, controller.signal)
      .then((result) => {
        const active = tasks.get(key);
        if (!active || active.status !== "working" || controller.signal.aborted) return;
        const appliedFieldIds = preAppliedFieldIds(result);
        tasks.set(key, {
          key,
          label: active.label ?? label,
          status: "completed",
          detail: completionDetail?.(result) ?? "Completed",
          result,
          handledFieldIds: appliedFieldIds,
          appliedFieldIds,
          scopeFieldIds: active.scopeFieldIds ?? (scopeFieldIds ? [...scopeFieldIds] : undefined),
        });
        controllers.delete(key);
        emit();
      })
      .catch((reason: unknown) => {
        const active = tasks.get(key);
        if (!active || active.status !== "working" || controller.signal.aborted) return;
        tasks.set(key, {
          key,
          label: active.label ?? label,
          status: "failed",
          detail: "Failed",
          error: taskError(reason),
          scopeFieldIds: active.scopeFieldIds ?? (scopeFieldIds ? [...scopeFieldIds] : undefined),
        });
        controllers.delete(key);
        emit();
      });
  }, 0);
}

export function cancelAiTask(key: string): void {
  const current = tasks.get(key);
  if (!current || (current.status !== "queued" && current.status !== "working")) return;
  controllers.get(key)?.abort();
  controllers.delete(key);
  tasks.set(key, {
    ...current,
    status: "cancelled",
    detail: "Cancelled",
    error: undefined,
    result: undefined,
  });
  emit();
}

function markFieldHandled(key: string, fieldId: string, applied: boolean): void {
  const current = tasks.get(key);
  if (!current || current.status !== "completed") return;
  const handled = new Set(current.handledFieldIds ?? []);
  const appliedIds = new Set(current.appliedFieldIds ?? []);
  handled.add(fieldId);
  if (applied) appliedIds.add(fieldId);
  const proposalIds = proposalFieldIds(current.result, current.scopeFieldIds);
  const reviewed = proposalIds.length > 0 && proposalIds.every((id) => handled.has(id));
  tasks.set(key, {
    ...current,
    handledFieldIds: Array.from(handled),
    appliedFieldIds: Array.from(appliedIds),
    detail: reviewed ? "Completed · information applied/reviewed" : current.detail,
  });
  emit();
}

export function markAiTaskFieldHandled(key: string, fieldId: string): void {
  markFieldHandled(key, fieldId, false);
}

export function markAiTaskFieldApplied(key: string, fieldId: string): void {
  markFieldHandled(key, fieldId, true);
}

export function clearAiTask(key: string): void {
  controllers.get(key)?.abort();
  controllers.delete(key);
  if (!tasks.delete(key)) return;
  emit();
}

export function clearAllAiTasks(): void {
  if (tasks.size === 0) return;
  for (const controller of controllers.values()) controller.abort();
  controllers.clear();
  tasks.clear();
  emit();
}
