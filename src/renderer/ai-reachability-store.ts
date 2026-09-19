import { useSyncExternalStore } from "react";

const reachableConnections = new Set<string>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();

function emit(): void {
  snapshot = new Set(reachableConnections);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAiReachabilityEvidence(): ReadonlySet<string> {
  return snapshot;
}

export function useAiReachabilityEvidence(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getAiReachabilityEvidence, getAiReachabilityEvidence);
}

export function recordAiReachabilityEvidence(connectionName: string, reachable: boolean): void {
  const name = connectionName.trim();
  if (!name) return;
  const changed = reachable ? !reachableConnections.has(name) : reachableConnections.has(name);
  if (!changed) return;
  if (reachable) reachableConnections.add(name);
  else reachableConnections.delete(name);
  emit();
}

export function clearAiReachabilityEvidence(): void {
  if (reachableConnections.size === 0) return;
  reachableConnections.clear();
  emit();
}
